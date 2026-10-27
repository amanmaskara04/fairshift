import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Clock, IndianRupee, ShieldCheck } from "lucide-react";
import { setLocale } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { WavesBackground } from "@/components/waves-background";

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

  return (
    <main id="main" className="worker relative flex flex-1 flex-col overflow-hidden">
      <div className="hazard-tape" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] text-brand opacity-30" aria-hidden="true">
        <WavesBackground />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl flex-1 gap-10 px-5 py-8 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-16 md:py-16">
        <section className="rise-in flex flex-col gap-6">
          <BrandMark className="text-2xl" />
          <p className="eyebrow">{t("sdg")}</p>
          <h1 className="font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-tight md:text-7xl">{t("subtitle")}</h1>
          <ul className="flex flex-col gap-3 border-l-4 border-accent pl-4">
            {promises.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-brand" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="choose-language" className="print-card rounded-worker p-5 md:p-7">
          <h2 id="choose-language" className="font-display mb-1 text-2xl font-extrabold">
            {t("chooseLanguage")}
          </h2>
          <p className="mb-5 text-muted-foreground">{t("languageHint")}</p>
          <form action={setLocale} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="next" value="/login" />
            {LANGUAGES.map((lang) => {
              const active = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  type="submit"
                  name="locale"
                  value={lang.code}
                  lang={lang.code}
                  aria-pressed={active}
                  className={cn(
                    "group flex min-h-24 flex-col items-start justify-between rounded-admin border-2 border-ink p-3 text-left transition-colors",
                    active ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  <span className="text-2xl font-bold">{lang.label}</span>
                  <span className="flex w-full items-center justify-between text-sm font-semibold" lang="en">
                    {lang.hint}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              );
            })}
          </form>
        </section>
      </div>

      <footer className="relative border-t border-border bg-background/80 px-5 py-4 text-sm text-muted-foreground">
        <p className="mx-auto max-w-6xl">{t("footer")}</p>
      </footer>
    </main>
  );
}
