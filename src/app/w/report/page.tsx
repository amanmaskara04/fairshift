import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { trackedReportIds } from "@/server/actions/hazards";
import { getSectorProfile } from "@/core/sectors";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardStatusBadge } from "@/components/hazard-status";
import { HazardReporter } from "@/components/worker/hazard-reporter";

export default async function ReportPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("report");
  const repos = getRepos();
  const [org, hazards, tracked] = await Promise.all([
    repos.orgs.getById(session.orgId),
    repos.hazards.getByOrg(session.orgId),
    trackedReportIds(),
  ]);
  if (!org) return null;

  const mine = hazards
    .filter((h) => h.reporterId === session.uid || tracked.includes(h.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} action={<SpeakButton text={`${t("title")}. ${t("tapToSpeak")}. ${t("orTapIcon")}.`} />} />

      <HazardReporter categories={[...getSectorProfile(org.sector).hazardCategories]} />

      <section aria-labelledby="my-reports" className="flex flex-col gap-2">
        <h2 id="my-reports" className="text-xl font-bold">
          {t("myReports")}
        </h2>
        {mine.length === 0 ? (
          <p className="text-muted-foreground">{t("noReports")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/w/report/${h.id}`}
                  className="print-card flex min-h-16 items-center gap-3 rounded-worker p-3"
                >
                  <HazardIcon category={h.category} className="size-8 shrink-0 text-brand" />
                  <span className="flex-1 font-semibold">{t(`categories.${h.category}`)}</span>
                  <HazardStatusBadge status={h.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
