"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_BATCH } from "@/core/payouts";
import { monthKey } from "@/core/period";
import { requireRole } from "@/server/dal";
import { getPayoutProvider } from "@/server/payouts/provider";
import { RateLimiter } from "@/server/rate-limit";
import { getRepos } from "@/server/repos";
import {
  payWorkers,
  refreshPayoutBatch,
  savePayoutAccount,
  type AccountInputError,
  type PayWorkersResult,
} from "@/server/services/payouts";

const payLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60 * 60 * 1000 });
const refreshLimiter = new RateLimiter({ maxTokens: 60, refillIntervalMs: 60 * 60 * 1000 });
const accountLimiter = new RateLimiter({ maxTokens: 30, refillIntervalMs: 60 * 60 * 1000 });

function refresh(): void {
  revalidatePath("/a/payroll");
  revalidatePath("/a");
  revalidatePath("/w/pay");
}

/** Only the three months the payroll page shows can be paid. */
const payableMonth = (month: string, now: Date) => [0, -1, -2].some((offset) => monthKey(now, offset) === month);

const PayInput = z.object({
  month: z.string().max(7),
  workerIds: z.array(z.string().max(40)).min(1).max(MAX_BATCH),
});

export async function payWorkersAction(
  input: unknown,
): Promise<PayWorkersResult | { ok: false; error: "rate_limited" | "unavailable" }> {
  const session = await requireRole("admin");
  const parsed = PayInput.safeParse(input);
  const now = new Date();
  if (!parsed.success || !payableMonth(parsed.data.month, now)) return { ok: false, error: "invalid" };
  if (!payLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const provider = getPayoutProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  const result = await payWorkers(getRepos(), provider, {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    randomHex: randomBytes(6).toString("hex"),
    now,
  });
  if (result.ok) refresh();
  return result;
}

const RefreshInput = z.object({ batchId: z.string().regex(/^fs\d{6}_[a-f0-9]{12}$/) });

export async function refreshPayoutAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = RefreshInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!refreshLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const provider = getPayoutProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  const result = await refreshPayoutBatch(getRepos(), provider, {
    orgId: session.orgId,
    batchId: parsed.data.batchId,
    now: new Date(),
  });
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true };
}

export type AccountFormState = { ok?: boolean; error?: AccountInputError | "invalid" | "rate_limited" };

const AccountInput = z.object({
  workerId: z.string().max(40),
  holder: z.string().max(120),
  account: z.string().max(30),
  ifsc: z.string().max(20),
});

export async function savePayoutAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await requireRole("admin");
  if (!accountLimiter.check(session.uid)) return { error: "rate_limited" };
  const parsed = AccountInput.safeParse({
    workerId: formData.get("workerId"),
    holder: formData.get("holder"),
    account: formData.get("account"),
    ifsc: formData.get("ifsc"),
  });
  if (!parsed.success) return { error: "invalid" };
  const result = await savePayoutAccount(getRepos(), {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    now: new Date(),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/a/payroll");
  return { ok: true };
}
