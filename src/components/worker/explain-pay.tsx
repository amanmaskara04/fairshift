"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle, Sparkles } from "lucide-react";
import { explainPayAction } from "@/server/actions/pay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";

/** "Why this amount?": template sentences first, optional AI rewording on request. */
export function ExplainPay({ month, sentences }: { month: string; sentences: string[] }) {
  const t = useTranslations("pay");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(sentences);
  const [aiTried, setAiTried] = useState(false);
  const [pending, startTransition] = useTransition();

  function explainMore() {
    startTransition(async () => {
      const better = await explainPayAction(month);
      if (better) setLines(better);
      setAiTried(true);
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        <HelpCircle aria-hidden="true" className="size-6" />
        {t("whyThisAmount")}
      </Button>
    );
  }

  return (
    <Card className="rise-in flex flex-col gap-3" aria-live="polite">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("whyThisAmount")}</h2>
        <SpeakButton text={lines.join(" ")} />
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {!aiTried && (
        <Button variant="outline" onClick={explainMore} disabled={pending}>
          <Sparkles aria-hidden="true" className="size-5" />
          {pending ? t("thinking") : t("explainMore")}
        </Button>
      )}
    </Card>
  );
}
