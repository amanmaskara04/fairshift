/**
 * Bulk payouts: what each worker can be paid, bank detail checks, and batch bookkeeping.
 * Pure functions only. Amounts are always in paise and always come from payroll, never from a form.
 */

export type PayoutKind = "salary" | "gap";
export type PayoutStatus = "pending" | "paid" | "failed";
export type PayoutFailure = "invalid_account" | "invalid_ifsc" | "bank_failed" | "not_in_sandbox";

/** Most workers one batch may pay: enough for a crew, small enough to review before sending. */
export const MAX_BATCH = 25;
/** The provider's minimum transfer is ₹1. */
export const MIN_PAYOUT = 100;

/**
 * What a worker can be paid for a month:
 * - nothing recorded yet → their whole net pay ("salary")
 * - a record with a possible shortfall still open → exactly that gap ("gap")
 */
export function payableFor(row: {
  net: number;
  outstanding: number;
  hasRecord: boolean;
}): { kind: PayoutKind; amount: number } | null {
  if (!row.hasRecord) return row.net >= MIN_PAYOUT ? { kind: "salary", amount: row.net } : null;
  return row.outstanding >= MIN_PAYOUT ? { kind: "gap", amount: row.outstanding } : null;
}

// ── Bank details ───────────────────────────────────────────────────

/** Indian IFSC: 4 bank letters, a zero, then 6 letters or digits (RBI format). */
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** Bank account numbers are 9 to 18 digits. */
const ACCOUNT = /^\d{9,18}$/;
/** Letters in any script, spaces, dots, apostrophes and hyphens. */
const HOLDER = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,99}$/u;

export const normaliseIfsc = (ifsc: string) => ifsc.trim().toUpperCase();
export const normaliseAccount = (account: string) => account.replace(/[\s-]/g, "");
export const normaliseHolder = (holder: string) => holder.trim().replace(/\s+/g, " ");

export const isValidIfsc = (ifsc: string) => IFSC.test(ifsc);
export const isValidAccount = (account: string) => ACCOUNT.test(account);
export const isValidHolder = (holder: string) => HOLDER.test(holder);

/** Only the last four digits ever leave the server: "••••1191". */
export function maskAccount(account: string): string {
  return `••••${account.slice(-4)}`;
}

// ── Batch bookkeeping ─────────────────────────────────────────────

/** Provider ids allow letters, digits and underscores only: "fs202610_a1b2c3d4e5f6". */
export function batchIdFor(month: string, randomHex: string): string {
  return `fs${month.replace("-", "")}_${randomHex.replace(/[^a-f0-9]/gi, "").slice(0, 12)}`;
}

export const transferIdFor = (batchId: string, index: number) => `${batchId}_${index + 1}`;

/** Maps a provider's transfer status to ours. Anything not final is still pending. */
export function mapTransferStatus(status: string): PayoutStatus {
  const s = status.toUpperCase();
  if (s === "SUCCESS") return "paid";
  if (["FAILED", "REJECTED", "REVERSED", "MANUALLY_REJECTED"].includes(s)) return "failed";
  return "pending";
}

/** A provider's free-text failure reason, as one of the reasons the dashboard can explain. */
export function classifyFailure(description: string | undefined): PayoutFailure {
  const text = (description ?? "").toLowerCase();
  if (text.includes("ifsc")) return "invalid_ifsc";
  if (text.includes("account")) return "invalid_account";
  return "bank_failed";
}

export function summariseBatch(items: { status: PayoutStatus; amount: number }[]): {
  paid: number;
  failed: number;
  pending: number;
  paidAmount: number;
} {
  return items.reduce(
    (sum, item) => ({
      paid: sum.paid + (item.status === "paid" ? 1 : 0),
      failed: sum.failed + (item.status === "failed" ? 1 : 0),
      pending: sum.pending + (item.status === "pending" ? 1 : 0),
      paidAmount: sum.paidAmount + (item.status === "paid" ? item.amount : 0),
    }),
    { paid: 0, failed: 0, pending: 0, paidAmount: 0 },
  );
}

/** Paise as the rupee number payout APIs expect (two decimals). */
export const paiseToRupees = (paise: number) => Math.round(paise) / 100;
