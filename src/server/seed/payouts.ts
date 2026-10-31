/**
 * Demo bank details: Cashfree's published sandbox test accounts, so a payout batch shows
 * every outcome. These accounts only work with test keys; no real bank is involved.
 */
import type { PayoutAccount, Worker } from "../repos/types";

/** Test accounts that always succeed. */
const SUCCESS: [account: string, ifsc: string][] = [
  ["026291800001191", "YESB0000262"],
  ["00011020001772", "HDFC0000001"],
  ["1233943142", "ICIC0000009"],
  ["388108022658", "ICIC0000009"],
  ["000890289871772", "SCBL0036078"],
  ["000100289877623", "SBIN0008752"],
];

/** Workers whose payout shows another outcome. */
export const PAYOUT_STORY: Record<string, [account: string, ifsc: string] | null> = {
  // Arun: account number rejected by the bank.
  w1002: ["026291800001190", "YESB0000262"],
  // Ravi and Pooja: processing at first, paid on the next status check.
  w1006: ["00224412311300", "YESB0000001"],
  w2004: ["00224412311300", "YESB0000001"],
  // Valli and Ramkali: no bank details yet, so the employer adds them first.
  w1017: null,
  w2012: null,
};

export function buildPayoutAccounts(workers: Worker[], now: Date): PayoutAccount[] {
  return workers.flatMap((worker, index) => {
    const story = PAYOUT_STORY[worker.id];
    if (story === null) return [];
    const [account, ifsc] = story ?? SUCCESS[index % SUCCESS.length];
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
