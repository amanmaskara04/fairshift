/** BCP-47 tags used to pick a device voice for each app locale. */
export const SPEECH_LANG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
};

/** True when the device has a speech voice for the locale. */
export function hasVoiceFor(locale: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const tag = SPEECH_LANG[locale] ?? locale;
  return window.speechSynthesis.getVoices().some((v) => v.lang.replace("_", "-").startsWith(tag.slice(0, 2)));
}

/**
 * Speak text with the device voice. Returns false when speech is unavailable
 * so callers can fall back to server TTS (added in a later task).
 */
export function speak(text: string, locale: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG[locale] ?? locale;
  utterance.rate = 0.9;
  const tag = utterance.lang.slice(0, 2);
  const voice = synth.getVoices().find((v) => v.lang.startsWith(tag));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
  return true;
}
