import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";

/** Model ids from https://ai.google.dev/gemini-api/docs/models (checked 2026-10-27). */
export const MODELS = {
  fast: "gemini-3.5-flash-lite",
  fallback: "gemini-3.8-flash",
  tts: "gemini-3.8-flash-lite-tts",
} as const;

export const CALL_TIMEOUT_MS = 8_000;

export interface GenerateRequest {
  model: string;
  system: string;
  parts: Part[];
  jsonSchema?: unknown;
  temperature?: number;
}

/** The only surface the app uses, so tests can inject a fake. */
export interface AiClient {
  generateText(request: GenerateRequest): Promise<string>;
}

let client: AiClient | null | undefined;

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getAiClient(): AiClient | null {
  if (client !== undefined) return client;
  if (!hasGemini()) return (client = null);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  client = {
    async generateText({ model, system, parts, jsonSchema, temperature = 0.2 }) {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          temperature,
          abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
        },
      });
      return response.text ?? "";
    },
  };
  return client;
}

/** Test hook. */
export function setAiClient(next: AiClient | null | undefined): void {
  client = next;
}
