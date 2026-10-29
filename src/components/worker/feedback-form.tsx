"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitFeedbackAction } from "@/server/actions/feedback";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";

const QUESTIONS = [
  { key: "pay", label: "question1" },
  { key: "safety", label: "question2" },
  { key: "respect", label: "question3" },
] as const;

const FACES = [
  { value: 1, emoji: "😟", label: "bad" },
  { value: 2, emoji: "😐", label: "okay" },
  { value: 3, emoji: "😀", label: "good" },
] as const;

type Answers = Partial<Record<(typeof QUESTIONS)[number]["key"], number>>;

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const [answers, setAnswers] = useState<Answers>({});
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<"thanks" | "already" | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const complete = QUESTIONS.every((q) => answers[q.key]);

  function submit() {
    startTransition(async () => {
      const response = await submitFeedbackAction({ ...answers, comment: comment || undefined });
      if (response.ok) setResult("thanks");
      else if (response.error === "already_answered") setResult("already");
      else setError(true);
    });
  }

  if (result) {
    const text = t(result === "thanks" ? "thanks" : "alreadyAnswered");
    return (
      <Card className="rise-in flex flex-col items-center gap-3 rounded-[28px] py-8 text-center" aria-live="polite">
        <SuccessCheck className="size-20" />
        <p className="font-display text-2xl font-extrabold">{text}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger p-4 font-semibold text-status-foreground">
          {t("error")}
        </p>
      )}
      {QUESTIONS.map((q, i) => (
        <fieldset key={q.key} className="sheet rounded-worker p-4 pt-3">
          <legend className="sr-only">{t(q.label)}</legend>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p aria-hidden="true" className="flex items-center gap-3 text-lg leading-snug font-extrabold">
              <span className="figure flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">{i + 1}</span>
              {t(q.label)}
            </p>
            <SpeakButton text={t(q.label)} />
          </div>
          <div role="radiogroup" aria-label={t(q.label)} className="grid grid-cols-3 gap-2">
            {FACES.map((face) => {
              const selected = answers[q.key] === face.value;
              return (
                <button
                  key={face.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t(`faces.${face.label}`)}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: face.value }))}
                  className={cn(
                    "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border text-4xl transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 active:scale-95",
                    selected ? "border-ink bg-accent text-accent-foreground" : "border-border bg-background hover:border-ink/50",
                  )}
                >
                  <span aria-hidden="true">{face.emoji}</span>
                  <span className="text-sm font-semibold">{t(`faces.${face.label}`)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <label className="flex flex-col gap-1.5 font-bold">
        {t("addComment")}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-2xl border border-border bg-card p-4 font-normal transition-colors hover:border-ink/40 focus:border-ink"
        />
        <span className="text-sm font-normal text-muted-foreground">{t("commentHint")}</span>
      </label>
      <Button variant="accent" size="lg" onClick={submit} disabled={!complete || pending}>
        {t("submit")}
      </Button>
    </div>
  );
}
