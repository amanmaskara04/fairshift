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
  type PayoutFailure,
  type PayoutKind,
  type PayoutStatus,
} from "@/core/payouts";
import type { CheckoutProvider } from "@/server/payouts/provider";
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
  /** A checkout including this worker for this month is still waiting to be paid */
  busy: boolean;
}

export interface PayoutBatchView {
  id: string;
  provider: PayoutBatch["provider"];
  createdAt: Date;
  /** Set while the checkout is waiting, so the employer can go back and pay */
  checkoutUrl?: string;
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

const waiting = (batch: PayoutBatch) => batch.items.some((i) => i.status === "pending");

function batchView(batch: PayoutBatch): PayoutBatchView {
  return {
    id: batch.id,
    provider: batch.provider,
    createdAt: batch.createdAt,
    ...(waiting(batch) && batch.checkoutUrl ? { checkoutUrl: batch.checkoutUrl } : {}),
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
 * Who can be paid this month and how much, the bank details on file, and recent checkouts.
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

export type StartCheckoutResult =
  | { ok: true; batchId: string; url: string }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "rejected"; rejected: { workerId: string; reason: PayRejection }[] }
  | { ok: false; error: "checkout_failed"; detail: string };

/**
 * Opens one checkout for the chosen workers: the employer pays the total once and each worker's
 * share goes to their bank account. Every amount is this month's payroll as computed here; the
 * browser only says who. The whole batch is refused if any worker can't be paid.
 */
export async function startCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: {
    orgId: string;
    adminId: string;
    month: string;
    workerIds: string[];
    randomHex: string;
    /** This deployment's public origin, for the return link */
    origin: string;
    now: Date;
  },
): Promise<StartCheckoutResult> {
  const ids = [...new Set(input.workerIds)];
  if (ids.length === 0 || ids.length > MAX_BATCH) return { ok: false, error: "invalid" };

  const [rows, accounts, batches, admin] = await Promise.all([
    buildPayroll(repos, input.orgId, input.month),
    repos.payoutAccounts.getByOrg(input.orgId),
    repos.payoutBatches.getByOrgMonth(input.orgId, input.month),
    repos.admins.getById(input.adminId),
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
  // Saved before the checkout opens: these workers can't be put in a second checkout meanwhile.
  await repos.payoutBatches.create(batch);

  try {
    const { url } = await provider.create({
      batchId,
      amount: batch.items.reduce((sum, i) => sum + i.amount, 0),
      purpose: `FairShift wages ${input.month} (${batch.items.length} workers)`,
      returnUrl: `${input.origin}/api/checkout/return?batch=${batchId}`,
      payer: { id: input.adminId, name: admin?.name ?? "Employer" },
      splits: batch.items.map((item) => {
        const account = accountOf.get(item.workerId)!;
        return {
          workerId: item.workerId,
          holder: account.holder,
          account: account.account,
          ifsc: account.ifsc,
          amount: item.amount,
        };
      }),
    });
    await repos.payoutBatches.update(batchId, { checkoutUrl: url, updatedAt: input.now });
    return { ok: true, batchId, url };
  } catch (error) {
    // The checkout never opened, so nothing can be paid: free these workers again.
    const detail = error instanceof Error ? error.message.slice(0, 120) : "unknown error";
    await settle(repos, batch, "failed", input.now, { failure: "checkout_failed", detail });
    return { ok: false, error: "checkout_failed", detail };
  }
}

/** Asks the provider whether a waiting checkout was paid, and records the outcome. */
export async function confirmCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: { orgId: string; batchId: string; now: Date },
): Promise<{ ok: true; batch: PayoutBatchView; month: string } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!waiting(batch)) return { ok: true, batch: batchView(batch), month: batch.month };
  let status: PayoutStatus;
  try {
    status = await provider.status(batch.id);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  const next =
    status === "pending" ? batch : await settle(repos, batch, status, input.now, { failure: "payment_failed" });
  return { ok: true, batch: batchView(next), month: batch.month };
}

/** The employer gives up on a waiting checkout: the link is cancelled and the workers are freed. */
export async function cancelCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: { orgId: string; batchId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!waiting(batch)) return { ok: true };
  // If it was paid in the meantime, record that instead of cancelling.
  const confirmed = await confirmCheckout(repos, provider, input);
  if (!confirmed.ok) return confirmed;
  if (confirmed.batch.summary.pending === 0) return { ok: true };
  try {
    await provider.cancel(batch.id);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  await settle(repos, batch, "failed", input.now, { failure: "payment_cancelled" });
  return { ok: true };
}

/** Simulation only: the employer chose the outcome on the stand-in checkout page. */
export async function completeSimulatedCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: { orgId: string; batchId: string; outcome: "paid" | "failed"; now: Date },
): Promise<{ ok: true; month: string } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId || batch.provider !== "simulated" || provider.name !== "simulated") {
    return { ok: false, error: "not_found" };
  }
  if (waiting(batch)) await repos.payoutBatches.update(batch.id, { simulatedStatus: input.outcome });
  const confirmed = await confirmCheckout(repos, provider, input);
  return confirmed.ok ? { ok: true, month: confirmed.month } : confirmed;
}

/** The checkout page for a waiting batch of this organisation (simulation shows it; Cashfree hosts its own). */
export async function waitingCheckout(repos: Repos, orgId: string, batchId: string): Promise<PayoutBatchView | null> {
  const batch = await repos.payoutBatches.getById(batchId);
  if (!batch || batch.orgId !== orgId || !waiting(batch)) return null;
  return batchView(batch);
}

/**
 * Gives every waiting share the checkout's outcome, and writes each newly paid one to the
 * worker's pay record exactly once. A share that is already paid or failed never changes.
 */
async function settle(
  repos: Repos,
  batch: PayoutBatch,
  status: Exclude<PayoutStatus, "pending">,
  now: Date,
  why: { failure: PayoutFailure; detail?: string },
): Promise<PayoutBatch> {
  const items: PayoutItem[] = [];
  for (const item of batch.items) {
    if (item.status !== "pending") {
      items.push(item);
      continue;
    }
    if (status === "failed") {
      items.push({ ...item, status, failure: why.failure, ...(why.detail ? { detail: why.detail } : {}) });
      continue;
    }
    if (!item.recordedAt) await recordPayment(repos, batch, item, now);
    items.push({ ...item, status, recordedAt: item.recordedAt ?? now });
  }
  await repos.payoutBatches.update(batch.id, { items, updatedAt: now });
  return { ...batch, items, updatedAt: now };
}

/** A paid month's pay becomes the month's pay record; a paid gap is added to it as arrears. */
async function recordPayment(repos: Repos, batch: PayoutBatch, item: PayoutItem, now: Date): Promise<void> {
  const existing = await repos.paidRecords.get(item.workerId, batch.month);
  if (item.kind === "gap" && existing) {
    await recordArrears(repos, existing, {
      adminId: batch.createdBy,
      workerId: item.workerId,
      month: batch.month,
      amount: item.amount,
      now,
    });
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

/** Saves where a worker's share is settled, after checking the formats and that the worker is the employer's. */
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
