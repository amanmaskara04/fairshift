import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Activity, ArrowUpRight, BatteryLow, CheckCircle2, Clock, Cpu, Smile, TriangleAlert } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot, shortDay } from "@/server/services/workforce";
import { recentAiCalls } from "@/ai/log";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader, todayLabel } from "@/components/page-header";
import { HazardIcon } from "@/components/hazard-icon";
import { BarChartCard } from "@/components/admin/bar-chart-card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";

const RISK_ATTENTION = 40;

export default async function AdminOverview() {
  const session = await requireRole("admin");
  const [t, tr, locale] = await Promise.all([getTranslations("admin"), getTranslations("report"), getLocale()]);
  const snapshot = await buildOrgSnapshot(getRepos(), session.orgId, new Date());
  if (!snapshot) return null;
  const { workers, hazards, feedback } = snapshot;

  const onSite = workers.filter((w) => w.onSite).length;
  const openHazards = hazards.filter((h) => h.status === "received" || h.status === "in_progress");
  const urgentHazards = openHazards.filter((h) => h.severity === "critical" || h.severity === "high");
  const tired = workers.filter((w) => w.fatigue.length > 0);
  const atRisk = workers.filter((w) => w.risk.score >= RISK_ATTENTION);
  const overtimeMin = workers.reduce((sum, w) => sum + w.overtimeThisWeek, 0);
  const aiCalls = recentAiCalls().slice(0, 5);

  const kpis = [
    { label: t("overtimeThisWeek"), value: formatDuration(overtimeMin), detail: t("acrossTeam"), Icon: Clock },
    {
      label: t("openHazards"),
      value: String(openHazards.length),
      detail: t("urgentCount", { count: urgentHazards.length }),
      Icon: TriangleAlert,
      alert: urgentHazards.length > 0,
    },
    {
      label: t("feedbackMood"),
      value: snapshot.moodAverage === null ? "—" : `${snapshot.moodAverage.toFixed(1)} / 3`,
      detail: t("responses", { count: feedback.length }),
      Icon: Smile,
    },
    { label: t("atRiskWorkers"), value: String(tired.length), detail: t("fatigueRulesBroken"), Icon: Activity },
  ];

  const rowClass = "flex flex-wrap items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={todayLabel(locale)} title={t("overview")} />

      <ul className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <li className="col-span-2 lg:col-span-1 lg:row-span-2 xl:row-span-1">
          <div className="slab flex h-full min-h-40 flex-col justify-between gap-4 rounded-worker p-5">
            <span className="eyebrow flex items-center gap-2">
              <span className="live-dot" aria-hidden="true" />
              {t("onSiteNow")}
            </span>
            <div>
              <span className="figure block text-6xl leading-none font-bold">{onSite}</span>
              <span className="mt-2 block text-sm text-slab-muted">{t("ofWorkers", { count: workers.length })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgb(243_242_236/0.14)]" aria-hidden="true">
              <div className="meter-fill h-full rounded-full bg-accent" style={{ width: `${workers.length ? (onSite / workers.length) * 100 : 0}%` }} />
            </div>
          </div>
        </li>
        {kpis.map(({ label, value, detail, Icon, alert }) => (
          <li key={label}>
            <div className="sheet flex h-full flex-col justify-between gap-3 rounded-worker p-4">
              <span className="flex items-start justify-between gap-2">
                <span className="eyebrow">{label}</span>
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    alert ? "bg-danger text-status-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </span>
              <span>
                <span className="figure block text-3xl leading-tight font-bold sm:text-4xl">{value}</span>
                <span className="text-sm text-muted-foreground">{detail}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="attention" className="sheet flex flex-col gap-2 rounded-worker p-4 md:p-5">
          <h2 id="attention" className="font-display flex items-center justify-between gap-2 px-1 text-xl font-extrabold">
            {t("needsAttention")}
            <Badge tone={urgentHazards.length + tired.length + atRisk.length ? "danger" : "success"}>
              {urgentHazards.length + tired.length + atRisk.length}
            </Badge>
          </h2>
          {urgentHazards.length + tired.length + atRisk.length === 0 ? (
            <p className="flex items-center gap-2 px-1 text-muted-foreground">
              <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
              {t("allClear")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {urgentHazards.map((h) => (
                <li key={h.id}>
                  <Link href="/a/hazards" className={rowClass}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger text-status-foreground">
                      <HazardIcon category={h.category} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{tr(`categories.${h.category}`)}</span>
                      <span className="block truncate text-sm text-muted-foreground">{h.transcriptEn || h.transcript}</span>
                    </span>
                    <Badge tone="danger">{tr(`severity.${h.severity}`)}</Badge>
                    <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {tired.map((w) => (
                <li key={`f-${w.worker.id}`}>
                  <Link href="/a/people" className={rowClass}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning text-status-foreground">
                      <BatteryLow aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-bold">{w.worker.name}</span>
                    <FatigueReasons alerts={w.fatigue} />
                  </Link>
                </li>
              ))}
              {atRisk.map((w) => (
                <li key={`r-${w.worker.id}`}>
                  <Link href="/a/people" className={rowClass}>
                    <Badge tone={riskTone(w.risk.score)}>{t("riskScore", { score: w.risk.score })}</Badge>
                    <span className="font-bold">{w.worker.name}</span>
                    <RiskReasons risk={w.risk} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="ai-panel" className="sheet flex flex-col gap-2 rounded-worker p-4 md:p-5">
          <h2 id="ai-panel" className="font-display flex items-center gap-2 text-xl font-extrabold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Cpu aria-hidden="true" className="size-5" />
            </span>
            {t("ai.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("ai.intro")}</p>
          {aiCalls.length === 0 ? (
            <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{t("ai.none")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1.5 font-semibold">{t("ai.feature")}</th>
                    <th className="py-1.5 font-semibold">{t("ai.model")}</th>
                    <th className="py-1.5 font-semibold">{t("ai.latency")}</th>
                    <th className="py-1.5 font-semibold">{t("ai.fallback")}</th>
                  </tr>
                </thead>
                <tbody>
                  {aiCalls.map((call, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5">{call.feature}</td>
                      <td className="py-1.5 font-mono">{call.model}</td>
                      <td className="figure py-1.5">{call.latencyMs} ms</td>
                      <td className="py-1.5">{call.fallbackUsed ? t("ai.yes") : t("ai.no")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("charts.attendance")}
          unit={t("charts.workersUnit")}
          tableLabel={t("charts.attendance")}
          data={snapshot.attendanceByDay.map((d) => ({ label: shortDay(d.day), value: d.present }))}
        />
        <BarChartCard
          title={t("charts.overtime")}
          unit={t("charts.hoursUnit")}
          tableLabel={t("charts.overtime")}
          data={snapshot.overtimeByWeek.map((w) => ({ label: w.week.slice(5), value: w.hours }))}
        />
      </div>
    </div>
  );
}
