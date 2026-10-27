import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Activity, BatteryLow, Clock, Cpu, Smile, TriangleAlert, Users } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot, shortDay } from "@/server/services/workforce";
import { recentAiCalls } from "@/ai/log";
import { formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HazardIcon } from "@/components/hazard-icon";
import { BarChartCard } from "@/components/admin/bar-chart-card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";

const RISK_ATTENTION = 40;

export default async function AdminOverview() {
  const session = await requireRole("admin");
  const [t, tr] = await Promise.all([getTranslations("admin"), getTranslations("report")]);
  const snapshot = await buildOrgSnapshot(getRepos(), session.orgId, new Date());
  if (!snapshot) return null;
  const { workers, hazards, feedback } = snapshot;

  const openHazards = hazards.filter((h) => h.status === "received" || h.status === "in_progress");
  const urgentHazards = openHazards.filter((h) => h.severity === "critical" || h.severity === "high");
  const tired = workers.filter((w) => w.fatigue.length > 0);
  const atRisk = workers.filter((w) => w.risk.score >= RISK_ATTENTION);
  const overtimeMin = workers.reduce((sum, w) => sum + w.overtimeThisWeek, 0);
  const aiCalls = recentAiCalls().slice(0, 5);

  const kpis = [
    { label: t("onSiteNow"), value: String(workers.filter((w) => w.onSite).length), detail: t("ofWorkers", { count: workers.length }), Icon: Users },
    { label: t("overtimeThisWeek"), value: formatDuration(overtimeMin), detail: t("acrossTeam"), Icon: Clock },
    { label: t("openHazards"), value: String(openHazards.length), detail: t("urgentCount", { count: urgentHazards.length }), Icon: TriangleAlert },
    {
      label: t("feedbackMood"),
      value: snapshot.moodAverage === null ? "—" : `${snapshot.moodAverage.toFixed(1)} / 3`,
      detail: t("responses", { count: feedback.length }),
      Icon: Smile,
    },
    { label: t("atRiskWorkers"), value: String(tired.length), detail: t("fatigueRulesBroken"), Icon: Activity },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{t("overview")}</h1>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(({ label, value, detail, Icon }) => (
          <li key={label}>
            <Card className="h-full rounded-admin border-t-4 border-t-accent">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium">{label}</span>
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <p className="font-display figure mt-2 text-4xl font-extrabold">{value}</p>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </Card>
          </li>
        ))}
      </ul>

      <section aria-labelledby="attention" className="flex flex-col gap-3">
        <h2 id="attention" className="text-xl font-bold">
          {t("needsAttention")}
        </h2>
        {urgentHazards.length + tired.length + atRisk.length === 0 ? (
          <p className="text-muted-foreground">{t("allClear")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {urgentHazards.map((h) => (
              <li key={h.id}>
                <Link href="/a/hazards" className="block">
                  <Card className="flex items-center gap-3 rounded-admin hover:border-brand">
                    <HazardIcon category={h.category} className="size-6 shrink-0 text-danger" />
                    <span className="flex-1 font-semibold">{tr(`categories.${h.category}`)}</span>
                    <span className="hidden text-muted-foreground sm:inline">{h.transcriptEn || h.transcript}</span>
                    <Badge tone="danger">{tr(`severity.${h.severity}`)}</Badge>
                  </Card>
                </Link>
              </li>
            ))}
            {tired.map((w) => (
              <li key={`f-${w.worker.id}`}>
                <Link href="/a/people" className="block">
                  <Card className="flex flex-wrap items-center gap-3 rounded-admin hover:border-brand">
                    <BatteryLow aria-hidden="true" className="size-6 shrink-0 text-warning" />
                    <span className="font-semibold">{w.worker.name}</span>
                    <FatigueReasons alerts={w.fatigue} />
                  </Card>
                </Link>
              </li>
            ))}
            {atRisk.map((w) => (
              <li key={`r-${w.worker.id}`}>
                <Link href="/a/people" className="block">
                  <Card className="flex flex-wrap items-center gap-3 rounded-admin hover:border-brand">
                    <Badge tone={riskTone(w.risk.score)}>{t("riskScore", { score: w.risk.score })}</Badge>
                    <span className="font-semibold">{w.worker.name}</span>
                    <RiskReasons risk={w.risk} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <section aria-labelledby="ai-panel">
        <Card className="rounded-admin">
          <h2 id="ai-panel" className="mb-2 flex items-center gap-2 font-bold">
            <Cpu aria-hidden="true" className="size-5" />
            {t("ai.title")}
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">{t("ai.intro")}</p>
          {aiCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ai.none")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">{t("ai.feature")}</th>
                  <th className="py-1 font-medium">{t("ai.model")}</th>
                  <th className="py-1 font-medium">{t("ai.latency")}</th>
                  <th className="py-1 font-medium">{t("ai.fallback")}</th>
                </tr>
              </thead>
              <tbody>
                {aiCalls.map((call, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1">{call.feature}</td>
                    <td className="py-1 font-mono">{call.model}</td>
                    <td className="py-1">{call.latencyMs} ms</td>
                    <td className="py-1">{call.fallbackUsed ? t("ai.yes") : t("ai.no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
