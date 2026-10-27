import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Lock } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { trackedReportIds } from "@/server/actions/hazards";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardStatusBadge } from "@/components/hazard-status";

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function ReportDetail({ params, searchParams }: PageProps<"/w/report/[id]">) {
  const session = await requireRole("worker");
  const { id } = await params;
  const isNew = (await searchParams).new === "1";
  const [hazard, tracked] = await Promise.all([getRepos().hazards.getById(id), trackedReportIds()]);
  // Only the reporter (or the device that filed it anonymously) may follow a report.
  if (!hazard || hazard.orgId !== session.orgId || (hazard.reporterId !== session.uid && !tracked.includes(hazard.id))) {
    notFound();
  }
  const t = await getTranslations("report");
  const label = t(`categories.${hazard.category}`);
  const statusText = t(`status.${hazard.status}`);

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-2xl">
      <Link href="/w/report" className="flex min-h-12 items-center gap-2 font-semibold text-brand">
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t("myReports")}
      </Link>

      {isNew && (
        <Card className="flex flex-col items-center gap-2 text-center" aria-live="polite">
          <SuccessCheck className="size-20" />
          <p className="text-xl font-bold">{t("sent")}</p>
          <p>{t("sentHint")}</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <HazardIcon category={hazard.category} className="size-10 text-brand" />
            {label}
          </h1>
          <SpeakButton text={`${label}. ${statusText}.`} />
        </div>
        <HazardStatusBadge status={hazard.status} />
        {hazard.transcript && <p className="italic">“{hazard.transcript}”</p>}
        {hazard.reporterId === null && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="size-4" />
            {t("anonymousNote")}
          </p>
        )}
      </Card>

      <section aria-labelledby="timeline">
        <h2 id="timeline" className="mb-2 text-xl font-bold">
          {t("timeline")}
        </h2>
        <ol className="flex flex-col gap-3 border-l-4 border-brand pl-4">
          {hazard.timeline.map((step, i) => (
            <li key={i}>
              <HazardStatusBadge status={step.status as "received" | "in_progress" | "fixed" | "dismissed"} />
              <p className="text-sm text-muted-foreground">{formatWhen(step.at)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
