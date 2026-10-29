"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Check, Lock, MapPin, Mic, Pencil, Square, Users } from "lucide-react";
import { checkDuplicateAction, submitHazardAction } from "@/server/actions/hazards";
import { compressImage } from "@/lib/image";
import { createRecognizer, transcriptFrom, type Recognizer } from "@/lib/speech-recognition";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Report steps are local state (pick → confirm → duplicate check → sent): Back never steps through them. */
type Phase = "pick" | "recording" | "analyzing" | "confirm" | "duplicate";

const SEVERITY_TONE = { low: "neutral", medium: "warning", high: "danger", critical: "solidDanger" } as const;

export function HazardReporter({ categories }: { categories: string[] }) {
  const t = useTranslations("report");
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>("pick");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [heard, setHeard] = useState(""); // live transcript while listening, and what was understood
  const [hideName, setHideName] = useState(true);
  const [photo, setPhoto] = useState<string | undefined>();
  const [duplicateCount, setDuplicateCount] = useState(0);
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
        const body = new FormData();
        body.append("audio", new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "report.webm");
        void classify(body);
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
    setError("");
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

  function send(attach: "auto" | "new") {
    if (!suggestion) return;
    startTransition(async () => {
      const result = await submitHazardAction({ ...suggestion, hideName, photo, attach });
      if (result?.error) {
        setPhase("confirm");
        setError(t(result.error === "pick_category" ? "errors.pickCategory" : result.error === "rate_limited" ? "errors.rateLimited" : "errors.general"));
      }
    });
  }

  /** Before sending: if the same danger is already reported here, ask whether to add to it. */
  function submit() {
    if (!suggestion) return;
    startTransition(async () => {
      const duplicate = await checkDuplicateAction({ category: suggestion.category, location: suggestion.locationHint });
      if (duplicate) {
        setDuplicateCount(duplicate.reportCount);
        setPhase("duplicate");
      } else send("auto");
    });
  }

  const errorBox = error && (
    <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-semibold text-danger">
      {error}
    </p>
  );

  if (phase === "duplicate" && suggestion) {
    return (
      <section aria-labelledby="dup-title" className="card rise-in flex flex-col gap-4 p-5" aria-live="polite">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-info-soft text-[#2558b5]">
          <Users aria-hidden="true" className="size-6" />
        </span>
        <h2 id="dup-title" className="font-display text-2xl font-extrabold">
          {t("duplicate.title")}
        </h2>
        <p>{t("duplicate.body", { count: duplicateCount })}</p>
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <Lock aria-hidden="true" className="size-4" />
          {t("duplicate.private")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => send("auto")} disabled={pending} aria-busy={pending || undefined}>
            <Check aria-hidden="true" className="size-5" />
            {t("duplicate.add")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => send("new")} disabled={pending}>
            {t("duplicate.different")}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "confirm" && suggestion) {
    const heardText = suggestion.transcript ? t("weHeard", { text: suggestion.transcript }) : "";
    const label = t(`categories.${suggestion.category}`);
    return (
      <div className="flex flex-col gap-4">
        {errorBox}
        <section className="card rise-in flex flex-col gap-4 p-5" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold">{t("confirmTitle")}</h2>
            <SpeakButton text={`${heardText} ${label}`} />
          </div>
          {heardText && <p className="rounded-2xl bg-surface-2 px-4 py-3 italic">{heardText}</p>}
          <p className="flex flex-wrap items-center gap-3 text-xl font-extrabold">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <HazardIcon category={suggestion.category} className="size-8" />
            </span>
            {label}
            {suggestion.severityHint && <Badge tone={SEVERITY_TONE[suggestion.severityHint]}>{t(`severity.${suggestion.severityHint}`)}</Badge>}
          </p>
          <label className="flex flex-col gap-1.5 font-bold">
            <span className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              {t("whereLabel")}
            </span>
            <Input
              value={suggestion.locationHint ?? ""}
              onChange={(e) => setSuggestion({ ...suggestion, locationHint: e.target.value.slice(0, 120) })}
              placeholder={t("wherePlaceholder")}
              maxLength={120}
              className="font-normal"
            />
          </label>
        </section>

        <label className="tile flex min-h-14 cursor-pointer items-center gap-3 p-3 font-bold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2">
            <Camera aria-hidden="true" className="size-5" />
          </span>
          {photo ? t("photoAdded") : t("addPhoto")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>

        <label className="tile flex min-h-14 cursor-pointer items-center gap-3 p-3 font-bold">
          <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} className="ml-2 size-6 accent-primary" />
          <Lock aria-hidden="true" className="size-5" />
          {t("hideMyName")}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => setPhase("pick")} disabled={pending}>
            <Pencil aria-hidden="true" className="size-5" />
            {t("change")}
          </Button>
          <Button size="lg" onClick={submit} disabled={pending} aria-busy={pending || undefined}>
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
      <div className="hero-card flex flex-col items-center gap-4 px-5 py-8">
        <button
          type="button"
          onClick={phase === "recording" ? stopListening : startListening}
          disabled={phase === "analyzing"}
          aria-label={phase === "recording" ? t("stopRecording") : t("holdToSpeak")}
          aria-pressed={phase === "recording"}
          className={cn(
            "press relative z-0 flex size-28 items-center justify-center rounded-full shadow-[var(--shadow-lift)] transition-transform duration-200 hover:scale-105 disabled:opacity-60",
            phase === "recording" ? "mic-pulse bg-danger text-white" : "bg-primary text-on-primary",
          )}
        >
          {phase === "recording" ? <Square aria-hidden="true" className="size-10" /> : <Mic aria-hidden="true" className="size-12" />}
        </button>
        <p className="text-lg font-bold" aria-live="assertive">
          {phase === "recording" ? t("recording") : phase === "analyzing" ? t("analyzing") : t("tapToSpeak")}
        </p>
        {heard && (
          <p lang={locale} className="max-w-full rounded-2xl bg-white/80 px-4 py-2 text-center italic" aria-live="polite">
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
              className="tile flex min-h-28 w-full flex-col items-center justify-center gap-2 p-2 text-center text-[0.95rem] leading-tight font-bold"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
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
