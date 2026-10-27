import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BatteryLow, ChevronRight, IndianRupee, LogIn, LogOut, MessageCircle, TriangleAlert } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { getISTDay } from "@/core/time";
import { minutesByDay } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { getSectorProfile } from "@/core/sectors";
import type { ClosedShift } from "@/core/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader, todayLabel } from "@/components/page-header";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const ACTIONS = [
  { href: "/w/pay", key: "pay", Icon: IndianRupee },
  { href: "/w/report", key: "report", Icon: TriangleAlert },
  { href: "/w/feedback", key: "feedback", Icon: MessageCircle },
] as const;

function formatTimeIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function WorkerHome() {
  const session = await requireRole("worker");
  const [t, locale] = await Promise.all([getTranslations("worker"), getLocale()]);
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
  const greeting = t("greeting", { name: firstName });
  const status = openShift ? t("statusCheckedIn", { time: formatTimeIST(openShift.inAt) }) : t("statusNotCheckedIn");
  const hours = t("todayHours", { hours: Math.floor(todayMinutes / 60), minutes: todayMinutes % 60 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={todayLabel(locale)} title={greeting} action={<SpeakButton text={`${greeting}. ${status}. ${hours}.`} />} />

      <section aria-labelledby="today-card" className="stamp rise-in flex flex-col gap-4 rounded-worker p-5" aria-live="polite">
        <div className="flex items-center justify-between">
          <h2 id="today-card" className="eyebrow">
            {t("today")}
          </h2>
          <span className="flex items-center gap-2 text-sm font-bold">
            <span aria-hidden="true" className={cn("size-2.5 rounded-full", openShift ? "bg-success" : "bg-muted-foreground")} />
            {status}
          </span>
        </div>
        <p className="figure text-5xl leading-none font-semibold" aria-label={hours}>
          {formatDuration(todayMinutes)}
        </p>
        <Link href="/w/checkin" className={cn(buttonVariants({ variant: openShift ? "outline" : "accent", size: "lg" }), "w-full")}>
          {openShift ? <LogOut aria-hidden="true" className="size-6" /> : <LogIn aria-hidden="true" className="size-6" />}
          {openShift ? t("tiles.checkout") : t("tiles.checkin")}
        </Link>
      </section>

      {fatigueKeys.length > 0 && (
        <section role="alert" className="flex items-start gap-3 rounded-worker border-l-[6px] border-warning bg-card p-4">
          <BatteryLow aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="font-bold">{t("fatigue.title")}</p>
            {fatigueKeys.map((key) => (
              <p key={key} className="text-muted-foreground">
                {t(key)}
              </p>
            ))}
          </div>
          <SpeakButton text={[t("fatigue.title"), ...fatigueKeys.map((key) => t(key))].join(". ")} />
        </section>
      )}

      <section aria-labelledby="actions" className="flex flex-col gap-3">
        <h2 id="actions" className="eyebrow rule-label">
          {t("quickActions")}
        </h2>
        <ul className="stagger flex flex-col gap-3">
          {ACTIONS.map(({ href, key, Icon }) => (
            <li key={href}>
              <Link href={href} className="print-card flex min-h-20 items-center gap-4 rounded-worker p-3 pr-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-admin bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" className="size-7" />
                </span>
                <span className="flex-1">
                  <span className="block text-lg leading-tight font-bold">{t(`tiles.${key}`)}</span>
                  <span className="block text-sm text-muted-foreground">{t(`tileHints.${key}`)}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
