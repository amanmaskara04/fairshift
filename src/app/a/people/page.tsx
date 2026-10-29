import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot } from "@/server/services/workforce";
import { formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";
import { PageHeader } from "@/components/page-header";

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
      <PageHeader title={t("title")}>{t("intro")}</PageHeader>

      {/* Phones: one card per worker, every column visible without sideways scrolling. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {snapshot.workers.map((w) => (
          <li key={w.worker.id}>
            <Card className="flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{w.worker.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{siteOf.get(w.worker.siteId)}</p>
                </div>
                <Badge tone={riskTone(w.risk.score)}>
                  {t("risk")} {w.risk.score}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="eyebrow">{t("status")}</dt>
                  <dd>
                    <Badge tone={w.onSite ? "success" : "neutral"}>{w.onSite ? t("onSite") : t("offSite")}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("thisWeek")}</dt>
                  <dd className="figure">
                    {formatDuration(w.weekMinutes)}
                    {w.overtimeThisWeek > 0 && <span className="block text-muted-foreground">{t("overtime", { hours: formatDuration(w.overtimeThisWeek) })}</span>}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-col gap-1">
                <p className="eyebrow">{t("fatigue")}</p>
                <FatigueReasons alerts={w.fatigue} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="eyebrow">{t("risk")}</p>
                <RiskReasons risk={w.risk} />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* Laptops: the full comparison table. */}
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[760px] text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">{t("worker")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("status")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("thisWeek")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("fatigue")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("risk")}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.workers.map((w) => (
              <tr key={w.worker.id} className="border-t border-border align-top transition-colors hover:bg-muted/50">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {w.worker.name}
                  <span className="block text-sm font-normal text-muted-foreground">{siteOf.get(w.worker.siteId)}</span>
                </th>
                <td className="px-4 py-3">
                  <Badge tone={w.onSite ? "success" : "neutral"}>{w.onSite ? t("onSite") : t("offSite")}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDuration(w.weekMinutes)}
                  {w.overtimeThisWeek > 0 && (
                    <span className="block text-sm text-muted-foreground">{t("overtime", { hours: formatDuration(w.overtimeThisWeek) })}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <FatigueReasons alerts={w.fatigue} />
                </td>
                <td className="px-4 py-3">
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
