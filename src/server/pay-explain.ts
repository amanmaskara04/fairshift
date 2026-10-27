import "server-only";
import { getTranslations } from "next-intl/server";
import { formatDuration, formatINR } from "@/lib/format";
import type { PayslipView } from "@/server/services/payslip";
import type { PayFacts } from "@/ai/explain-pay";

/** Deterministic, translated explanation of a payslip — always correct, used as the primary text. */
export async function payTemplate(view: PayslipView): Promise<{ sentences: string[]; facts: PayFacts }> {
  const t = await getTranslations("pay.explain");
  const { payslip, daysWorked, totalMinutes } = view;
  const ot = payslip.lines.find((l) => l.kind === "overtime");
  const pf = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);

  const values: Record<string, string> = {
    days: String(daysWorked),
    hours: formatDuration(totalMinutes),
    net: formatINR(payslip.net),
  };
  const sentences = [t("worked", { days: values.days, hours: values.hours })];
  if (ot) {
    values.otHours = formatDuration(ot.minutes ?? 0);
    values.otPay = formatINR(ot.amount);
    sentences.push(t("overtime", { otHours: values.otHours, otPay: values.otPay }));
  }
  if (pf > 0) {
    values.pf = formatINR(pf);
    sentences.push(t("pf", { pf: values.pf }));
  }
  sentences.push(t("net", { net: values.net }));
  return { sentences, facts: { values } };
}
