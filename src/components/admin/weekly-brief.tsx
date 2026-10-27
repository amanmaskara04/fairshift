"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { weeklyBriefAction } from "@/server/actions/brief";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function WeeklyBrief() {
  const t = useTranslations("admin.brief");
  const [brief, setBrief] = useState<{ points: string[]; source: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col gap-3 rounded-admin border-brand" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Sparkles aria-hidden="true" className="size-5 text-brand" />
          {t("title")}
        </h2>
        <Button size="sm" onClick={() => startTransition(async () => setBrief(await weeklyBriefAction()))} disabled={pending}>
          {pending ? t("working") : brief ? t("refresh") : t("generate")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("privacy")}</p>
      {brief && (
        <>
          <ul className="list-disc pl-5">
            {brief.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Badge className="w-fit">{brief.source === "gemini" ? t("byGemini") : t("byTemplate")}</Badge>
        </>
      )}
    </Card>
  );
}
