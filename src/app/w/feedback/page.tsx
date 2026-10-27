import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { feedbackHmacSecret } from "@/server/secrets";
import { hasAnsweredThisWeek } from "@/server/services/feedback";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";
import { FeedbackForm } from "@/components/worker/feedback-form";

export default async function FeedbackPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("feedback");
  const answered = await hasAnsweredThisWeek(getRepos(), session.uid, new Date(), feedbackHmacSecret());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <SpeakButton text={`${t("title")}. ${t("anonymous")}`} />
      </div>
      <p className="flex items-center gap-2 rounded-worker bg-brand-soft p-3 font-semibold text-brand-soft-foreground">
        <Lock aria-hidden="true" className="size-5 shrink-0" />
        {t("anonymous")}
      </p>
      {answered ? (
        <Card className="flex flex-col items-center gap-2 text-center">
          <SuccessCheck className="size-16" />
          <p className="text-xl font-bold">{t("alreadyAnswered")}</p>
        </Card>
      ) : (
        <FeedbackForm />
      )}
    </div>
  );
}
