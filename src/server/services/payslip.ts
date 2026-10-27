import { computePayslip } from "@/core/pay";
import { computeDeductions } from "@/core/deductions";
import { monthRange } from "@/core/period";
import { minutesByDay } from "@/core/overtime";
import type { ClosedShift, Payslip } from "@/core/types";
import type { Org, Repos, Worker } from "@/server/repos/types";

export interface PayslipView {
  worker: Worker;
  org: Org;
  payslip: Payslip;
  daysWorked: number;
  totalMinutes: number;
}

/** Payslip for one worker and one IST month. Regular pay first (PF base), then deductions applied. */
export async function buildPayslip(repos: Repos, workerId: string, month: string): Promise<PayslipView | null> {
  const worker = await repos.workers.getById(workerId);
  const org = worker ? await repos.orgs.getById(worker.orgId) : undefined;
  if (!worker || !org) return null;

  const { start, end } = monthRange(month);
  const shifts = (await repos.shifts.getByWorkerInRange(workerId, start, new Date(end.getTime() - 1))).filter(
    (s): s is ClosedShift => Boolean(s.outAt),
  );

  const base = computePayslip(worker.id, month, shifts, worker.pay, org.labourRules);
  const regularPay = base.lines.find((l) => l.kind === "regular")?.amount ?? 0;
  const payslip = computePayslip(worker.id, month, shifts, worker.pay, org.labourRules, computeDeductions(regularPay));
  const byDay = minutesByDay(shifts);

  return {
    worker,
    org,
    payslip,
    daysWorked: byDay.size,
    totalMinutes: [...byDay.values()].reduce((a, b) => a + b, 0),
  };
}
