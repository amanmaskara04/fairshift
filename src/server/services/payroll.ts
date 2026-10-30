import type { PayCheckResult } from "@/core/pay-check";
import type { PaidRecordEntry, Repos } from "@/server/repos/types";
import { payCheckFor } from "./pay-check";

export interface PayrollRow {
  workerId: string;
  name: string;
  code: string;
  basis: string;
  daysWorked: number;
  regularMinutes: number;
  overtimeMinutes: number;
  gross: number;
  deductions: number;
  net: number;
  /** What the employer recorded as paid, if anything yet */
  paid?: PaidRecordEntry;
  check: PayCheckResult;
  /** Arrears already paid for the month, and the gap still owed (paise) */
  arrearsPaid: number;
  outstanding: number;
  /** Paise per hour, for the manual entry form's calculations */
  rates: { regular: number; overtime: number };
}

export async function buildPayroll(repos: Repos, orgId: string, month: string): Promise<PayrollRow[]> {
  const workers = await repos.workers.getByOrg(orgId);
  // Payslips are independent, so build them concurrently instead of one round trip after another.
  const checks = await Promise.all(workers.map((worker) => payCheckFor(repos, worker.id, month)));
  const rows: PayrollRow[] = [];
  for (const [i, worker] of workers.entries()) {
    const check = checks[i];
    if (!check) continue;
    const { payslip, daysWorked } = check.view;
    rows.push({
      workerId: worker.id,
      name: worker.name,
      code: worker.code,
      basis: worker.pay.basis,
      daysWorked,
      regularMinutes: payslip.lines.find((l) => l.kind === "regular")?.minutes ?? 0,
      overtimeMinutes: payslip.lines.find((l) => l.kind === "overtime")?.minutes ?? 0,
      gross: payslip.gross,
      deductions: payslip.deductions.reduce((s, d) => s + d.amount, 0),
      net: payslip.net,
      paid: check.record,
      check: check.result,
      arrearsPaid: check.arrearsPaid,
      outstanding: check.outstanding,
      rates: check.rates,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
