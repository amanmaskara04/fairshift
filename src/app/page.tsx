import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BarChart3, Clock, HardHat, IndianRupee, Mic, QrCode, ShieldCheck, WifiOff } from "lucide-react";
import { setLocale } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { RevealText } from "@/components/reveal-text";
import { WavesBackground } from "@/components/waves-background";
import { SubmitButton } from "@/components/ui/submit-button";

// Each language is shown in its own script so a reader recognises it instantly.
const LANGUAGES = [
  { code: "en", label: "English", hint: "English" },
  { code: "hi", label: "हिन्दी", hint: "Hindi" },
  { code: "ta", label: "தமிழ்", hint: "Tamil" },
  { code: "te", label: "తెలుగు", hint: "Telugu" },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const promises = [
    { Icon: Clock, text: t("promiseHours") },
    { Icon: IndianRupee, text: t("promisePay") },
    { Icon: ShieldCheck, text: t("promiseVoice") },
  ];
  const steps = [
    { Icon: QrCode, text: t("how1") },
    { Icon: IndianRupee, text: t("how2") },
    { Icon: Mic, text: t("how3") },
  ];
  const chips = [
    { Icon: WifiOff, text: t("chipOffline") },
    { Icon: Mic, text: t("chipVoice") },
    { Icon: ShieldCheck, text: t("chipPrivate") },
  ];

  return (
    <main id="main" className="worker flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-5 md:px-8">
        <BrandMark className="text-2xl" />
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold tracking-wide uppercase">{t("sdg")}</span>
      </div>

      {/* Hero: the promise on the left, the one thing to do (pick a language) on the right. */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 pt-8 pb-12 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-14 md:px-8 md:pt-14 md:pb-20">
        <section className="flex flex-col gap-7">
          <h1 className="font-display text-[2.75rem] leading-[0.98] font-extrabold md:text-[5.2rem]">
            <RevealText text={t("subtitle")} />
            <span className="grow-box" aria-hidden="true">
              <HardHat className="size-[0.55em]" />
            </span>
          </h1>
          <ul className="stagger flex flex-col gap-3">
            {promises.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="pt-1 leading-snug">{text}</span>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2">
            {chips.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-bold">
                <Icon aria-hidden="true" className="size-4" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="choose-language" className="slab rise-in rounded-[28px] p-5 md:p-8">
          <div className="pointer-events-none absolute inset-0 -z-10 text-accent opacity-[0.16]" aria-hidden="true">
            <WavesBackground />
          </div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            FairShift
          </p>
          <h2 id="choose-language" className="font-display mb-1 text-3xl font-extrabold md:text-4xl">
            {t("chooseLanguage")}
          </h2>
          <p className="mb-6 text-slab-muted">{t("languageHint")}</p>
          <form action={setLocale} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="next" value="/login" />
            {LANGUAGES.map((lang) => {
              const active = locale === lang.code;
              return (
                <SubmitButton
                  unstyled
                  key={lang.code}
                  name="locale"
                  value={lang.code}
                  lang={lang.code}
                  aria-pressed={active}
                  className={cn(
                    "group flex min-h-28 flex-col items-start justify-between rounded-2xl border p-4 text-left transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-slab-line bg-[rgb(243_242_236/0.06)] text-slab-foreground hover:border-accent hover:bg-[rgb(243_242_236/0.1)]",
                  )}
                >
                  <span className="text-2xl font-bold md:text-3xl">{lang.label}</span>
                  <span className="flex w-full items-center justify-between text-sm font-bold" lang="en">
                    {lang.hint}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </SubmitButton>
              );
            })}
          </form>
        </section>
      </div>

      <section aria-labelledby="how" className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <h2 id="how" className="font-display mb-8 text-3xl font-extrabold md:text-4xl">
            {t("howTitle")}
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map(({ Icon, text }, i) => (
              <li key={text} className="flex flex-col gap-6 rounded-worker border border-border bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="figure text-5xl font-bold text-brand">0{i + 1}</span>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                </div>
                <p className="text-lg leading-snug font-bold">
                  <span className="sr-only">{t("step", { n: i + 1 })}: </span>
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-12 md:grid-cols-2 md:px-8 md:py-16">
        <div className="slab flex flex-col gap-3 rounded-worker p-7">
          <HardHat aria-hidden="true" className="size-9 text-accent" />
          <h2 className="font-display text-2xl font-extrabold">{t("forWorkersTitle")}</h2>
          <p className="text-slab-muted">{t("forWorkersText")}</p>
        </div>
        <div className="sheet flex flex-col gap-3 rounded-worker p-7">
          <BarChart3 aria-hidden="true" className="size-9 text-brand" />
          <h2 className="font-display text-2xl font-extrabold">{t("forManagersTitle")}</h2>
          <p className="text-muted-foreground">{t("forManagersText")}</p>
        </div>
      </section>

      <footer className="mt-auto border-t border-border px-5 py-6 text-sm text-muted-foreground md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <BrandMark className="text-base" />
          <p>{t("footer")}</p>
        </div>
      </footer>
    </main>
  );
}
