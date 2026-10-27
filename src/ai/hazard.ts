import "server-only";
import type { Sector } from "@/core/types";
import { getAiClient, MODELS, type AiClient } from "./client";
import { hazardJsonSchema, HazardExtraction } from "./schemas";
import { hazardSystemPrompt, untrusted } from "./prompts";
import { classifyByKeywords } from "./fallback";
import { HAZARD_FIXTURES } from "./fixtures/hazard";
import { logAiCall } from "./log";

export interface HazardInput {
  audioBase64?: string;
  audioMimeType?: string;
  text?: string;
  sector: Sector;
  categories: readonly string[];
  /** Demo mode without a key: use recorded fixtures for audio */
  demo?: boolean;
}

export type HazardSource = "gemini" | "gemini-fallback" | "keywords" | "fixture";

export interface HazardOutput extends HazardExtraction {
  source: HazardSource;
}

/**
 * Turn a spoken or typed report into a structured hazard suggestion.
 * Chain: fast model → fallback model → keyword classifier (text) → fixture (demo without key) → null.
 * null means "not understood": the UI falls back to the icon grid.
 * The result is only a suggestion: the worker confirms it, and core/hazard-rules decides severity.
 */
export async function extractHazard(input: HazardInput, client: AiClient | null = getAiClient()): Promise<HazardOutput | null> {
  const allowed = [...input.categories, "other"];

  if (client) {
    const parts = input.audioBase64
      ? [{ text: "Classify the attached audio report." }, { inlineData: { mimeType: input.audioMimeType ?? "audio/webm", data: input.audioBase64 } }]
      : [{ text: untrusted(input.text ?? "") }];

    for (const [index, model] of [MODELS.fast, MODELS.fallback].entries()) {
      const started = Date.now();
      try {
        const raw = await client.generateText({
          model,
          system: hazardSystemPrompt(input.sector, allowed),
          parts,
          jsonSchema: hazardJsonSchema,
        });
        const parsed = HazardExtraction.safeParse(JSON.parse(raw));
        logAiCall({ feature: "hazard", model, latencyMs: Date.now() - started, fallbackUsed: index > 0 });
        if (parsed.success) {
          const category = allowed.includes(parsed.data.category) ? parsed.data.category : "other";
          return { ...parsed.data, category, source: index === 0 ? "gemini" : "gemini-fallback" };
        }
      } catch {
        logAiCall({ feature: "hazard", model, latencyMs: Date.now() - started, fallbackUsed: true });
      }
    }
  }

  if (input.text) {
    return {
      transcript: input.text.slice(0, 500),
      transcriptEn: "",
      category: classifyByKeywords(input.text, input.categories),
      severityHint: "medium",
      locationHint: "",
      source: "keywords",
    };
  }
  // Never invent what a real worker said: fixtures only stand in when demoing without a key.
  if (!client && input.demo) return { ...HAZARD_FIXTURES[input.sector], source: "fixture" };
  return null;
}
