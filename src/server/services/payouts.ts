import {
  batchIdFor,
  isValidAccount,
  isValidHolder,
  isValidIfsc,
  maskAccount,
  MAX_BATCH,
  normaliseAccount,
  normaliseHolder,
  normaliseIfsc,
  payableFor,
  summariseBatch,
  transferIdFor,
  type PayoutKind,
} from "@/core/payouts";
import type { PayoutProvider, TransferResult } from "@/server/payouts/provider";
import type { PayoutBatch, PayoutItem, Repos } from "@/server/repos/types";
import { buildPayroll, type PayrollRow } from "./payroll";
import { recordArrears, savePaidRecord } from "./pay-check";

/** What the dashboard may see of a bank account: never the full number. */
export interface MaskedAccount {
  holder: string;
  masked: string;
  ifsc: string;
}

export interface PayableWorker {
  workerId: string;
  name: string;
  code: string;
  kind: PayoutKind;
  /** Paise */
  amount: number;
  account: MaskedAccount | null;
  /** A payout to this worker for this month is still processing */
  busy: boolean;
}

export interface PayoutBatchView {
  id: string;
  provider: PayoutBatch["provider"];
  createdAt: Date;
  items: Omit<PayoutItem, "payslip" | "recordedAt">[];
  summary: ReturnType<typeof summariseBatch>;
}

export interface PayoutOverview {
  payable: PayableWorker[];
  /** Every worker, with their account if one is on file (for the bank details form) */
  accounts: { workerId: string; name: string; code: string; account: MaskedAccount | null }[];
  batches: PayoutBatchView[];
}

const mask = (a: { holder: string; account: string; ifsc: string }): MaskedAccount => ({
  holder: a.holder,
  masked: maskAccount(a.account),
  ifsc: a.ifsc,
});

function batchView(batch: PayoutBatch): PayoutBatchView {
  return {
    id: batch.id,
    provider: batch.provider,
    createdAt: batch.createdAt,
    items: batch.items.map(({ payslip, recordedAt, ...item }) => {
      void payslip;
      void recordedAt;
      return item;
    }),
    summary: summariseBatch(batch.items),
  };
}

const busyWorkers = (batches: PayoutBatch[]) =>
  new Set(batches.flatMap((b) => b.items.filter((i) => i.status === "pending").map((i) => i.workerId)));

/**
 * Who can be paid this month and how much, the bank details on file, and recent batches.
 * Pass the payroll the page already builds so it is computed once.
 */
export async function payoutOverview(
  repos: Repos,
  orgId: string,
  month: string,
  payroll?: PayrollRow[] | Promise<PayrollRow[]>,
): Promise<PayoutOverview> {
  const [rows, accounts, batches] = await Promise.all([
    payroll ?? buildPayroll(repos, orgId, month),
    repos.payoutAccounts.getByOrg(orgId),
    repos.payoutBatches.getByOrgMonth(orgId, month),
  ]);
  const accountOf = new Map(accounts.map((a) => [a.id, mask(a)]));
  const busy = busyWorkers(batches);
  const payable = rows.flatMap((row) => {
    const due = payableFor({ net: row.net, outstanding: row.outstanding, hasRecord: Boolean(row.paid) });
    if (!due) return [];
    return [
      {
        workerId: row.workerId,
        name: row.name,
        code: row.code,
        ...due,
        account: accountOf.get(row.workerId) ?? null,
        busy: busy.has(row.workerId),
      },
    ];
  });
  return {
    payable,
    accounts: rows.map((r) => ({
      workerId: r.workerId,
      name: r.name,
      code: r.code,
      account: accountOf.get(r.workerId) ?? null,
    })),
    batches: batches
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(batchView),
  };
}

export type PayRejection = "not_found" | "nothing_owed" | "no_account" | "in_progress";

export type PayWorkersResult =
  | { ok: true; batch: PayoutBatchView }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "rejected"; rejected: { workerId: string; reason: PayRejection }[] };

/**
 * Pays the chosen workers in one batch. Every amount is this month's payroll as computed here;
 * the browser only says who. The whole batch is refused if any worker can't be paid, so the
 * employer always knows exactly what was sent.
 */
export async function payWorkers(
  repos: Repos,
  provider: PayoutProvider,
  input: { orgId: string; adminId: string; month: string; workerIds: string[]; randomHex: string; now: Date },
): Promise<PayWorkersResult> {
  const ids = [...new Set(input.workerIds)];
  if (ids.length === 0 || ids.length > MAX_BATCH) return { ok: false, error: "invalid" };

  const [rows, accounts, batches] = await Promise.all([
    buildPayroll(repos, input.orgId, input.month),
    repos.payoutAccounts.getByOrg(input.orgId),
    repos.payoutBatches.getByOrgMonth(input.orgId, input.month),
  ]);
  const rowOf = new Map(rows.map((r) => [r.workerId, r]));
  const accountOf = new Map(accounts.map((a) => [a.id, a]));
  const busy = busyWorkers(batches);

  const rejected: { workerId: string; reason: PayRejection }[] = [];
  const chosen: { row: PayrollRow; kind: PayoutKind; amount: number }[] = [];
  for (const workerId of ids) {
    const row = rowOf.get(workerId);
    const due = row && payableFor({ net: row.net, outstanding: row.outstanding, hasRecord: Boolean(row.paid) });
    if (!row) rejected.push({ workerId, reason: "not_found" });
    else if (!due) rejected.push({ workerId, reason: "nothing_owed" });
    else if (!accountOf.has(workerId)) rejected.push({ workerId, reason: "no_account" });
    else if (busy.has(workerId)) rejected.push({ workerId, reason: "in_progress" });
    else chosen.push({ row, ...due });
  }
  if (rejected.length) return { ok: false, error: "rejected", rejected };

  const batchId = batchIdFor(input.month, input.randomHex);
  const batch: PayoutBatch = {
    id: batchId,
    orgId: input.orgId,
    month: input.month,
    provider: provider.name,
    createdAt: input.now,
    createdBy: input.adminId,
    updatedAt: input.now,
    items: chosen.map(({ row, kind, amount }, index) => {
      const account = accountOf.get(row.workerId)!;
      return {
        transferId: transferIdFor(batchId, index),
        workerId: row.workerId,
        name: row.name,
        kind,
        amount,
        accountMasked: maskAccount(account.account),
        ifsc: account.ifsc,
        status: "pending",
        payslip: {
          regularMinutes: row.regularMinutes,
          overtimeMinutes: row.overtimeMinutes,
          gross: row.gross,
          deductions: row.deductions,
        },
      };
    }),
  };
  // Saved before sending: if anything fails mid-way, these workers stay "processing" and can't be paid twice.
  await repos.payoutBatches.create(batch);

  const results = await provider.send(
    batchId,
    batch.items.map((item) => {
      const account = accountOf.get(item.workerId)!;
      return {
        transferId: item.transferId,
        amount: item.amount,
        holder: account.holder,
        account: account.account,
        ifsc: account.ifsc,
        remarks: `FairShift ${item.kind} ${input.month}`,
      };
    }),
  );
  return { ok: true, batch: batchView(await applyResults(repos, batch, results, input.now)) };
}

/** Asks the provider again about a batch's processing transfers. */
export async function refreshPayoutBatch(
  repos: Repos,
  provider: PayoutProvider,
  input: { orgId: string; batchId: string; now: Date },
): Promise<{ ok: true; batch: PayoutBatchView } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!batch.items.some((i) => i.status === "pending")) return { ok: true, batch: batchView(batch) };
  let results: TransferResult[];
  try {
    results = await provider.status(batch.id);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, batch: batchView(await applyResults(repos, batch, results, input.now)) };
}

/**
 * Updates each processing transfer with the provider's answer, and writes every newly paid one
 * to the worker's pay record exactly once. A transfer that is already paid or failed never changes.
 */
async function applyResults(
  repos: Repos,
  batch: PayoutBatch,
  results: TransferResult[],
  now: Date,
): Promise<PayoutBatch> {
  const resultOf = new Map(results.map((r) => [r.transferId, r]));
  const items: PayoutItem[] = [];
  for (const item of batch.items) {
    const result = resultOf.get(item.transferId);
    if (item.status !== "pending" || !result || result.status === "pending") {
      items.push(item);
      continue;
    }
    const updated: PayoutItem = {
      ...item,
      status: result.status,
      ...(result.failure ? { failure: result.failure, detail: result.detail } : {}),
      ...(result.utr ? { utr: result.utr } : {}),
    };
    if (updated.status === "paid" && !updated.recordedAt) {
      await recordPayout(repos, batch, updated, now);
      updated.recordedAt = now;
    }
    items.push(updated);
  }
  const next = { ...batch, items, updatedAt: now };
  await repos.payoutBatches.update(batch.id, { items, updatedAt: now });
  return next;
}

/** A paid salary becomes the month's pay record; a paid gap is added to it as arrears. */
async function recordPayout(repos: Repos, batch: PayoutBatch, item: PayoutItem, now: Date): Promise<void> {
  const base = { adminId: batch.createdBy, workerId: item.workerId, month: batch.month, amount: item.amount, now };
  const existing = await repos.paidRecords.get(item.workerId, batch.month);
  if (item.kind === "gap" && existing) {
    await recordArrears(repos, existing, base);
    return;
  }
  await savePaidRecord(
    repos,
    batch.orgId,
    batch.createdBy,
    {
      workerId: item.workerId,
      month: batch.month,
      paidRegularHours: item.payslip.regularMinutes / 60,
      paidOvertimeHours: item.payslip.overtimeMinutes / 60,
      grossPaid: item.payslip.gross,
      deductions: item.payslip.deductions,
      netPaid: item.amount,
    },
    now,
  );
}

// ── Bank details ──────────────────────────────────────────────────

export type AccountInputError = "holder" | "account" | "ifsc" | "not_found";

/** Saves where a worker's pay goes, after checking the formats and that the worker is the employer's. */
export async function savePayoutAccount(
  repos: Repos,
  input: { orgId: string; adminId: string; workerId: string; holder: string; account: string; ifsc: string; now: Date },
): Promise<{ ok: true; account: MaskedAccount } | { ok: false; error: AccountInputError }> {
  const holder = normaliseHolder(input.holder);
  const account = normaliseAccount(input.account);
  const ifsc = normaliseIfsc(input.ifsc);
  if (!isValidHolder(holder)) return { ok: false, error: "holder" };
  if (!isValidAccount(account)) return { ok: false, error: "account" };
  if (!isValidIfsc(ifsc)) return { ok: false, error: "ifsc" };
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== input.orgId) return { ok: false, error: "not_found" };
  const saved = {
    id: worker.id,
    orgId: worker.orgId,
    holder,
    account,
    ifsc,
    updatedAt: input.now,
    updatedBy: input.adminId,
  };
  await repos.payoutAccounts.upsert(saved);
  return { ok: true, account: mask(saved) };
}
