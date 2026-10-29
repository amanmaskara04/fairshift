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
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-3xl">
      <Link href="/w/report" className="flex min-h-12 w-fit items-center gap-2 rounded-full pr-3 font-bold transition-colors hover:text-muted-foreground">
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t("myReports")}
      </Link>

      {isNew && (
        <Card className="rise-in flex flex-col items-center gap-2 rounded-[28px] py-8 text-center" aria-live="polite">
          <SuccessCheck className="size-20" />
          <p className="font-display text-3xl font-extrabold">{t("sent")}</p>
          <p>{t("sentHint")}</p>
        </Card>
      )}

      <section className="slab flex flex-col gap-4 rounded-[28px] p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display flex items-center gap-3 text-3xl font-extrabold">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HazardIcon category={hazard.category} className="size-8" />
            </span>
            {label}
          </h1>
          <SpeakButton text={`${label}. ${statusText}.`} />
        </div>
        <HazardStatusBadge status={hazard.status} />
        {hazard.transcript && <p className="rounded-2xl bg-[rgb(243_242_236/0.1)] px-4 py-3 italic">“{hazard.transcript}”</p>}
        {hazard.reporterId === null && (
          <p className="flex items-center gap-2 text-sm text-slab-muted">
            <Lock aria-hidden="true" className="size-4" />
            {t("anonymousNote")}
          </p>
        )}
      </section>

      <section aria-labelledby="timeline" className="sheet rounded-worker p-5">
        <h2 id="timeline" className="font-display mb-4 text-2xl font-extrabold">
          {t("timeline")}
        </h2>
        <ol className="relative flex flex-col gap-5 pl-7 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-0.5 before:bg-border">
          {hazard.timeline.map((step, i) => (
            <li key={i} className="relative">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-7 size-5 rounded-full border-4 border-card bg-brand ring-1 ring-border"
              />
              <HazardStatusBadge status={step.status as "received" | "in_progress" | "fixed" | "dismissed"} />
              <p className="figure mt-1 text-sm text-muted-foreground">{formatWhen(step.at)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
