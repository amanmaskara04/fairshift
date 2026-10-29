import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { feedbackHmacSecret } from "@/server/secrets";
import { hasAnsweredThisWeek } from "@/server/services/feedback";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { SuccessCheck } from "@/components/success-check";
import { FeedbackForm } from "@/components/worker/feedback-form";

export default async function FeedbackPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("feedback");
  const answered = await hasAnsweredThisWeek(getRepos(), session.uid, new Date(), feedbackHmacSecret());

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader title={t("title")} action={<SpeakButton text={`${t("title")}. ${t("anonymous")}`} />} />
      <p className="slab flex items-center gap-3 rounded-2xl p-4 font-bold">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Lock aria-hidden="true" className="size-5" />
        </span>
        {t("anonymous")}
      </p>
      {answered ? (
        <Card className="flex flex-col items-center gap-3 rounded-[28px] py-8 text-center">
          <SuccessCheck className="size-16" />
          <p className="font-display text-2xl font-extrabold">{t("alreadyAnswered")}</p>
        </Card>
      ) : (
        <FeedbackForm />
      )}
    </div>
  );
}
