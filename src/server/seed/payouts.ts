/**
 * Demo bank details where each worker's share of a checkout is settled: Cashfree's published
 * sandbox test accounts. They only work with test keys; no real bank is involved.
 */
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

export function buildPayoutAccounts(workers: Worker[], now: Date): PayoutAccount[] {
  return workers.flatMap((worker, index) => {
    if (WITHOUT_BANK_DETAILS.has(worker.id)) return [];
    const [account, ifsc] = SUCCESS[index % SUCCESS.length];
    return [
      {
        id: worker.id,
        orgId: worker.orgId,
        holder: worker.name,
        account,
        ifsc,
        updatedAt: now,
        updatedBy: worker.orgId === "org1" ? "admin1" : "admin2",
      },
    ];
  });
}
