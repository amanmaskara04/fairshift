"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayslip } from "@/server/services/payslip";
import { payTemplate } from "@/server/pay-explain";
import { explainPay } from "@/ai/explain-pay";
import { RateLimiter } from "@/server/rate-limit";
import { isMonthKey } from "@/core/period";

const limiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60_000 });

/** Friendlier AI wording of the same payslip. null → keep showing the template. */
export async function explainPayAction(month: string): Promise<string[] | null> {
  const session = await requireRole("worker");
  if (!z.string().refine(isMonthKey).safeParse(month).success) return null;
  if (!limiter.check(session.uid)) return null;
  const view = await buildPayslip(getRepos(), session.uid, month);
  if (!view) return null;
  const { sentences, facts } = await payTemplate(view);
  return explainPay(facts, sentences, await getLocale());
}
