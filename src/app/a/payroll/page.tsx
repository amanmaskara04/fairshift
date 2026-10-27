import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayroll } from "@/server/services/payroll";
import { isMonthKey, monthKey } from "@/core/period";
import { formatDuration, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function PayrollPage({ searchParams }: PageProps<"/a/payroll">) {
  const session = await requireRole("admin");
  const t = await getTranslations("admin.payrollPage");
  const months = [0, -1, -2].map((offset) => monthKey(new Date(), offset));
  const requested = (await searchParams).m;
  const month = typeof requested === "string" && isMonthKey(requested) && months.includes(requested) ? requested : months[0];
  const rows = await buildPayroll(getRepos(), session.orgId, month);
  const totals = rows.reduce((acc, r) => ({ gross: acc.gross + r.gross, net: acc.net + r.net, ot: acc.ot + r.overtimeMinutes }), { gross: 0, net: 0, ot: 0 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <a href={`/api/payroll?month=${month}`} className={buttonVariants({ size: "sm" })} download>
          <Download aria-hidden="true" className="size-4" />
          {t("export")}
        </a>
      </div>
      <nav aria-label={t("month")} className="flex flex-wrap gap-2">
        {months.map((m) => (
          <Link
            key={m}
            href={`/a/payroll?m=${m}`}
            aria-current={m === month ? "page" : undefined}
            className={cn(buttonVariants({ size: "sm", variant: m === month ? "primary" : "outline" }))}
          >
            {m}
          </Link>
        ))}
      </nav>
      <p className="text-muted-foreground">{t("intro")}</p>

      {/* Phones: a card per worker with net pay prominent, then the totals. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.workerId}>
            <Card className="flex flex-col gap-2 rounded-admin">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </p>
                </div>
                <p className="figure text-right text-lg font-semibold">
                  {formatINR(r.net)}
                  <span className="eyebrow block">{t("net")}</span>
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-sm">
                <div>
                  <dt className="eyebrow">{t("days")}</dt>
                  <dd className="figure">{r.daysWorked}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("overtime")}</dt>
                  <dd className="figure">{r.overtimeMinutes ? formatDuration(r.overtimeMinutes) : "—"}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("pf")}</dt>
                  <dd className="figure">{formatINR(r.deductions)}</dd>
                </div>
              </dl>
            </Card>
          </li>
        ))}
        <li>
          <Card className="flex items-center justify-between rounded-admin border-ink bg-foreground text-background">
            <span className="font-bold">{t("total")}</span>
            <span className="figure text-lg font-semibold">{formatINR(totals.net)}</span>
          </Card>
        </li>
      </ul>

      <Card className="hidden overflow-x-auto rounded-admin p-0 md:block">
        <table className="w-full min-w-[720px] text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="bg-muted text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="p-3 font-medium">{t("worker")}</th>
              <th scope="col" className="p-3 font-medium">{t("days")}</th>
              <th scope="col" className="p-3 font-medium">{t("regular")}</th>
              <th scope="col" className="p-3 font-medium">{t("overtime")}</th>
              <th scope="col" className="p-3 text-right font-medium">{t("gross")}</th>
              <th scope="col" className="p-3 text-right font-medium">{t("pf")}</th>
              <th scope="col" className="p-3 text-right font-medium">{t("net")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.workerId} className="border-t border-border">
                <th scope="row" className="p-3 font-semibold">
                  {r.name}
                  <span className="block text-sm font-normal text-muted-foreground">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </span>
                </th>
                <td className="p-3">{r.daysWorked}</td>
                <td className="p-3 whitespace-nowrap">{formatDuration(r.regularMinutes)}</td>
                <td className="p-3 whitespace-nowrap">{r.overtimeMinutes ? formatDuration(r.overtimeMinutes) : "—"}</td>
                <td className="p-3 text-right whitespace-nowrap">{formatINR(r.gross)}</td>
                <td className="p-3 text-right whitespace-nowrap">{formatINR(r.deductions)}</td>
                <td className="p-3 text-right font-bold whitespace-nowrap">{formatINR(r.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border font-bold">
            <tr>
              <th scope="row" className="p-3">{t("total")}</th>
              <td className="p-3" />
              <td className="p-3" />
              <td className="p-3 whitespace-nowrap">{formatDuration(totals.ot)}</td>
              <td className="p-3 text-right whitespace-nowrap">{formatINR(totals.gross)}</td>
              <td className="p-3" />
              <td className="p-3 text-right whitespace-nowrap">{formatINR(totals.net)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
