import "server-only";

export interface AiLogEntry {
  feature: "hazard" | "explainPay" | "redact" | "brief";
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
  at: Date;
}

const MAX_ENTRIES = 50;
const store = globalThis as typeof globalThis & { __fairshiftAiLog?: AiLogEntry[] };

/** Records metadata about AI calls for the admin transparency panel. Never stores prompts or outputs. */
export function logAiCall(entry: Omit<AiLogEntry, "at">): void {
  const log = (store.__fairshiftAiLog ??= []);
  log.unshift({ ...entry, at: new Date() });
  log.length = Math.min(log.length, MAX_ENTRIES);
}

export function recentAiCalls(): AiLogEntry[] {
  return [...(store.__fairshiftAiLog ?? [])];
}
