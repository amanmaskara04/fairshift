import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { WavesBackground } from "@/components/waves-background";

// Each language is shown in its own script so a reader recognises it instantly.
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  return (
    <main id="main" className="worker relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-0 text-brand opacity-25">
        <WavesBackground />
      </div>
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
        <header className="rise-in rounded-worker bg-background/80 p-4 text-center backdrop-blur-sm">
          <p className="text-4xl font-bold text-brand">{t("title")}</p>
          <h1 className="mt-2 text-xl">{t("subtitle")}</h1>
        </header>

        <section aria-labelledby="choose-language">
          <h2 id="choose-language" className="mb-4 text-center text-lg font-semibold">
            {t("chooseLanguage")}
          </h2>
          <form action={setLocale} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="next" value="/login" />
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="submit"
                name="locale"
                value={lang.code}
                lang={lang.code}
                aria-pressed={locale === lang.code}
                className={cn(
                  buttonVariants({
                    variant: locale === lang.code ? "primary" : "outline",
                    size: "lg",
                  }),
                  "min-h-20 text-2xl",
                )}
              >
                {lang.label}
              </button>
            ))}
          </form>
        </section>
      </div>
    </main>
  );
}
