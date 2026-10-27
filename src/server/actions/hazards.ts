"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { resolveSeverity } from "@/core/hazard-rules";
import { getSectorProfile } from "@/core/sectors";
import type { HazardCategory } from "@/core/types";
import { HAZARD_CATEGORIES, SEVERITIES } from "@/ai/schemas";

const TRACK_COOKIE = "fs_tracked";
const MAX_PHOTO_CHARS = 450_000; // ≈ 330 KB JPEG as a data URL

const SubmitHazard = z.object({
  category: z.enum(HAZARD_CATEGORIES),
  severityHint: z.enum(SEVERITIES).optional(),
  transcript: z.string().max(500).optional(),
  transcriptEn: z.string().max(500).optional(),
  locationHint: z.string().max(120).optional(),
  hideName: z.boolean(),
  photo: z
    .string()
    .max(MAX_PHOTO_CHARS)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});

/** Anonymous reports are remembered only on the reporter's own device (httpOnly cookie), never on the hazard. */
export async function trackedReportIds(): Promise<string[]> {
  const raw = (await cookies()).get(TRACK_COOKIE)?.value ?? "";
  return raw.split(",").filter((id) => /^haz-[0-9a-f-]{36}$/.test(id));
}

async function rememberAnonymousReport(id: string): Promise<void> {
  const ids = [id, ...(await trackedReportIds())].slice(0, 20);
  (await cookies()).set(TRACK_COOKIE, ids.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/w",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function submitHazardAction(input: unknown): Promise<{ error: string } | void> {
  const session = await requireRole("worker");
  const parsed = SubmitHazard.safeParse(input);
  if (!parsed.success || !session.siteId) return { error: "invalid" };
  const repos = getRepos();
  const org = await repos.orgs.getById(session.orgId);
  if (!org) return { error: "invalid" };

  const data = parsed.data;
  const allowed: readonly string[] = getSectorProfile(org.sector).hazardCategories;
  // "other" or a category from another sector must be re-picked from the icon grid.
  if (!allowed.includes(data.category)) return { error: "pick_category" };
  const category = data.category as HazardCategory;
  const now = new Date();
  const id = `haz-${crypto.randomUUID()}`;

  await repos.hazards.create({
    id,
    siteId: session.siteId,
    orgId: session.orgId,
    reporterId: data.hideName ? null : session.uid,
    category,
    severity: resolveSeverity(category, data.severityHint),
    transcript: data.transcript,
    transcriptEn: data.transcriptEn,
    location: data.locationHint,
    photoDataUrl: data.photo,
    status: "received",
    timeline: [{ status: "received", at: now }],
    createdAt: now,
  });
  if (data.hideName) await rememberAnonymousReport(id);
  revalidatePath("/a/hazards");
  revalidatePath("/w/report");
  redirect(`/w/report/${id}?new=1`);
}
