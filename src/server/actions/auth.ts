"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { locales, type Locale } from "@/i18n/request";
import { getRepos } from "@/server/repos";
import { createSession, deleteSession } from "@/server/session";
import { verifySecret } from "@/server/password";
import { loginRateLimiter } from "@/server/rate-limit";
import { isDemoMode } from "@/server/config";

export type LoginState = { error?: "invalid" | "locked" | "general" };

const ONE_YEAR_S = 60 * 60 * 24 * 365;

export async function setLocale(formData: FormData): Promise<void> {
  const parsed = z.enum(locales).safeParse(formData.get("locale"));
  const locale: Locale = parsed.success ? parsed.data : "en";
  const store = await cookies();
  store.set("locale", locale, { path: "/", maxAge: ONE_YEAR_S, sameSite: "lax" });
  const next = formData.get("next");
  if (next === "/login") redirect("/login");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Both the account key and the IP must have attempts left. */
async function allowAttempt(accountKey: string): Promise<boolean> {
  const ip = await clientIp();
  const byAccount = loginRateLimiter.check(`acct:${accountKey}`);
  const byIp = loginRateLimiter.check(`ip:${ip}`);
  return byAccount && byIp;
}

const WorkerLogin = z.object({
  code: z.string().regex(/^\d{4,6}$/),
  pin: z.string().regex(/^\d{4}$/),
});

export async function loginWorker(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = WorkerLogin.safeParse({ code: formData.get("code"), pin: formData.get("pin") });
  if (!parsed.success) return { error: "invalid" };
  if (!(await allowAttempt(`worker:${parsed.data.code}`))) return { error: "locked" };

  const worker = await getRepos().workers.getByCode(parsed.data.code);
  const ok = worker ? await verifySecret(parsed.data.pin, worker.pinHash, worker.pinSalt) : false;
  if (!worker || !ok) return { error: "invalid" };

  await createSession({ uid: worker.id, role: "worker", orgId: worker.orgId, siteId: worker.siteId });
  redirect("/w");
}

const AdminLogin = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = AdminLogin.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalid" };
  const email = parsed.data.email.toLowerCase();
  if (!(await allowAttempt(`admin:${email}`))) return { error: "locked" };

  const admin = await getRepos().admins.getByEmail(email);
  const ok = admin ? await verifySecret(parsed.data.password, admin.passwordHash, admin.passwordSalt) : false;
  if (!admin || !ok) return { error: "invalid" };

  await createSession({ uid: admin.id, role: "admin", orgId: admin.orgId });
  redirect("/a");
}

const DEMO_PERSONAS = {
  ramesh: { kind: "worker", code: "1001" },
  sunita: { kind: "worker", code: "2001" },
  priya: { kind: "admin", email: "priya@buildright.demo" },
  arjun: { kind: "admin", email: "arjun@citycare.demo" },
} as const;

export async function demoLogin(formData: FormData): Promise<void> {
  if (!isDemoMode()) redirect("/login");
  const parsed = z.enum(["ramesh", "sunita", "priya", "arjun"]).safeParse(formData.get("persona"));
  if (!parsed.success) redirect("/login");

  const persona = DEMO_PERSONAS[parsed.data];
  const repos = getRepos();
  if (persona.kind === "worker") {
    const worker = await repos.workers.getByCode(persona.code);
    if (!worker) redirect("/login");
    await createSession({ uid: worker.id, role: "worker", orgId: worker.orgId, siteId: worker.siteId });
    redirect("/w");
  }
  const admin = await repos.admins.getByEmail(persona.email);
  if (!admin) redirect("/login");
  await createSession({ uid: admin.id, role: "admin", orgId: admin.orgId });
  redirect("/a");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
