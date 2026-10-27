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
  for (const worker of workers) {
    const view = await buildPayslip(repos, worker.id, month);
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
