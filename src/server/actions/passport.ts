"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { RateLimiter } from "@/server/rate-limit";
import { passportToken, PASSPORT_TTL_DAYS } from "@/server/passport";

const Share = z.object({ skills: z.boolean(), history: z.boolean(), hours: z.boolean() });
const limiter = new RateLimiter({ maxTokens: 20, refillIntervalMs: 60 * 60 * 1000 });

export interface PassportLink {
  url: string;
  issuedAt: string;
  expiresAt: string;
}

/** A fresh, signed, 30-day passport link showing only the sections the worker chose. */
export async function passportLinkAction(input: unknown): Promise<PassportLink | null> {
  const session = await requireRole("worker");
  const parsed = Share.safeParse(input);
  if (!parsed.success || !limiter.check(session.uid)) return null;
  const now = new Date();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    url: `${protocol}://${host}/passport/${passportToken(session.uid, parsed.data, now)}`,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PASSPORT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}
