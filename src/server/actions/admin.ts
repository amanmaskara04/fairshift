"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { canTransition } from "@/core/hazard-rules";

const UpdateStatus = z.object({
  hazardId: z.string().max(100),
  status: z.enum(["received", "in_progress", "fixed", "dismissed"]),
});

export async function updateHazardStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");
  const parsed = UpdateStatus.safeParse({ hazardId: formData.get("hazardId"), status: formData.get("status") });
  if (!parsed.success) return;
  const repos = getRepos();
  const hazard = await repos.hazards.getById(parsed.data.hazardId);
  if (!hazard || hazard.orgId !== session.orgId) return;
  if (!canTransition(hazard.status, parsed.data.status)) return;

  await repos.hazards.update(hazard.id, {
    status: parsed.data.status,
    assigneeUid: session.uid,
    timeline: [...hazard.timeline, { status: parsed.data.status, at: new Date(), by: session.uid }],
  });
  revalidatePath("/a/hazards");
  revalidatePath("/a");
  revalidatePath(`/w/report/${hazard.id}`);
}
