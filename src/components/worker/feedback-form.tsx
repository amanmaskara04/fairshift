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
      <Card className="flex flex-col items-center gap-2 text-center" aria-live="polite">
        <SuccessCheck className="size-20" />
        <p className="text-xl font-bold">{text}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-worker bg-danger p-3 font-semibold text-status-foreground">
          {t("error")}
        </p>
      )}
      {QUESTIONS.map((q) => (
        <fieldset key={q.key} className="rounded-worker border-2 border-border p-3">
          <legend className="flex w-full items-center justify-between gap-2 px-1 text-lg font-bold">
            {t(q.label)}
            <SpeakButton text={t(q.label)} />
          </legend>
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
                    "flex min-h-20 flex-col items-center justify-center rounded-worker border-2 text-4xl",
                    selected ? "border-brand bg-brand-soft" : "border-border",
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
      <label className="flex flex-col gap-1 font-semibold">
        {t("addComment")}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-worker border-2 border-border bg-card p-3 font-normal"
        />
        <span className="text-sm font-normal text-muted-foreground">{t("commentHint")}</span>
      </label>
      <Button size="lg" onClick={submit} disabled={!complete || pending}>
        {t("submit")}
      </Button>
    </div>
  );
}
