import { attendanceRuleMet, checkEligibility, windowStart, type AttendanceDay, type SchemeEligibility } from "@/core/eligibility";
import { minutesByDay } from "@/core/overtime";
import { monthlyWage } from "@/core/pay";
import { getISTDay } from "@/core/time";
import type { ClosedShift } from "@/core/types";
import { getScheme, SCHEMES } from "@/config/schemes";
import type { CertificateRequest, Repos, Worker } from "@/server/repos/types";

/** Every IST day worked, with the sector of the site it was worked at. */
async function attendanceDays(repos: Repos, shifts: ClosedShift[]): Promise<AttendanceDay[]> {
  const sectorOf = new Map((await repos.sites.getAll()).map((s) => [s.id, s.sector]));
  const days: AttendanceDay[] = [];
  for (const shift of shifts) {
    const sector = sectorOf.get(shift.siteId);
    if (sector) for (const day of minutesByDay([shift]).keys()) days.push({ day, sector });
  }
  return days;
}

export interface BenefitsView {
  results: SchemeEligibility[];
  certificates: CertificateRequest[];
}

/** Day-based eligibility for one worker; yes/no conditions are answered on the worker's own device. */
export async function benefitsFor(repos: Repos, workerId: string, now: Date): Promise<BenefitsView | null> {
  const worker = await repos.workers.getById(workerId);
  const org = worker ? await repos.orgs.getById(worker.orgId) : undefined;
  if (!worker || !org) return null;
  const [shifts, certificates] = await Promise.all([repos.shifts.getByWorker(workerId), repos.certificates.getByWorker(workerId)]);
  const closed = shifts.filter((s): s is ClosedShift => Boolean(s.outAt));
  const results = checkEligibility(
    { sector: org.sector, monthlyWage: monthlyWage(worker.pay, org.labourRules) },
    await attendanceDays(repos, closed),
    SCHEMES,
    now,
  );
  return { results, certificates };
}

export type CertificateError = "not_eligible" | "already_requested" | "not_found" | "not_pending";

/** The worker asks the employer to certify their days (e.g. the BOCW board's 90-day certificate). */
export async function requestCertificate(
  repos: Repos,
  input: { workerId: string; schemeId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: CertificateError }> {
  const scheme = getScheme(input.schemeId);
  const view = await benefitsFor(repos, input.workerId, input.now);
  const result = view?.results.find((r) => r.schemeId === input.schemeId);
  if (!scheme?.needsWorkCertificate || !view || !result || !attendanceRuleMet(result)) return { ok: false, error: "not_eligible" };
  if (view.certificates.some((c) => c.schemeId === input.schemeId && c.status !== "rejected")) return { ok: false, error: "already_requested" };

  const worker = (await repos.workers.getById(input.workerId))!;
  const shifts = (await repos.shifts.getByWorker(worker.id)).filter((s): s is ClosedShift => Boolean(s.outAt));
  const from = windowStart(input.now, scheme.rule.windowMonths);
  const days = (await attendanceDays(repos, shifts))
    .filter((d) => d.day >= from && (scheme.rule.workType !== "building" || d.sector === "construction"))
    .map((d) => d.day);
  const unique = [...new Set(days)].sort();
  await repos.certificates.create({
    id: `cert-${crypto.randomUUID()}`,
    orgId: worker.orgId,
    workerId: worker.id,
    schemeId: input.schemeId,
    status: "requested",
    daysWorked: unique.length,
    from: unique[0],
    to: unique[unique.length - 1] ?? getISTDay(input.now),
    requestedAt: input.now,
  });
  return { ok: true };
}

export async function decideCertificate(
  repos: Repos,
  input: { id: string; orgId: string; adminId: string; approve: boolean; now: Date },
): Promise<{ ok: true } | { ok: false; error: CertificateError }> {
  const request = await repos.certificates.getById(input.id);
  if (!request || request.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (request.status !== "requested") return { ok: false, error: "not_pending" };
  await repos.certificates.update(request.id, { status: input.approve ? "approved" : "rejected", decidedAt: input.now, decidedBy: input.adminId });
  return { ok: true };
}

/** A worker counts as "close" from this share of the days needed. */
export const CLOSE_TO_ELIGIBLE_SHARE = 2 / 3;

export interface EligibilityRow {
  worker: Worker;
  schemeId: string;
  progress: { done: number; needed: number };
  request?: CertificateRequest;
}

/** For the admin People page: who has (nearly) met a certificate scheme's days, and their requests. */
export async function certificateCandidates(repos: Repos, orgId: string, now: Date): Promise<EligibilityRow[]> {
  const [workers, requests] = await Promise.all([repos.workers.getByOrg(orgId), repos.certificates.getByOrg(orgId)]);
  const rows: EligibilityRow[] = [];
  const views = await Promise.all(workers.map((w) => benefitsFor(repos, w.id, now)));
  for (const [i, worker] of workers.entries()) {
    for (const result of views[i]?.results ?? []) {
      if (!getScheme(result.schemeId)?.needsWorkCertificate) continue;
      if (result.progress.done < result.progress.needed * CLOSE_TO_ELIGIBLE_SHARE) continue;
      const request = requests.find((r) => r.workerId === worker.id && r.schemeId === result.schemeId);
      rows.push({ worker, schemeId: result.schemeId, progress: result.progress, request });
    }
  }
  // Pending requests first, then the closest to eligible.
  return rows.sort(
    (a, b) =>
      Number(b.request?.status === "requested") - Number(a.request?.status === "requested") ||
      b.progress.done - a.progress.done,
  );
}
