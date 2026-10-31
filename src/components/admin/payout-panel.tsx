"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CircleCheck, CircleX, Clock, ExternalLink, Landmark, RefreshCw, Send, X } from "lucide-react";
import type { PayoutBatchView, PayoutOverview } from "@/server/services/payouts";
import {
  cancelCheckoutAction,
  confirmCheckoutAction,
  savePayoutAccountAction,
  startCheckoutAction,
  type AccountFormState,
} from "@/server/actions/payouts";
import { formatINR, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";

type Provider = "cashfree" | "simulated" | null;

/**
 * Pay several workers in one checkout: tick the workers, check the total, then pay it once on
 * the checkout page; each worker's share goes to their bank account. The browser only says who;
 * every amount is computed on the server from payroll.
 */
export function PayoutPanel({
  month,
  provider,
  overview,
}: {
  month: string;
  provider: Provider;
  overview: PayoutOverview;
}) {
  const t = useTranslations("admin.payrollPage.payouts");
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = overview.payable.filter((p) => p.account && !p.busy);
  const chosen = ready.filter((p) => selected.has(p.workerId));
  const total = chosen.reduce((sum, p) => sum + p.amount, 0);

  function toggle(workerId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  }

  function checkout() {
    setError(null);
    startTransition(async () => {
      const result = await startCheckoutAction({ month, workerIds: chosen.map((p) => p.workerId) });
      if (result.ok) {
        // Off to the checkout (Cashfree's page, or the simulated one); it brings the employer back.
        window.location.assign(result.url);
        return;
      }
      setError(result.error);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="payouts-title" className="hero-card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="payouts-title" className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Banknote aria-hidden="true" className="size-6 text-primary" />
          {t("title")}
        </h2>
        {provider && (
          <Badge tone="info">
            <Landmark aria-hidden="true" className="size-4" />
            {t(`mode.${provider}`)}
          </Badge>
        )}
      </div>
      <p className="text-ink-2">{t("hint")}</p>
      {provider ? (
        <p className="text-sm font-semibold text-warning-ink">{t("sandboxNote")}</p>
      ) : (
        <p className="font-semibold">{t("mode.off")}</p>
      )}

      {overview.payable.length === 0 ? (
        <p className="font-bold">{t("none")}</p>
      ) : (
        <fieldset className="flex flex-col gap-2" disabled={!provider}>
          <legend className="sr-only">{t("title")}</legend>
          <ul className="flex flex-col gap-2">
            {overview.payable.map((p) => {
              const canPay = Boolean(p.account) && !p.busy;
              const id = `payout-${p.workerId}`;
              return (
                <li
                  key={p.workerId}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2",
                    selected.has(p.workerId) && canPay && "border-primary bg-primary-soft/40",
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="size-5 shrink-0 accent-[var(--primary)]"
                    checked={canPay && selected.has(p.workerId)}
                    disabled={!canPay}
                    onChange={() => toggle(p.workerId)}
                  />
                  <label htmlFor={id} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
                    <span className="font-bold">
                      {p.name} <span className="font-normal text-ink-2">#{p.code}</span>
                    </span>
                    <span className="text-sm text-ink-2">
                      {p.account ? `${p.account.masked} · ${p.account.ifsc}` : t("noAccount")}
                    </span>
                  </label>
                  <Badge tone={p.kind === "gap" ? "danger" : "neutral"}>{t(`kind.${p.kind}`)}</Badge>
                  <span className="figure font-semibold">{formatINR(p.amount)}</span>
                  {p.busy && (
                    <Badge tone="warning">
                      <Clock aria-hidden="true" className="size-4" />
                      {t("status.pending")}
                    </Badge>
                  )}
                  {!p.account && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(p.workerId)}>
                      {t("addAccount")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected(chosen.length === ready.length ? new Set() : new Set(ready.map((p) => p.workerId)))
              }
              disabled={ready.length === 0}
            >
              {chosen.length === ready.length && ready.length > 0 ? t("clear") : t("selectAll")}
            </Button>
            <Button onClick={() => setConfirming(true)} disabled={chosen.length === 0}>
              <Send aria-hidden="true" className="size-4" />
              {t("pay", { count: chosen.length, amount: formatINR(total) })}
            </Button>
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(overview.accounts[0]?.workerId ?? null)}>
          <Landmark aria-hidden="true" className="size-4" />
          {t("account.edit")}
        </Button>
      </div>

      <p aria-live="polite" className="text-sm font-semibold text-danger">
        {error && t(`errors.${error}`)}
      </p>

      {overview.batches.length > 0 && <BatchList batches={overview.batches} canCheck={Boolean(provider)} />}

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("confirmTitle", { amount: formatINR(total) })}
      >
        <p className="text-ink-2">{t("confirmHint", { count: chosen.length, amount: formatINR(total) })}</p>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          {chosen.map((p) => (
            <li key={p.workerId} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="font-bold">{p.name}</span>{" "}
                <span className="text-sm text-ink-2">
                  {t(`kind.${p.kind}`)} · {p.account?.masked}
                </span>
              </span>
              <span className="figure font-semibold">{formatINR(p.amount)}</span>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t(`errors.${error}`)}
          </p>
        )}
        <Button size="lg" onClick={checkout} disabled={pending || chosen.length === 0} aria-busy={pending || undefined}>
          <ExternalLink aria-hidden="true" className="size-5" />
          {t("send", { amount: formatINR(total) })}
        </Button>
      </Sheet>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={t("account.title")}>
        {editing !== null && (
          <AccountForm
            key={editing}
            workerId={editing}
            accounts={overview.accounts}
            onPick={setEditing}
            onSaved={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Sheet>
    </section>
  );
}

function BatchList({ batches, canCheck }: { batches: PayoutBatchView[]; canCheck: boolean }) {
  const t = useTranslations("admin.payrollPage.payouts");
  const locale = useLocale();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function run(action: typeof confirmCheckoutAction, batchId: string) {
    setError(false);
    startTransition(async () => {
      const result = await action({ batchId });
      if (!result.ok) setError(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-lg font-extrabold">{t("recent")}</h3>
      {batches.map((batch) => (
        <article key={batch.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-bold">{formatWhen(batch.createdAt, locale)}</span> ·{" "}
              {t("batchSummary", {
                paid: batch.summary.paid,
                failed: batch.summary.failed,
                pending: batch.summary.pending,
              })}{" "}
              · <span className="figure font-semibold">{formatINR(batch.summary.paidAmount)}</span>
            </p>
            {batch.summary.pending > 0 && canCheck && (
              <span className="flex flex-wrap gap-2">
                {batch.checkoutUrl && (
                  <a href={batch.checkoutUrl} className={buttonVariants({ size: "sm" })}>
                    <ExternalLink aria-hidden="true" className="size-4" />
                    {t("continueCheckout")}
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(confirmCheckoutAction, batch.id)}
                  disabled={busy}
                >
                  <RefreshCw aria-hidden="true" className={cn("size-4", busy && "animate-spin")} />
                  {t("checkStatus")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => run(cancelCheckoutAction, batch.id)} disabled={busy}>
                  <X aria-hidden="true" className="size-4" />
                  {t("cancel")}
                </Button>
              </span>
            )}
          </header>
          <ul className="flex flex-col gap-1.5">
            {batch.items.map((item) => (
              <li key={item.transferId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="min-w-32 font-bold">{item.name}</span>
                <span className="text-ink-2">
                  {t(`kind.${item.kind}`)} · {item.accountMasked}
                </span>
                <span className="figure font-semibold">{formatINR(item.amount)}</span>
                <ItemStatus item={item} />
              </li>
            ))}
          </ul>
        </article>
      ))}
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("errors.unavailable")}
        </p>
      )}
    </div>
  );
}

function ItemStatus({ item }: { item: PayoutBatchView["items"][number] }) {
  const t = useTranslations("admin.payrollPage.payouts");
  if (item.status === "paid") {
    return (
      <Badge tone="success">
        <CircleCheck aria-hidden="true" className="size-4" />
        {t("status.paid")}
      </Badge>
    );
  }
  if (item.status === "failed") {
    return (
      <Badge tone="danger" title={item.detail}>
        <CircleX aria-hidden="true" className="size-4" />
        {t("status.failed")}: {t(`failure.${item.failure ?? "payment_failed"}`)}
      </Badge>
    );
  }
  return (
    <Badge tone="warning">
      <Clock aria-hidden="true" className="size-4" />
      {t("status.pending")}
    </Badge>
  );
}

function AccountForm({
  workerId,
  accounts,
  onPick,
  onSaved,
}: {
  workerId: string;
  accounts: PayoutOverview["accounts"];
  onPick: (workerId: string) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("admin.payrollPage.payouts.account");
  const current = accounts.find((a) => a.workerId === workerId) ?? accounts[0];
  const [state, action] = useActionState<AccountFormState, FormData>(async (prev, formData) => {
    const result = await savePayoutAccountAction(prev, formData);
    if (result.ok) onSaved();
    return result;
  }, {});
  if (!current) return null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-ink-2">{t("hint")}</p>
      <div>
        <Label htmlFor="payout-worker">{t("worker")}</Label>
        <select
          id="payout-worker"
          name="workerId"
          value={current.workerId}
          onChange={(e) => onPick(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-surface px-3"
        >
          {accounts.map((a) => (
            <option key={a.workerId} value={a.workerId}>
              {a.name} (#{a.code})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-ink-2">
          {current.account ? t("current", { masked: current.account.masked, ifsc: current.account.ifsc }) : t("none")}
        </p>
      </div>
      <div>
        <Label htmlFor="payout-holder">{t("holder")}</Label>
        <Input
          id="payout-holder"
          name="holder"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={current.account?.holder ?? current.name}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="payout-account">{t("number")}</Label>
        <Input
          id="payout-account"
          name="account"
          required
          inputMode="numeric"
          pattern="[0-9 ]{9,22}"
          maxLength={22}
          autoComplete="off"
          className="figure mt-1"
        />
      </div>
      <div>
        <Label htmlFor="payout-ifsc">{t("ifsc")}</Label>
        <Input
          id="payout-ifsc"
          name="ifsc"
          required
          maxLength={11}
          autoComplete="off"
          autoCapitalize="characters"
          defaultValue={current.account?.ifsc ?? ""}
          className="figure mt-1 uppercase"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <SubmitButton size="lg">{t("save")}</SubmitButton>
    </form>
  );
}
