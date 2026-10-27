import { getTranslations } from "next-intl/server";
import { CloudUpload, QrCode, ScanLine } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { isDemoMode } from "@/server/config";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { CheckinPanel } from "@/components/worker/checkin-panel";

const STEPS = [
  { key: "step1", Icon: QrCode },
  { key: "step2", Icon: ScanLine },
  { key: "step3", Icon: CloudUpload },
] as const;

export default async function CheckinPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("checkin");
  const shifts = await getRepos().shifts.getByWorker(session.uid);
  const checkedIn = shifts.some((s) => !s.outAt);
  const title = checkedIn ? t("checkoutTitle") : t("title");
  const hint = checkedIn ? t("checkoutHint") : t("hint");

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:w-full md:max-w-2xl">
      <PageHeader title={title} action={<SpeakButton text={`${title}. ${hint}`} />}>
        {hint}
      </PageHeader>
      <CheckinPanel checkedIn={checkedIn} demo={isDemoMode()} />

      {!checkedIn && (
        <section aria-labelledby="how-it-works" className="flex flex-col gap-3">
          <h2 id="how-it-works" className="eyebrow rule-label">
            {t("howTitle")}
          </h2>
          <ol className="flex flex-col">
            {STEPS.map(({ key, Icon }, i) => (
              <li key={key} className="flex items-start gap-4 border-b border-border py-3 last:border-0">
                <span className="figure flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm font-semibold">
                  {i + 1}
                </span>
                <span className="flex-1 pt-1">{t(key)}</span>
                <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-brand" />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
