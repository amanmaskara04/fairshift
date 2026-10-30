import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Activity, BatteryLow, CheckCircle2, Clock, Cpu, FileText, Megaphone, Scale, Smile, Siren, TriangleAlert } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot, shortDay } from "@/server/services/workforce";
import { isActiveDispute } from "@/server/services/disputes";
import { issuesForAdmin } from "@/server/services/issues";
import { recentAiCalls } from "@/ai/log";
import { hasGemini } from "@/ai/client";
import { ESCALATION_CHAINS } from "@/config/hazard-sla";
import { isOpen } from "@/core/hazard-lifecycle";
import { formatDuration, formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader, todayLabel } from "@/components/page-header";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardAge } from "@/components/hazard-status";
import { BarChartCard } from "@/components/admin/bar-chart-card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";
import { WelcomeMoment } from "@/components/welcome/welcome";
import { dayPart, istHour } from "@/lib/day-part";

const RISK_ATTENTION = 40;
const URGENT = new Set(["critical", "high"]);

export default async function AdminOverview({ searchParams }: PageProps<"/a">) {
  const session = await requireRole("admin");
  const [t, tr, locale, params] = await Promise.all([getTranslations("admin"), getTranslations("report"), getLocale(), searchParams]);
  const repos = getRepos();
  const now = new Date();
  const [snapshot, admin, disputes, issues, certificates, aiCalls] = await Promise.all([
    buildOrgSnapshot(repos, session.orgId, now),
    repos.admins.getById(session.uid),
    repos.payDisputes.getByOrg(session.orgId),
    issuesForAdmin(repos, session.orgId),
    repos.certificates.getByOrg(session.orgId),
    recentAiCalls(5),
  ]);
  if (!snapshot) return null;
  const { workers, hazards, feedback } = snapshot;
  const nameOf = new Map(workers.map((w) => [w.worker.id, w.worker.name]));
  const chain = ESCALATION_CHAINS[snapshot.org.sector];

  const open = hazards.filter(isOpen);
  // Escalated first (highest level, then oldest), then other urgent ones.
  const escalated = open.filter((h) => h.escalationLevel > 0).sort((a, b) => b.escalationLevel - a.escalationLevel || a.createdAt.getTime() - b.createdAt.getTime());
  const urgent = open.filter((h) => h.escalationLevel === 0 && URGENT.has(h.severity));
  const openDisputes = disputes.filter(isActiveDispute);
  const raisedIssues = issues.filter((i) => i.status === "escalated");
  const pendingCertificates = certificates.filter((c) => c.status === "requested");
  const tired = workers.filter((w) => w.fatigue.length > 0);
  const atRisk = workers.filter((w) => w.risk.score >= RISK_ATTENTION);
  const attentionCount = escalated.length + urgent.length + openDisputes.length + raisedIssues.length + pendingCertificates.length + tired.length + atRisk.length;

  const onSite = workers.filter((w) => w.onSite).length;
  const overtimeMin = workers.reduce((sum, w) => sum + w.overtimeThisWeek, 0);
  const firstName = admin?.name.replace(/^Dr\.\s*/, "").split(" ")[0] ?? "";
  const part = dayPart(istHour(now));
  const greeting = t(`welcome.${part}`, { name: firstName });

  const kpis = [
    { label: t("overtimeThisWeek"), value: formatDuration(overtimeMin), detail: t("acrossTeam"), Icon: Clock },
    { label: t("openHazards"), value: String(open.length), detail: t("escalatedCount", { count: escalated.length }), Icon: TriangleAlert, alert: escalated.length > 0 },
    {
      label: t("feedbackMood"),
      value: snapshot.moodAverage === null ? "—" : `${snapshot.moodAverage.toFixed(1)} / 3`,
      detail: t("responses", { count: feedback.length }),
      Icon: Smile,
    },
    { label: t("atRiskWorkers"), value: String(tired.length), detail: t("fatigueRulesBroken"), Icon: Activity },
  ];

  const rowClass = "flex flex-wrap items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2";

  return (
    <WelcomeMoment active={params.welcome === "1"} variant="admin" part={part} greeting={greeting} line={t("welcome.attention", { count: attentionCount })}>
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow={todayLabel(locale)} title={t("overview")} />

        <ul className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          <li className="col-span-2 lg:col-span-1 lg:row-span-2 xl:row-span-1">
            <div className="hero-card flex h-full min-h-40 flex-col justify-between gap-4 p-5">
              <span className="eyebrow flex items-center gap-2 text-primary-strong">
                <span className="live-dot" aria-hidden="true" />
                {t("onSiteNow")}
              </span>
              <div>
                <span className="figure font-display block text-6xl leading-none font-extrabold text-primary-strong">{onSite}</span>
                <span className="mt-2 block text-sm text-ink-2">{t("ofWorkers", { count: workers.length })}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
                <div className="meter-fill h-full rounded-full bg-primary" style={{ width: `${workers.length ? (onSite / workers.length) * 100 : 0}%` }} />
              </div>
            </div>
          </li>
          {kpis.map(({ label, value, detail, Icon, alert }) => (
            <li key={label}>
              <div className="card flex h-full flex-col justify-between gap-3 p-4">
                <span className="flex items-start justify-between gap-2">
                  <span className="eyebrow">{label}</span>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", alert ? "bg-danger text-white" : "bg-surface-2 text-ink")}>
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </span>
                <span>
                  <span className="figure block text-3xl leading-tight font-bold sm:text-4xl">{value}</span>
                  <span className="text-sm text-ink-2">{detail}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <section aria-labelledby="attention" className="card flex flex-col gap-2 p-4 md:p-5">
            <h2 id="attention" className="font-display flex items-center justify-between gap-2 px-1 text-xl font-extrabold">
              {t("needsAttention")}
              <Badge tone={attentionCount ? "danger" : "success"}>{attentionCount}</Badge>
            </h2>
            {attentionCount === 0 ? (
              <p className="flex items-center gap-2 px-1 text-ink-2">
                <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
                {t("allClear")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {[...escalated, ...urgent].map((h) => (
                  <li key={h.id}>
                    <Link href={`/a/hazards#${h.id}`} className={rowClass}>
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", h.escalationLevel ? "bg-danger text-white" : "bg-danger-soft text-danger")}>
                        <HazardIcon category={h.category} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{tr(`categories.${h.category}`)}</span>
                        <span className="block truncate text-sm text-ink-2">{h.reports[0]?.transcriptEn || h.reports[0]?.transcript}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {h.escalationLevel > 0 && (
                            <Badge tone="solidDanger">
                              <Siren aria-hidden="true" className="size-4" />
                              {t("escalatedTo", { role: tr(`roles.${chain[Math.min(h.escalationLevel, chain.length) - 1]}`) })}
                            </Badge>
                          )}
                          <HazardAge hazard={h} now={now} />
                          <Badge tone="danger">{tr(`severity.${h.severity}`)}</Badge>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {openDisputes.map((d) => (
                  <li key={d.id}>
                    <Link href="/a/payroll#disputes" className={rowClass}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-warning-ink">
                        <Scale aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1 font-bold">{t("attention.dispute", { name: nameOf.get(d.workerId) ?? "", amount: formatRupees(d.shortfall) })}</span>
                      <Badge tone="warning">{t(`disputeStatus.${d.status}`)}</Badge>
                    </Link>
                  </li>
                ))}
                {raisedIssues.map((issue) => (
                  <li key={issue.id}>
                    <Link href="/a/feedback#issues" className={rowClass}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-[#2558b5]">
                        <Megaphone aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{issue.text}</span>
                        <span className="block text-sm text-ink-2">{t("attention.issue", { count: issue.signerCount })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {pendingCertificates.map((c) => (
                  <li key={c.id}>
                    <Link href="/a/people#certificates" className={rowClass}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                        <FileText aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1 font-bold">{t("attention.certificate", { name: nameOf.get(c.workerId) ?? "", days: c.daysWorked })}</span>
                    </Link>
                  </li>
                ))}
                {tired.map((w) => (
                  <li key={`f-${w.worker.id}`}>
                    <Link href="/a/people" className={rowClass}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-ink">
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

          <section aria-labelledby="ai-panel" className="card flex flex-col gap-2 p-4 md:p-5">
            <h2 id="ai-panel" className="font-display flex items-center gap-2 text-xl font-extrabold">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                <Cpu aria-hidden="true" className="size-5" />
              </span>
              {t("ai.title")}
            </h2>
            <p className="text-sm text-ink-2">{t("ai.intro")}</p>
            <p className={cn("w-fit rounded-full px-3 py-1 text-sm font-bold", hasGemini() ? "bg-success-soft text-success" : "bg-warning-soft text-warning-ink")}>
              {hasGemini() ? t("ai.configured") : t("ai.missingKey")}
            </p>
            {aiCalls.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-2">{t("ai.none")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-ink-2">
                    <tr>
                      <th className="py-1.5 font-semibold">{t("ai.feature")}</th>
                      <th className="py-1.5 font-semibold">{t("ai.model")}</th>
                      <th className="py-1.5 font-semibold">{t("ai.latency")}</th>
                      <th className="py-1.5 font-semibold">{t("ai.result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiCalls.map((call, i) => (
                      <tr key={i} className="border-t border-line align-top">
                        <td className="py-1.5">{t(`ai.features.${call.feature}`)}</td>
                        <td className="py-1.5 font-mono text-xs">{call.model}</td>
                        <td className="figure py-1.5">{call.latencyMs} ms</td>
                        <td className="py-1.5">{call.error ? <span className="text-danger">{t("ai.failed")}</span> : call.fallbackUsed ? t("ai.fallback") : t("ai.ok")}</td>
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
    </WelcomeMoment>
  );
}
