import "server-only";
import type { PayoutFailure, PayoutStatus } from "@/core/payouts";
import type { PayoutProvider, TransferRequest, TransferResult } from "./provider";

/**
 * A stand-in for Cashfree's payout sandbox when no test keys are set. It gives the outcomes
 * Cashfree documents for its test bank accounts, so the demo behaves like the real sandbox.
 * No money moves, here or there.
 */
type Outcome =
  | { status: "paid" }
  | { status: "failed"; failure: PayoutFailure; detail: string }
  | { status: "pending"; then: "paid" | "failed" };

const OUTCOMES: Record<string, Outcome> = {
  "026291800001191:YESB0000262": { status: "paid" },
  "00011020001772:HDFC0000001": { status: "paid" },
  "1233943142:ICIC0000009": { status: "paid" },
  "388108022658:ICIC0000009": { status: "paid" },
  "000890289871772:SCBL0036078": { status: "paid" },
  "000100289877623:SBIN0008752": { status: "paid" },
  "2640101002729:CNRR0002640": { status: "failed", failure: "invalid_ifsc", detail: "Invalid IFSC code" },
  "1234567890:ICIC0000001": { status: "failed", failure: "invalid_ifsc", detail: "Invalid IFSC code" },
  "026291800001190:YESB0000262": {
    status: "failed",
    failure: "invalid_account",
    detail: "Invalid account number",
  },
  "234005000876:ICIC0000007": { status: "failed", failure: "invalid_account", detail: "Invalid account number" },
  "00224412311300:YESB0000001": { status: "pending", then: "paid" },
  "7766666351000:YESB0000001": { status: "pending", then: "failed" },
};

interface Stored {
  transferId: string;
  status: PayoutStatus;
  /** What a pending transfer becomes on the next status check */
  then?: "paid" | "failed";
  failure?: PayoutFailure;
  detail?: string;
  utr?: string;
}

// Shared across route bundles in one Node process, like the in-memory store.
const globalSim = globalThis as typeof globalThis & { __fairshiftPayoutSim?: Map<string, Stored[]> };
const batches = (): Map<string, Stored[]> => (globalSim.__fairshiftPayoutSim ??= new Map());

/** Test helper: forget every simulated batch. */
export function resetSimulatedPayouts(): void {
  globalSim.__fairshiftPayoutSim = undefined;
}

let utrSeq = 0;
const utr = () => `SIMUTR${Date.now().toString().slice(-8)}${String(++utrSeq).padStart(4, "0")}`;

function settle(transferId: string, outcome: Exclude<Outcome, { status: "pending" }>): Stored {
  return outcome.status === "paid"
    ? { transferId, status: "paid", utr: utr() }
    : { transferId, status: "failed", failure: outcome.failure, detail: outcome.detail };
}

const NOT_IN_SANDBOX: Outcome = {
  status: "failed",
  failure: "not_in_sandbox",
  detail: "Not a sandbox test account",
};

function first(t: TransferRequest): Stored {
  const outcome = OUTCOMES[`${t.account}:${t.ifsc}`] ?? NOT_IN_SANDBOX;
  if (outcome.status === "pending") return { transferId: t.transferId, status: "pending", then: outcome.then };
  return settle(t.transferId, outcome);
}

const view = ({ transferId, status, failure, detail, utr: ref }: Stored): TransferResult => ({
  transferId,
  status,
  ...(failure ? { failure, detail } : {}),
  ...(ref ? { utr: ref } : {}),
});

export function createSimulatedProvider(): PayoutProvider {
  return {
    name: "simulated",
    async send(batchId, transfers) {
      const stored = transfers.map(first);
      batches().set(batchId, stored);
      return stored.map(view);
    },
    async status(batchId) {
      const stored = batches().get(batchId);
      if (!stored) return [];
      const next = stored.map((s) =>
        s.status === "pending" && s.then
          ? settle(
              s.transferId,
              s.then === "paid"
                ? { status: "paid" }
                : { status: "failed", failure: "bank_failed", detail: "Failed at the beneficiary bank" },
            )
          : s,
      );
      batches().set(batchId, next);
      return next.map(view);
    },
  };
}
