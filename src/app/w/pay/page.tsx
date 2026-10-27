import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayslip } from "@/server/services/payslip";
import { payTemplate } from "@/server/pay-explain";
import { isMonthKey, monthKey } from "@/core/period";
import { formatDuration, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { ExplainPay } from "@/components/worker/explain-pay";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export default async function PayPage({ searchParams }: PageProps<"/w/pay">) {
  const session = await requireRole("worker");
  const t = await getTranslations("pay");
  const now = new Date();
  const months = [0, -1, -2].map((offset) => monthKey(now, offset));
  const requested = (await searchParams).m;
  const month = typeof requested === "string" && isMonthKey(requested) && months.includes(requested) ? requested : months[0];

  const view = await buildPayslip(getRepos(), session.uid, month);
  if (!view) return null;
  const { payslip, daysWorked } = view;
  const { sentences } = await payTemplate(view);
  const regular = payslip.lines.find((l) => l.kind === "regular");
  const overtime = payslip.lines.find((l) => l.kind === "overtime");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} action={<SpeakButton text={sentences.join(" ")} />} />

      <nav aria-label={t("period")} className="grid grid-cols-3 gap-1 rounded-worker border border-border bg-card p-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/w/pay?m=${m}`}
            aria-current={m === month ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1 rounded-admin text-sm font-bold",
              m === month ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {monthLabel(m)}
          </Link>
        ))}
      </nav>

      <section className="receipt rise-in my-3 px-5 py-6">
        <p className="eyebrow">{t("net")}</p>
        <p className="figure mt-1 text-[2.6rem] leading-none font-semibold" data-testid="net-pay">
          {formatINR(payslip.net)}
        </p>
        <p className="mt-2 font-semibold text-brand">{t("daysWorked", { days: daysWorked })}</p>
        <div className="my-4 border-t-2 border-dashed border-border" aria-hidden="true" />
        <dl className="divide-y divide-border">
          <div className="flex items-center justify-between gap-2 py-3">
            <dt>
              {t("regular")}
              <span className="block text-sm text-muted-foreground">{formatDuration(regular?.minutes ?? 0)}</span>
            </dt>
            <dd className="figure whitespace-nowrap font-semibold">{formatINR(regular?.amount ?? 0)}</dd>
          </div>
          {overtime && (
            <div className="flex items-center justify-between gap-2 py-3" data-testid="overtime-line">
              <dt>
                <span className="flex items-center gap-2">
                  {t("overtime")} <Badge tone="warning">{t("doubleRate")}</Badge>
                </span>
                <span className="block text-sm text-muted-foreground">
                  {formatDuration(overtime.minutes ?? 0)} · {t(`basis.${payslip.overtimeBasis}`)}
                </span>
              </dt>
              <dd className="figure whitespace-nowrap font-semibold">{formatINR(overtime.amount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 py-3">
            <dt className="font-semibold">{t("gross")}</dt>
            <dd className="figure whitespace-nowrap font-semibold">{formatINR(payslip.gross)}</dd>
          </div>
          {payslip.deductions.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-3">
              <dt>{t(`deduction.${d.label}`)}</dt>
              <dd className="figure whitespace-nowrap font-semibold">− {formatINR(d.amount)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ExplainPay month={month} sentences={sentences} />
    </div>
  );
}
