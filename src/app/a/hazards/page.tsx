import { getTranslations } from "next-intl/server";
import { Lock, MapPin } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { updateHazardStatusAction } from "@/server/actions/admin";
import { nextStatuses } from "@/core/hazard-rules";
import type { HazardSeverity, HazardStatus } from "@/core/types";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardStatusBadge } from "@/components/hazard-status";
import { PageHeader } from "@/components/page-header";

const COLUMNS: HazardStatus[] = ["received", "in_progress", "fixed"];
const SEVERITY_RANK: Record<HazardSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_TONE = { critical: "danger", high: "danger", medium: "warning", low: "neutral" } as const;
const ACTION_KEY: Record<HazardStatus, string> = {
  received: "reopen",
  in_progress: "start",
  fixed: "markFixed",
  dismissed: "dismiss",
};

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function HazardsPage() {
  const session = await requireRole("admin");
  const [t, tr] = await Promise.all([getTranslations("admin.hazardsPage"), getTranslations("report")]);
  const repos = getRepos();
  const [hazards, workers, sites] = await Promise.all([
    repos.hazards.getByOrg(session.orgId),
    repos.workers.getByOrg(session.orgId),
    repos.sites.getByOrg(session.orgId),
  ]);
  const nameOf = new Map(workers.map((w) => [w.id, w.name]));
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));
  const sorted = [...hazards].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")}>{t("intro")}</PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = sorted.filter((h) => h.status === column);
          return (
            <section key={column} aria-labelledby={`col-${column}`} className="flex flex-col gap-3 rounded-worker border border-border bg-muted/60 p-3">
              <h2 id={`col-${column}`} className="flex items-center justify-between font-bold">
                <HazardStatusBadge status={column} />
                <span className="figure flex size-8 items-center justify-center rounded-full bg-card text-sm">{items.length}</span>
              </h2>
              {items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
              <ul className="flex flex-col gap-3">
                {items.map((h) => (
                  <li key={h.id}>
                    <Card className="flex flex-col gap-2.5 rounded-2xl p-4" data-testid="hazard-card">
                      <div className="flex items-center gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <HazardIcon category={h.category} className="size-5" />
                        </span>
                        <span className="flex-1 font-bold">{tr(`categories.${h.category}`)}</span>
                        <Badge tone={SEVERITY_TONE[h.severity]}>{tr(`severity.${h.severity}`)}</Badge>
                      </div>
                      {(h.transcriptEn || h.transcript) && <p className="rounded-xl bg-muted px-3 py-2 text-sm">“{h.transcriptEn || h.transcript}”</p>}
                      {h.photoDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- data URL from the worker's phone
                        <img src={h.photoDataUrl} alt={t("photoAlt")} className="max-h-40 rounded-xl object-cover" />
                      )}
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin aria-hidden="true" className="size-3" />
                          {[siteOf.get(h.siteId), h.location].filter(Boolean).join(" · ")}
                        </span>
                        <span className="flex items-center gap-1">
                          {h.reporterId ? nameOf.get(h.reporterId) : (
                            <>
                              <Lock aria-hidden="true" className="size-3" />
                              {t("anonymous")}
                            </>
                          )}
                        </span>
                        <span>{formatWhen(h.createdAt)}</span>
                      </p>
                      <form action={updateHazardStatusAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="hazardId" value={h.id} />
                        {nextStatuses(h.status).map((next) => (
                          <SubmitButton
                            key={next}
                            name="status"
                            value={next}
                            size="sm"
                            variant={next === "dismissed" ? "ghost" : next === "fixed" ? "primary" : "secondary"}
                          >
                            {t(ACTION_KEY[next])}
                          </SubmitButton>
                        ))}
                      </form>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
