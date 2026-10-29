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
  const deducted = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);

  // Where the gross goes: take-home vs deductions, and how much of it came from overtime.
  const gross = Math.max(payslip.gross, 1);
  const split = [
    { key: "regular", share: (regular?.amount ?? 0) / gross, className: "bg-slab-foreground" },
    { key: "overtime", share: (overtime?.amount ?? 0) / gross, className: "bg-accent" },
  ];

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader title={t("title")} action={<SpeakButton text={sentences.join(" ")} />} />

      <nav aria-label={t("period")} className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/w/pay?m=${m}`}
            aria-current={m === month ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors",
              m === month ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {monthLabel(m)}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="net-label" className="slab rise-in flex flex-col gap-5 rounded-[28px] p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id="net-label" className="eyebrow">
            {t("net")}
          </p>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">{t("daysWorked", { days: daysWorked })}</span>
        </div>
        <p className="figure text-[2.9rem] leading-none font-bold md:text-7xl" data-testid="net-pay">
          {formatINR(payslip.net)}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-[rgb(243_242_236/0.14)]" aria-hidden="true">
            {split.map((part) =>
              part.share > 0 ? <div key={part.key} className={cn("meter-fill h-full", part.className)} style={{ width: `${part.share * 100}%` }} /> : null,
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slab-muted">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-slab-foreground" aria-hidden="true" />
              {t("regular")}
            </li>
            {overtime && (
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
                {t("overtime")}
              </li>
            )}
            {deducted > 0 && (
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[rgb(243_242_236/0.3)]" aria-hidden="true" />
                {payslip.deductions.map((d) => t(`deduction.${d.label}`)).join(", ")}
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="receipt sheet rounded-t-worker px-5 pt-3 pb-5">
        <dl className="divide-y divide-border">
          <div className="flex items-center justify-between gap-2 py-3.5">
            <dt>
              <span className="font-bold">{t("regular")}</span>
              <span className="figure block text-sm text-muted-foreground">{formatDuration(regular?.minutes ?? 0)}</span>
            </dt>
            <dd className="figure font-bold whitespace-nowrap">{formatINR(regular?.amount ?? 0)}</dd>
          </div>
          {overtime && (
            <div className="flex items-center justify-between gap-2 py-3.5" data-testid="overtime-line">
              <dt>
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  {t("overtime")} <Badge tone="signal">{t("doubleRate")}</Badge>
                </span>
                <span className="block text-sm text-muted-foreground">
                  <span className="figure">{formatDuration(overtime.minutes ?? 0)}</span> · {t(`basis.${payslip.overtimeBasis}`)}
                </span>
              </dt>
              <dd className="figure font-bold whitespace-nowrap">{formatINR(overtime.amount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 py-3.5">
            <dt className="font-extrabold">{t("gross")}</dt>
            <dd className="figure font-bold whitespace-nowrap">{formatINR(payslip.gross)}</dd>
          </div>
          {payslip.deductions.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-3.5">
              <dt>{t(`deduction.${d.label}`)}</dt>
              <dd className="figure font-bold whitespace-nowrap">− {formatINR(d.amount)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-4">
            <dt className="font-display text-lg font-extrabold">{t("net")}</dt>
            <dd className="figure text-xl font-bold whitespace-nowrap">{formatINR(payslip.net)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-3">
        <ExplainPay month={month} sentences={sentences} />
      </div>
    </div>
  );
}
