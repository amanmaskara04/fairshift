/**
 * Demo bank details where each worker's share of a checkout is settled: Cashfree's published
 * sandbox test accounts. They only work with test keys; no real bank is involved.
 */
import { encryptAccount } from "../bank-crypto";
import type { PayoutAccount, Worker } from "../repos/types";

/** Sandbox test accounts that always succeed. */
const SUCCESS: [account: string, ifsc: string][] = [
  ["026291800001191", "YESB0000262"],
  ["00011020001772", "HDFC0000001"],
  ["1233943142", "ICIC0000009"],
  ["388108022658", "ICIC0000009"],
  ["000890289871772", "SCBL0036078"],
  ["000100289877623", "SBIN0008752"],
];

/** Valli and Ramkali have no bank details yet, so the employer adds them before paying. */
export const WITHOUT_BANK_DETAILS = new Set(["w1017", "w2012"]);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every demo account was entered by the employer 30 days ago and confirmed by the worker the next
 * day, and is stored encrypted like a real one.
 */
export function buildPayoutAccounts(workers: Worker[], now: Date): PayoutAccount[] {
  const entered = new Date(now.getTime() - 30 * DAY_MS);
  const confirmed = new Date(entered.getTime() + DAY_MS);
  return workers.flatMap((worker, index) => {
    if (WITHOUT_BANK_DETAILS.has(worker.id)) return [];
    const [account, ifsc] = SUCCESS[index % SUCCESS.length];
    const last4 = account.slice(-4);
    return [
      {
        id: worker.id,
        orgId: worker.orgId,
        holder: worker.name,
        accountEncrypted: encryptAccount(account, worker.id),
        last4,
        ifsc,
        status: "confirmed",
        changedAt: entered,
        updatedAt: confirmed,
        updatedBy: worker.orgId === "org1" ? "admin1" : "admin2",
        history: [
          { at: confirmed, by: "worker", action: "confirmed", last4 },
          { at: entered, by: "employer", action: "changed", last4 },
        ],
      },
    ];
  });
}
