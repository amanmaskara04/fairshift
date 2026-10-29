"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, CloudUpload, LogOut, QrCode, ScanLine } from "lucide-react";
import { checkInAction, checkOutAction, demoSiteTokenAction, type ActionResult } from "@/server/actions/attendance";
import { enqueue, isNetworkError } from "@/lib/offline-queue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";
import { QrScanner } from "./qr-scanner";

type Phase = "idle" | "explain" | "scanning" | "done" | "queued";

export function CheckinPanel({ checkedIn, demo }: { checkedIn: boolean; demo: boolean }) {
  const t = useTranslations("checkin");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const finish = useCallback(
    (result: ActionResult, successKey: "success" | "checkoutSuccess") => {
      if (result.ok) {
        navigator.vibrate?.(200);
        setMessage(t(successKey));
        setPhase("done");
        router.refresh();
      } else {
        setError(t(`errors.${result.error}`));
        setPhase("idle");
      }
    },
    [router, t],
  );

  const submitCheckIn = useCallback(
    (token: string) => {
      const op = { clientOpId: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setError("");
      startTransition(async () => {
        try {
          finish(await checkInAction({ token, clientOpId: op.clientOpId, scannedAt: op.createdAt }), "success");
        } catch (e) {
          if (!isNetworkError(e)) throw e;
          await enqueue({ type: "checkin", ...op, payload: { token } });
          setMessage(t("savedOffline"));
          setPhase("queued");
        }
      });
    },
    [finish, t],
  );

  function submitCheckOut() {
    const op = { clientOpId: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setError("");
    startTransition(async () => {
      try {
        finish(await checkOutAction({ clientOpId: op.clientOpId, at: op.createdAt }), "checkoutSuccess");
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        await enqueue({ type: "checkout", ...op });
        setMessage(t("savedOffline"));
        setPhase("queued");
      }
    });
  }

  function simulateScan() {
    startTransition(async () => {
      const token = await demoSiteTokenAction();
      if (token) submitCheckIn(token);
    });
  }

  const onCameraError = useCallback(() => {
    setError(t("errors.camera"));
    setPhase("idle");
  }, [t]);

  if (phase === "done" || phase === "queued") {
    return (
      <Card className="rise-in flex flex-col items-center gap-4 rounded-[28px] py-10 text-center" aria-live="polite">
        {phase === "done" ? <SuccessCheck /> : <CloudUpload aria-hidden="true" className="size-20 text-brand" />}
        <p className="font-display text-3xl font-extrabold">{message}</p>
        <SpeakButton text={message} />
        <Button size="lg" variant="outline" onClick={() => router.push("/w")}>
          {t("backHome")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger p-4 font-semibold text-status-foreground">
          {error}
        </p>
      )}

      {checkedIn ? (
        <div className="slab flex flex-col gap-5 rounded-[28px] p-5 md:p-7">
          <Button variant="accent" size="lg" className="min-h-20 text-xl" onClick={submitCheckOut} disabled={pending}>
            <LogOut aria-hidden="true" className="size-8" />
            {t("checkoutButton")}
          </Button>
        </div>
      ) : phase === "scanning" ? (
        <>
          <QrScanner onResult={submitCheckIn} onError={onCameraError} label={t("scanQR")} />
          <Button variant="outline" size="lg" onClick={() => setPhase("idle")}>
            {t("cancel")}
          </Button>
        </>
      ) : phase === "explain" ? (
        <Card className="rise-in flex flex-col items-center gap-4 rounded-[28px] text-center">
          <span className="flex size-20 items-center justify-center rounded-3xl bg-brand-soft text-brand-soft-foreground">
            <Camera aria-hidden="true" className="size-10" />
          </span>
          <p className="text-lg">{t("cameraWhy")}</p>
          <SpeakButton text={t("cameraWhy")} />
          <Button size="lg" className="w-full" onClick={() => setPhase("scanning")}>
            {t("allowCamera")}
          </Button>
        </Card>
      ) : (
        <div className="slab flex flex-col items-center gap-6 rounded-[28px] p-6 md:p-8">
          <div className="viewfinder flex size-44 items-center justify-center" aria-hidden="true">
            <QrCode className="size-24 text-slab-foreground/80" strokeWidth={1.4} />
          </div>
          <Button variant="accent" size="lg" className="min-h-20 w-full text-xl" onClick={() => setPhase("explain")} disabled={pending}>
            <ScanLine aria-hidden="true" className="size-8" />
            {t("scanQR")}
          </Button>
        </div>
      )}

      {demo && !checkedIn && phase !== "scanning" && (
        <Button variant="secondary" onClick={simulateScan} disabled={pending}>
          {t("simulateScan")}
        </Button>
      )}
    </div>
  );
}
