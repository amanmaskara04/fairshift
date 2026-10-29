import { getLocale, getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { setLocale } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/submit-button";

const SHORT_LABEL: Record<string, string> = { en: "EN", hi: "हि", ta: "த", te: "తె" };
const ORDER = ["en", "hi", "ta", "te"] as const;

/** Cycles to the next language with one tap — no dropdown to navigate. */
export async function LanguageSwitch({ tone = "default" }: { tone?: "default" | "slab" }) {
  const locale = await getLocale();
  const t = await getTranslations("a11y");
  const next = ORDER[(ORDER.indexOf(locale as (typeof ORDER)[number]) + 1) % ORDER.length];

  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={next} />
      <SubmitButton
        unstyled
        aria-label={t("languageSwitch")}
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors duration-200",
          tone === "slab"
            ? "border-slab-line text-slab-foreground hover:border-accent"
            : "border-border bg-card text-card-foreground hover:border-ink",
        )}
      >
        <Languages aria-hidden="true" className="size-4" />
        <span lang={locale}>{SHORT_LABEL[locale]}</span>
      </SubmitButton>
    </form>
  );
}
