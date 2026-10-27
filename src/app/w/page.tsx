import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, BatteryLow, Clock, IndianRupee, MessageCircle, TriangleAlert } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { getISTDay } from "@/core/time";
import { minutesByDay } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { getSectorProfile } from "@/core/sectors";
import type { ClosedShift } from "@/core/types";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const TILES = [
  { href: "/w/checkin", key: "checkin", Icon: Clock },
  { href: "/w/pay", key: "pay", Icon: IndianRupee },
  { href: "/w/report", key: "report", Icon: TriangleAlert },
  { href: "/w/feedback", key: "feedback", Icon: MessageCircle },
] as const;

function formatTimeIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function WorkerHome() {
  const session = await requireRole("worker");
  const t = await getTranslations("worker");
  const repos = getRepos();
  const [worker, shifts, org] = await Promise.all([
    repos.workers.getById(session.uid),
    repos.shifts.getByWorker(session.uid),
    repos.orgs.getById(session.orgId),
  ]);

  const now = new Date();
  const today = getISTDay(now);
  const openShift = shifts.find((s) => !s.outAt);
  const todayShifts: ClosedShift[] = shifts
    .map((s) => ({ ...s, outAt: s.outAt ?? now }))
    .filter((s) => getISTDay(s.inAt) === today || getISTDay(s.outAt) === today);
  const todayMinutes = minutesByDay(todayShifts).get(today) ?? 0;

  // Only the last 7 days, so the nudge is about recent strain, not old history.
  const recent = shifts.filter((s): s is ClosedShift => Boolean(s.outAt) && now.getTime() - s.inAt.getTime() <= SEVEN_DAYS_MS);
  const fatigueKeys = org
    ? [...new Set(checkFatigue(recent, getSectorProfile(org.sector).fatigueRules, now).map((a) => a.messageKey))]
    : [];

  const firstName = worker?.name.split(" ")[0] ?? "";
  const status = openShift
    ? t("statusCheckedIn", { time: formatTimeIST(openShift.inAt) })
    : t("statusNotCheckedIn");
  const hours = t("todayHours", { hours: Math.floor(todayMinutes / 60), minutes: todayMinutes % 60 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("greeting", { name: firstName })}</h1>
        <SpeakButton text={`${t("greeting", { name: firstName })}. ${status}. ${hours}.`} />
      </div>

      {fatigueKeys.length > 0 && (
        <Card role="alert" className="flex items-start gap-3 border-warning bg-warning text-status-foreground">
          <BatteryLow aria-hidden="true" className="size-10 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{t("fatigue.title")}</p>
            {fatigueKeys.map((key) => (
              <p key={key}>{t(key)}</p>
            ))}
          </div>
          <SpeakButton text={[t("fatigue.title"), ...fatigueKeys.map((key) => t(key))].join(". ")} className="text-status-foreground" />
        </Card>
      )}

      <Card aria-live="polite" className="flex items-center gap-3">
        {openShift ? (
          <BadgeCheck aria-hidden="true" className="size-10 shrink-0 text-success" />
        ) : (
          <Clock aria-hidden="true" className="size-10 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className="font-bold">{status}</p>
          <p className="text-muted-foreground">{hours}</p>
        </div>
      </Card>

      <ul className="grid grid-cols-2 gap-3">
        {TILES.map(({ href, key, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-worker border-2 border-border bg-card p-3 text-center text-lg font-bold hover:border-brand"
            >
              <Icon aria-hidden="true" className="size-10 text-brand" />
              {key === "checkin" && openShift ? t("tiles.checkout") : t(`tiles.${key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
