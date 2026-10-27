import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env.PASSPORT_SECRET ?? process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("PASSPORT_SECRET environment variable is required in production");
  }
  return "fairshift-dev-passport-secret";
}

function mac(workerId: string): string {
  return createHmac("sha256", secret()).update(`passport|${workerId}`).digest("base64url").slice(0, 22);
}

/** Shareable, unguessable id for a worker's public skill passport. */
export function passportToken(workerId: string): string {
  return `${Buffer.from(workerId).toString("base64url")}.${mac(workerId)}`;
}

export function workerIdFromPassport(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const workerId = Buffer.from(encoded, "base64url").toString();
  const expected = Buffer.from(mac(workerId));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected) ? workerId : null;
}
