"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, FileUp, PenLine } from "lucide-react";
import { importPaidCsvAction, savePaidRecordAction, updateDisputeAction, type CsvFormState, type PaidFormState } from "@/server/actions/payroll";
import type { DisputeStatus } from "@/server/repos/types";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";

const MONEY_FIELDS = ["grossPaid", "deductions", "netPaid"] as const;
const HOUR_FIELDS = ["paidRegularHours", "paidOvertimeHours"] as const;

/** Record what was actually paid: one worker by hand, or a whole sheet as CSV. */
export function PaidRecordTools({ month, workers }: { month: string; workers: { id: string; label: string }[] }) {
  const t = useTranslations("admin.payrollPage.record");
  const [open, setOpen] = useState<"form" | "csv" | null>(null);
  const [formState, formAction] = useActionState<PaidFormState, FormData>(savePaidRecordAction, {});
  const [csvState, csvAction] = useActionState<CsvFormState, FormData>(importPaidCsvAction, {});

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setOpen("form")}>
        <PenLine aria-hidden="true" className="size-4" />
        {t("manual")}
      </Button>
      <Button variant="secondary" onClick={() => setOpen("csv")}>
        <FileUp aria-hidden="true" className="size-4" />
        {t("upload")}
      </Button>
      <a href="/api/payroll/template" download className={buttonVariants({ variant: "ghost" })}>
        <Download aria-hidden="true" className="size-4" />
        {t("template")}
      </a>

      <Sheet open={open === "form"} onClose={() => setOpen(null)} title={t("manualTitle")}>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="month" value={month} />
          <div>
            <Label htmlFor="paid-worker">{t("worker")}</Label>
            <select id="paid-worker" name="workerId" required className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-surface px-3">
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {HOUR_FIELDS.map((field) => (
              <div key={field}>
                <Label htmlFor={field}>{t(field)}</Label>
                <Input id={field} name={field} type="number" inputMode="decimal" min={0} step="0.01" required className="mt-1" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MONEY_FIELDS.map((field) => (
              <div key={field}>
                <Label htmlFor={field}>{t(field)}</Label>
                <Input id={field} name={field} inputMode="decimal" required placeholder="₹" className="mt-1" />
              </div>
            ))}
          </div>
          <p aria-live="polite" className="text-sm font-semibold">
            {formState.ok ? <span className="text-success">{t("saved")}</span> : formState.error ? <span className="text-danger">{t(`errors.${formState.error}`)}</span> : null}
          </p>
          <SubmitButton size="lg">{t("save")}</SubmitButton>
        </form>
      </Sheet>

      <Sheet open={open === "csv"} onClose={() => setOpen(null)} title={t("uploadTitle")}>
        <p className="text-ink-2">{t("uploadHint")}</p>
        <form action={csvAction} className="flex flex-col gap-3">
          <Label htmlFor="paid-csv">{t("file")}</Label>
          <input id="paid-csv" name="file" type="file" accept=".csv,text/csv" required className="min-h-12 rounded-2xl border border-line bg-surface p-2" />
          <div aria-live="polite" className="text-sm">
            {csvState.error && <p className="font-semibold text-danger">{t(`errors.${csvState.error}`)}</p>}
            {csvState.result && (
              <>
                <p className="font-semibold text-success">{t("imported", { count: csvState.result.saved })}</p>
                {csvState.result.errors.map((e) => (
                  <p key={e.row} className="text-danger">
                    {t("rowError", { row: e.row, reason: t(`errors.${e.reason}`) })}
                  </p>
                ))}
              </>
            )}
          </div>
          <SubmitButton size="lg">{t("import")}</SubmitButton>
        </form>
      </Sheet>
    </div>
  );
}

/** Move a pay dispute along: reviewing, then resolved with a note the worker will read. */
export function DisputeControls({ id, status }: { id: string; status: DisputeStatus }) {
  const t = useTranslations("admin.payrollPage.disputes");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  if (status === "resolved") return null;

  function update(next: "reviewing" | "resolved") {
    setError(false);
    startTransition(async () => {
      const result = await updateDisputeAction({ id, status: next, note: note || undefined });
      if (result.ok) router.refresh();
      else setError(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`dispute-${id}`}>{t("noteLabel")}</Label>
      <Textarea id={`dispute-${id}`} value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} />
      <div className="flex flex-wrap gap-2">
        {status === "open" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => update("reviewing")}>
            {t("startReview")}
          </Button>
        )}
        <Button size="sm" disabled={pending || !note.trim()} onClick={() => update("resolved")}>
          {t("resolve")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </p>
      )}
    </div>
  );
}
