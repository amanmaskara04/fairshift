import { getLocale, getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { setLocale } from "@/server/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const SHORT_LABEL: Record<string, string> = { en: "EN", hi: "हि", ta: "த", te: "తె" };
const ORDER = ["en", "hi", "ta", "te"] as const;

/** Cycles to the next language with one tap — no dropdown to navigate. */
export async function LanguageSwitch() {
  const locale = await getLocale();
  const t = await getTranslations("a11y");
  const next = ORDER[(ORDER.indexOf(locale as (typeof ORDER)[number]) + 1) % ORDER.length];

  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={next} />
      <SubmitButton
        unstyled
        aria-label={t("languageSwitch")}
        className="flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-full px-2 font-bold hover:bg-muted"
      >
        <Languages aria-hidden="true" className="size-5" />
        <span lang={locale}>{SHORT_LABEL[locale]}</span>
      </SubmitButton>
    </form>
  );
}
