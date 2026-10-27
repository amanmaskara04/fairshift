import { buildPayslip } from "@/server/services/payslip";
import type { Repos } from "@/server/repos/types";

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
}

export async function buildPayroll(repos: Repos, orgId: string, month: string): Promise<PayrollRow[]> {
  const workers = await repos.workers.getByOrg(orgId);
  const rows: PayrollRow[] = [];
  // Payslips are independent, so build them concurrently instead of one round trip after another.
  const views = await Promise.all(workers.map((worker) => buildPayslip(repos, worker.id, month)));
  for (const [i, worker] of workers.entries()) {
    const view = views[i];
    if (!view) continue;
    const { payslip } = view;
    rows.push({
      workerId: worker.id,
      name: worker.name,
      code: worker.code,
      basis: worker.pay.basis,
      daysWorked: view.daysWorked,
      regularMinutes: payslip.lines.find((l) => l.kind === "regular")?.minutes ?? 0,
      overtimeMinutes: payslip.lines.find((l) => l.kind === "overtime")?.minutes ?? 0,
      gross: payslip.gross,
      deductions: payslip.deductions.reduce((s, d) => s + d.amount, 0),
      net: payslip.net,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
