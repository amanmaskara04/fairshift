"use client";

import { Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { speak } from "@/lib/speak";
import { Button } from "@/components/ui/button";

/** Reads `text` aloud in the active locale using the device voice. */
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const t = useTranslations("a11y");
  const locale = useLocale();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={t("speakButton")}
      onClick={() => speak(text, locale)}
    >
      <Volume2 aria-hidden="true" className="size-6" />
    </Button>
  );
}
