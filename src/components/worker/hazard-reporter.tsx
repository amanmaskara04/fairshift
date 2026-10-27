"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, Lock, Mic, Pencil, Square } from "lucide-react";
import { submitHazardAction } from "@/server/actions/hazards";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HazardIcon } from "@/components/hazard-icon";
import { SpeakButton } from "@/components/speak-button";

const MAX_RECORDING_MS = 30_000;

type Severity = "low" | "medium" | "high" | "critical";
interface Suggestion {
  category: string;
  severityHint?: Severity;
  transcript?: string;
  transcriptEn?: string;
  locationHint?: string;
}

const SEVERITY_TONE = { low: "neutral", medium: "warning", high: "danger", critical: "danger" } as const;

export function HazardReporter({ categories }: { categories: string[] }) {
  const t = useTranslations("report");
  const [phase, setPhase] = useState<"pick" | "recording" | "analyzing" | "confirm">("pick");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [hideName, setHideName] = useState(true);
  const [photo, setPhoto] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        analyze(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      rec.start();
      recorder.current = rec;
      setPhase("recording");
      stopTimer.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      setError(t("errors.mic"));
    }
  }

  function stopRecording() {
    clearTimeout(stopTimer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function analyze(audio: Blob) {
    setPhase("analyzing");
    const body = new FormData();
    body.append("audio", audio, "report.webm");
    try {
      const response = await fetch("/api/voice/hazard", { method: "POST", body });
      const data = response.ok ? await response.json() : { understood: false };
      if (data.understood && categories.includes(data.category)) {
        setSuggestion(data);
        setPhase("confirm");
      } else {
        setError(t("errors.notUnderstood"));
        setPhase("pick");
      }
    } catch {
      setError(t("errors.notUnderstood"));
      setPhase("pick");
    }
  }

  function pickCategory(category: string) {
    setSuggestion({ category });
    setPhase("confirm");
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError(t("errors.photo"));
    }
  }

  function submit() {
    if (!suggestion) return;
    startTransition(async () => {
      const result = await submitHazardAction({ ...suggestion, hideName, photo });
      if (result?.error) setError(t(result.error === "pick_category" ? "errors.pickCategory" : "errors.general"));
    });
  }

  const errorBox = error && (
    <p role="alert" className="rounded-worker bg-danger p-3 font-semibold text-status-foreground">
      {error}
    </p>
  );

  if (phase === "confirm" && suggestion) {
    const heard = suggestion.transcript ? t("weHeard", { text: suggestion.transcript }) : "";
    const label = t(`categories.${suggestion.category}`);
    return (
      <div className="flex flex-col gap-4">
        {errorBox}
        <Card className="rise-in flex flex-col gap-3" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("confirmTitle")}</h2>
            <SpeakButton text={`${heard} ${label}`} />
          </div>
          {heard && <p className="italic">{heard}</p>}
          <p className="flex items-center gap-3 text-xl font-bold">
            <HazardIcon category={suggestion.category} className="size-10 text-brand" />
            {label}
            {suggestion.severityHint && (
              <Badge tone={SEVERITY_TONE[suggestion.severityHint]}>{t(`severity.${suggestion.severityHint}`)}</Badge>
            )}
          </p>
          {suggestion.locationHint && <p className="text-muted-foreground">{suggestion.locationHint}</p>}
        </Card>

        <label className="flex min-h-12 items-center gap-3 rounded-worker border-2 border-border p-3 font-semibold">
          <Camera aria-hidden="true" className="size-6" />
          {photo ? t("photoAdded") : t("addPhoto")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-worker border-2 border-border p-3 font-semibold">
          <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} className="size-6 accent-brand" />
          <Lock aria-hidden="true" className="size-5" />
          {t("hideMyName")}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => setPhase("pick")} disabled={pending}>
            <Pencil aria-hidden="true" className="size-5" />
            {t("change")}
          </Button>
          <Button size="lg" onClick={submit} disabled={pending}>
            <Check aria-hidden="true" className="size-6" />
            {t("send")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {errorBox}
      <div className="flex flex-col items-center gap-2 py-2">
        <button
          type="button"
          onClick={phase === "recording" ? stopRecording : startRecording}
          disabled={phase === "analyzing"}
          aria-label={phase === "recording" ? t("stopRecording") : t("holdToSpeak")}
          aria-pressed={phase === "recording"}
          className={cn(
            "flex size-24 items-center justify-center rounded-full text-status-foreground disabled:opacity-60",
            phase === "recording" ? "mic-pulse bg-danger" : "bg-brand text-brand-foreground",
          )}
        >
          {phase === "recording" ? <Square aria-hidden="true" className="size-10" /> : <Mic aria-hidden="true" className="size-12" />}
        </button>
        <p className="font-semibold" aria-live="assertive">
          {phase === "recording" ? t("recording") : phase === "analyzing" ? t("analyzing") : t("tapToSpeak")}
        </p>
      </div>

      <p className="text-center text-muted-foreground">{t("orTapIcon")}</p>
      <ul className="grid grid-cols-3 gap-2">
        {categories.map((category) => (
          <li key={category}>
            <button
              type="button"
              onClick={() => pickCategory(category)}
              className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-worker border-2 border-border bg-card p-2 text-center font-semibold hover:border-brand"
            >
              <HazardIcon category={category} className="size-8 text-brand" />
              {t(`categories.${category}`)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
