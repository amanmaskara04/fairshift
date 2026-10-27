import { getTranslations } from "next-intl/server";
import { Activity, Clock, Smile, TriangleAlert, Users } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { computeOvertime } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { getISTWeekBucket } from "@/core/time";
import { getSectorProfile } from "@/core/sectors";
import type { ClosedShift } from "@/core/types";
import { formatDuration } from "@/lib/format";
import { Card } from "@/components/ui/card";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export default async function AdminOverview() {
  const session = await requireRole("admin");
  const t = await getTranslations("admin");
  const repos = getRepos();
  const [org, workers, hazards, feedback] = await Promise.all([
    repos.orgs.getById(session.orgId),
    repos.workers.getByOrg(session.orgId),
    repos.hazards.getByOrg(session.orgId),
    repos.feedback.getByOrg(session.orgId),
  ]);
  if (!org) return null;

  const now = new Date();
  const thisWeek = getISTWeekBucket(now);
  const profile = getSectorProfile(org.sector);

  let onSite = 0;
  let overtimeMin = 0;
  let atRisk = 0;
  for (const worker of workers) {
    const shifts = await repos.shifts.getByWorker(worker.id);
    if (shifts.some((s) => !s.outAt)) onSite++;
    const closed = shifts.filter((s): s is ClosedShift => Boolean(s.outAt));
    overtimeMin += computeOvertime(closed.filter((s) => getISTWeekBucket(s.inAt) === thisWeek), org.labourRules).overtimeMin;
    const recent = closed.filter((s) => now.getTime() - s.inAt.getTime() <= FOURTEEN_DAYS_MS);
    if (checkFatigue(recent, profile.fatigueRules, now).length > 0) atRisk++;
  }

  const openHazards = hazards.filter((h) => h.status === "received" || h.status === "in_progress");
  const urgent = openHazards.filter((h) => h.severity === "critical" || h.severity === "high").length;
  const scores = feedback.flatMap((f) => [f.scores.pay, f.scores.safety, f.scores.respect]);
  const mood = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const kpis = [
    { label: t("onSiteNow"), value: String(onSite), detail: t("ofWorkers", { count: workers.length }), Icon: Users },
    { label: t("overtimeThisWeek"), value: formatDuration(overtimeMin), detail: thisWeek, Icon: Clock },
    { label: t("openHazards"), value: String(openHazards.length), detail: t("urgentCount", { count: urgent }), Icon: TriangleAlert },
    { label: t("feedbackMood"), value: mood ? `${mood.toFixed(1)} / 3` : "—", detail: t("responses", { count: feedback.length }), Icon: Smile },
    { label: t("atRiskWorkers"), value: String(atRisk), detail: t("fatigueRulesBroken"), Icon: Activity },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("overview")}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(({ label, value, detail, Icon }) => (
          <li key={label}>
            <Card className="rounded-admin">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium">{label}</span>
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <p className="mt-2 text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
