import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot } from "@/server/services/workforce";
import { formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";

export default async function PeoplePage() {
  const session = await requireRole("admin");
  const t = await getTranslations("admin.peoplePage");
  const repos = getRepos();
  const [snapshot, sites] = await Promise.all([
    buildOrgSnapshot(repos, session.orgId, new Date()),
    repos.sites.getByOrg(session.orgId),
  ]);
  if (!snapshot) return null;
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      <Card className="overflow-x-auto rounded-admin p-0">
        <table className="w-full min-w-[760px] text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="bg-muted text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="p-3 font-medium">{t("worker")}</th>
              <th scope="col" className="p-3 font-medium">{t("status")}</th>
              <th scope="col" className="p-3 font-medium">{t("thisWeek")}</th>
              <th scope="col" className="p-3 font-medium">{t("fatigue")}</th>
              <th scope="col" className="p-3 font-medium">{t("risk")}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.workers.map((w) => (
              <tr key={w.worker.id} className="border-t border-border align-top">
                <th scope="row" className="p-3 font-semibold">
                  {w.worker.name}
                  <span className="block text-sm font-normal text-muted-foreground">{siteOf.get(w.worker.siteId)}</span>
                </th>
                <td className="p-3">
                  <Badge tone={w.onSite ? "success" : "neutral"}>{w.onSite ? t("onSite") : t("offSite")}</Badge>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {formatDuration(w.weekMinutes)}
                  {w.overtimeThisWeek > 0 && (
                    <span className="block text-sm text-muted-foreground">{t("overtime", { hours: formatDuration(w.overtimeThisWeek) })}</span>
                  )}
                </td>
                <td className="p-3">
                  <FatigueReasons alerts={w.fatigue} />
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <Badge tone={riskTone(w.risk.score)} className="w-fit">
                      {w.risk.score} / 100
                    </Badge>
                    <RiskReasons risk={w.risk} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-sm text-muted-foreground">{t("method")}</p>
    </div>
  );
}
