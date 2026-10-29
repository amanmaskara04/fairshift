import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CircleCheck, Download, FileClock, Scale } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayroll, type PayrollRow } from "@/server/services/payroll";
import { isMonthKey, monthKey } from "@/core/period";
import { formatDuration, formatINR, formatMonth, formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DisputeControls, PaidRecordTools } from "@/components/admin/paid-records";

/** Sentinel status for one row: nothing recorded yet, matches, or a possible shortfall. */
function CheckBadge({ row, t }: { row: PayrollRow; t: (key: string, values?: Record<string, string>) => string }) {
  if (row.check.status === "no_record") {
    return (
      <Badge>
        <FileClock aria-hidden="true" className="size-4" />
        {t("check.noRecord")}
      </Badge>
    );
  }
  if (row.check.totalShortfall === 0) {
    return (
      <Badge tone="success">
        <CircleCheck aria-hidden="true" className="size-4" />
        {t("check.matches")}
      </Badge>
    );
  }
  return (
    <Badge tone="danger">
      <Scale aria-hidden="true" className="size-4" />
      {t("check.shortfall", { amount: formatRupees(row.check.totalShortfall) })}
    </Badge>
  );
}

export default async function PayrollPage({ searchParams }: PageProps<"/a/payroll">) {
  const session = await requireRole("admin");
  const [t, locale] = await Promise.all([getTranslations("admin.payrollPage"), getLocale()]);
  const months = [0, -1, -2].map((offset) => monthKey(new Date(), offset));
  const requested = (await searchParams).m;
  const month = typeof requested === "string" && isMonthKey(requested) && months.includes(requested) ? requested : months[0];
  const repos = getRepos();
  const [rows, disputes] = await Promise.all([buildPayroll(repos, session.orgId, month), repos.payDisputes.getByOrg(session.orgId)]);
  const nameOf = new Map(rows.map((r) => [r.workerId, r.name]));
  const totals = rows.reduce((acc, r) => ({ gross: acc.gross + r.gross, net: acc.net + r.net, ot: acc.ot + r.overtimeMinutes }), { gross: 0, net: 0, ot: 0 });
  const flagged = rows.filter((r) => r.check.totalShortfall > 0);
  const sortedDisputes = [...disputes].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        action={
          <a href={`/api/payroll?month=${month}`} className={buttonVariants({ size: "md" })} download>
            <Download aria-hidden="true" className="size-4" />
            {t("export")}
          </a>
        }
      >
        {t("intro")}
      </PageHeader>

      <nav aria-label={t("month")} className="flex w-fit flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/a/payroll?m=${m}`}
            replace
            scroll={false}
            aria-current={m === month ? "page" : undefined}
            className={cn(buttonVariants({ size: "sm", variant: m === month ? "primary" : "ghost" }), m !== month && "text-ink-2")}
          >
            {formatMonth(m, locale)}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="sentinel-title" className="hero-card flex flex-col gap-3 p-5">
        <h2 id="sentinel-title" className="font-display text-xl font-extrabold">
          {t("sentinel.title")}
        </h2>
        <p className="text-ink-2">{t("sentinel.hint")}</p>
        <p className="font-bold">{flagged.length ? t("sentinel.flagged", { count: flagged.length }) : t("sentinel.clear")}</p>
        <PaidRecordTools month={month} workers={rows.map((r) => ({ id: r.workerId, label: `${r.name} (#${r.code})` }))} />
        <p className="text-xs text-ink-2">{t("sentinel.minimumWageNote")}</p>
      </section>

      {/* Phones: a card per worker with net pay prominent, then the totals. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.workerId}>
            <Card className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-ink-2">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </p>
                </div>
                <p className="figure text-right text-lg font-semibold">
                  {formatINR(r.net)}
                  <span className="eyebrow block">{t("net")}</span>
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 border-t border-line pt-2 text-sm">
                <div>
                  <dt className="eyebrow">{t("days")}</dt>
                  <dd className="figure">{r.daysWorked}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("overtime")}</dt>
                  <dd className="figure">{r.overtimeMinutes ? formatDuration(r.overtimeMinutes) : "—"}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("paid")}</dt>
                  <dd className="figure">{r.paid ? formatINR(r.paid.netPaid) : "—"}</dd>
                </div>
              </dl>
              <CheckBadge row={r} t={t} />
            </Card>
          </li>
        ))}
        <li>
          <Card className="flex items-center justify-between bg-primary-soft p-4">
            <span className="font-bold">{t("total")}</span>
            <span className="figure text-lg font-semibold">{formatINR(totals.net)}</span>
          </Card>
        </li>
      </ul>

      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[900px] text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="border-b border-line text-xs tracking-wide text-ink-2 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">{t("worker")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("days")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("regular")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("overtime")}</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">{t("gross")}</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">{t("pf")}</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">{t("net")}</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">{t("paid")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("checkColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.workerId} className="border-t border-line transition-colors hover:bg-surface-2/50">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {r.name}
                  <span className="block text-sm font-normal text-ink-2">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </span>
                </th>
                <td className="figure px-4 py-3">{r.daysWorked}</td>
                <td className="figure px-4 py-3 whitespace-nowrap">{formatDuration(r.regularMinutes)}</td>
                <td className="figure px-4 py-3 whitespace-nowrap">{r.overtimeMinutes ? formatDuration(r.overtimeMinutes) : "—"}</td>
                <td className="figure px-4 py-3 text-right whitespace-nowrap">{formatINR(r.gross)}</td>
                <td className="figure px-4 py-3 text-right whitespace-nowrap">{formatINR(r.deductions)}</td>
                <td className="figure px-4 py-3 text-right font-bold whitespace-nowrap">{formatINR(r.net)}</td>
                <td className="figure px-4 py-3 text-right whitespace-nowrap">{r.paid ? formatINR(r.paid.netPaid) : "—"}</td>
                <td className="px-4 py-3">
                  <CheckBadge row={r} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="figure border-t-2 border-ink/60 bg-surface-2/50 font-bold">
            <tr>
              <th scope="row" className="px-4 py-3">{t("total")}</th>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 whitespace-nowrap">{formatDuration(totals.ot)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{formatINR(totals.gross)}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right whitespace-nowrap">{formatINR(totals.net)}</td>
              <td className="px-4 py-3" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </Card>

      <section id="disputes" aria-labelledby="disputes-title" className="flex scroll-mt-24 flex-col gap-3">
        <h2 id="disputes-title" className="font-display text-xl font-extrabold">
          {t("disputes.title")}
        </h2>
        {sortedDisputes.length === 0 ? (
          <p className="text-ink-2">{t("disputes.none")}</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {sortedDisputes.map((d) => (
              <li key={d.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{nameOf.get(d.workerId) ?? d.workerId}</p>
                    <p className="text-sm text-ink-2">
                      {formatMonth(d.month, locale)} · {t("disputes.shortfall", { amount: formatRupees(d.shortfall) })}
                    </p>
                  </div>
                  <Badge tone={d.status === "resolved" ? "success" : d.status === "reviewing" ? "info" : "warning"}>{t(`disputes.status.${d.status}`)}</Badge>
                </div>
                <ul className="flex flex-wrap gap-1">
                  {d.findings.map((code) => (
                    <li key={code}>
                      <Badge>{t(`disputes.codes.${code}`)}</Badge>
                    </li>
                  ))}
                </ul>
                {d.resolutionNote && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{d.resolutionNote}</p>}
                <DisputeControls id={d.id} status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
