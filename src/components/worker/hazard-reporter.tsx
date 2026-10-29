"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Check, Lock, Mic, Pencil, Square } from "lucide-react";
import { submitHazardAction } from "@/server/actions/hazards";
import { compressImage } from "@/lib/image";
import { createRecognizer, transcriptFrom, type Recognizer } from "@/lib/speech-recognition";
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
  const locale = useLocale();
  const [phase, setPhase] = useState<"pick" | "recording" | "analyzing" | "confirm">("pick");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [heard, setHeard] = useState(""); // live transcript while listening, and what was understood
  const [hideName, setHideName] = useState(true);
  const [photo, setPhoto] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  const recognizer = useRef<Recognizer | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Preferred path: the phone's own speech recognition in the worker's language (free, live words on
   * screen). Fallback: record audio for Gemini on the server.
   */
  function startListening() {
    setError("");
    setHeard("");
    const rec = createRecognizer(locale);
    if (!rec) {
      void startRecording();
      return;
    }
    let text = "";
    let fellBack = false;
    rec.onresult = (event) => {
      text = transcriptFrom(event.results);
      setHeard(text);
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError(t("errors.mic"));
      } else if (event.error === "network" || event.error === "language-not-supported") {
        // The phone can't recognise this language right now: send audio to the server instead.
        fellBack = true;
        void startRecording();
      }
    };
    rec.onend = () => {
      recognizer.current = null;
      if (fellBack) return;
      if (text) void analyzeText(text);
      else {
        setPhase("pick");
        setError((current) => current || t("errors.noSpeech"));
      }
    };
    recognizer.current = rec;
    rec.start();
    setPhase("recording");
  }

  function stopListening() {
    if (recognizer.current) recognizer.current.stop();
    else stopRecording();
  }

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

  function analyze(audio: Blob) {
    const body = new FormData();
    body.append("audio", audio, "report.webm");
    return classify(body);
  }

  function analyzeText(text: string) {
    const body = new FormData();
    body.append("text", text);
    return classify(body);
  }

  async function classify(body: FormData) {
    setPhase("analyzing");
    body.append("locale", locale);
    try {
      const response = await fetch("/api/voice/hazard", { method: "POST", body });
      const data = response.ok ? await response.json() : { understood: false };
      if (data.understood && categories.includes(data.category)) {
        setSuggestion(data);
        setPhase("confirm");
        return;
      }
      // Words were heard but the type is unclear: keep them and let the worker tap the right icon.
      const text = data.transcript || (body.get("text") as string | null) || "";
      setHeard(text);
      setSuggestion(text ? { category: "", transcript: text, transcriptEn: data.transcriptEn } : null);
      setError(text ? t("errors.pickForHeard") : t("errors.notUnderstood"));
      setPhase("pick");
    } catch {
      setError(t("errors.notUnderstood"));
      setPhase("pick");
    }
  }

  function pickCategory(category: string) {
    // Keep anything the worker already said; only the type comes from the icon.
    setSuggestion((current) => ({ ...current, category }));
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
    <p role="alert" className="rounded-2xl bg-danger p-4 font-semibold text-status-foreground">
      {error}
    </p>
  );

  if (phase === "confirm" && suggestion) {
    const heard = suggestion.transcript ? t("weHeard", { text: suggestion.transcript }) : "";
    const label = t(`categories.${suggestion.category}`);
    return (
      <div className="flex flex-col gap-4">
        {errorBox}
        <Card className="rise-in flex flex-col gap-4 rounded-[28px]" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold">{t("confirmTitle")}</h2>
            <SpeakButton text={`${heard} ${label}`} />
          </div>
          {heard && <p className="rounded-2xl bg-muted px-4 py-3 italic">{heard}</p>}
          <p className="flex flex-wrap items-center gap-3 text-xl font-extrabold">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HazardIcon category={suggestion.category} className="size-8" />
            </span>
            {label}
            {suggestion.severityHint && (
              <Badge tone={SEVERITY_TONE[suggestion.severityHint]}>{t(`severity.${suggestion.severityHint}`)}</Badge>
            )}
          </p>
          {suggestion.locationHint && <p className="text-muted-foreground">{suggestion.locationHint}</p>}
        </Card>

        <label className="tile flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl p-3 font-bold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <Camera aria-hidden="true" className="size-5" />
          </span>
          {photo ? t("photoAdded") : t("addPhoto")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>

        <label className="tile flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl p-3 font-bold">
          <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} className="ml-2 size-6 accent-brand" />
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
      <div className="slab flex flex-col items-center gap-4 rounded-[28px] px-5 py-8">
        <button
          type="button"
          onClick={phase === "recording" ? stopListening : startListening}
          disabled={phase === "analyzing"}
          aria-label={phase === "recording" ? t("stopRecording") : t("holdToSpeak")}
          aria-pressed={phase === "recording"}
          className={cn(
            "flex size-28 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-60",
            phase === "recording" ? "mic-pulse bg-danger text-status-foreground" : "bg-accent text-accent-foreground shadow-[0_0_0_10px_rgb(197_240_106/0.14)]",
          )}
        >
          {phase === "recording" ? <Square aria-hidden="true" className="size-10" /> : <Mic aria-hidden="true" className="size-12" />}
        </button>
        <p className="text-lg font-bold" aria-live="assertive">
          {phase === "recording" ? t("recording") : phase === "analyzing" ? t("analyzing") : t("tapToSpeak")}
        </p>
        {heard && (
          <p lang={locale} className="max-w-full rounded-2xl bg-[rgb(243_242_236/0.1)] px-4 py-2 text-center italic" aria-live="polite">
            “{heard}”
          </p>
        )}
      </div>

      <p className="eyebrow rule-label">{t("orTapIcon")}</p>
      <ul className="stagger grid grid-cols-3 gap-2.5">
        {categories.map((category) => (
          <li key={category}>
            <button
              type="button"
              onClick={() => pickCategory(category)}
              className="tile flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-worker p-2 text-center text-[0.95rem] leading-tight font-bold"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
                <HazardIcon category={category} className="size-7" />
              </span>
              {t(`categories.${category}`)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
