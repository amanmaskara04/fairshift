import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { isDemoMode } from "@/server/config";
import { SpeakButton } from "@/components/speak-button";
import { CheckinPanel } from "@/components/worker/checkin-panel";

export default async function CheckinPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("checkin");
  const shifts = await getRepos().shifts.getByWorker(session.uid);
  const checkedIn = shifts.some((s) => !s.outAt);
  const title = checkedIn ? t("checkoutTitle") : t("title");
  const hint = checkedIn ? t("checkoutHint") : t("hint");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <SpeakButton text={`${title}. ${hint}`} />
      </div>
      <p className="text-muted-foreground">{hint}</p>
      <CheckinPanel checkedIn={checkedIn} demo={isDemoMode()} />
    </div>
  );
}
