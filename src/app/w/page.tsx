import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, BatteryLow, IndianRupee, LogIn, LogOut, MessageCircle, TriangleAlert, UserRound } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { getISTDay, getISTWeekStart } from "@/core/time";
import { minutesByDay } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { getSectorProfile } from "@/core/sectors";
import type { ClosedShift } from "@/core/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader, todayLabel } from "@/components/page-header";
import { ShiftTimer } from "@/components/worker/shift-timer";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const ACTIONS = [
  { href: "/w/pay", key: "pay", hint: "pay", Icon: IndianRupee, tone: "bg-accent text-accent-foreground" },
  { href: "/w/report", key: "report", hint: "report", Icon: TriangleAlert, tone: "bg-danger text-status-foreground" },
  { href: "/w/feedback", key: "feedback", hint: "feedback", Icon: MessageCircle, tone: "bg-brand text-brand-foreground" },
  { href: "/w/skills", key: "skills", hint: null, Icon: UserRound, tone: "bg-muted text-foreground" },
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
  const weekStart = getISTWeekStart(now);
  const openShift = shifts.find((s) => !s.outAt);
  const asClosed: ClosedShift[] = shifts.map((s) => ({ ...s, outAt: s.outAt ?? now }));
  const byDay = minutesByDay(asClosed.filter((s) => getISTDay(s.outAt) >= weekStart));
  const todayMinutes = byDay.get(today) ?? 0;
  const weekMinutes = [...byDay.entries()].filter(([day]) => day >= weekStart).reduce((sum, [, m]) => sum + m, 0);
  const profile = org ? getSectorProfile(org.sector) : null;
  const weekLimit = profile?.labourRules.weeklyHrs ?? 48;
  const weekShare = Math.min(1, weekMinutes / (weekLimit * 60));
  const overLimit = weekMinutes > weekLimit * 60;

  // Only the last 7 days, so the nudge is about recent strain, not old history.
  const recent = shifts.filter((s): s is ClosedShift => Boolean(s.outAt) && now.getTime() - s.inAt.getTime() <= SEVEN_DAYS_MS);
  const fatigueKeys = profile ? [...new Set(checkFatigue(recent, profile.fatigueRules, now).map((a) => a.messageKey))] : [];

  const firstName = worker?.name.split(" ")[0] ?? "";
  const greeting = t("greeting", { name: firstName });
  const status = openShift ? t("statusCheckedIn", { time: formatTimeIST(openShift.inAt) }) : t("statusNotCheckedIn");
  const hours = t("todayHours", { hours: Math.floor(todayMinutes / 60), minutes: todayMinutes % 60 });
  const weekText = t("weekOfLimit", { used: formatDuration(weekMinutes), limit: weekLimit });

  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[1.1fr_1fr] md:items-start md:gap-x-8 md:gap-y-8">
      <div className="md:col-span-2">
        <PageHeader
          eyebrow={todayLabel(locale)}
          title={greeting}
          action={<SpeakButton text={`${greeting}. ${status}. ${hours}. ${weekText}.`} />}
        />
      </div>

      <div className="flex flex-col gap-4">
        <section aria-labelledby="today-card" className="slab rise-in flex flex-col gap-5 rounded-[28px] p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="today-card" className="eyebrow">
              {t("today")}
            </h2>
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold",
                openShift ? "bg-accent text-accent-foreground" : "bg-[rgb(243_242_236/0.1)]",
              )}
            >
              <span aria-hidden="true" className={cn("size-2 rounded-full", openShift ? "bg-accent-foreground" : "bg-slab-muted")} />
              {status}
            </span>
          </div>

          {openShift ? (
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-slab-muted">
                <span className="live-dot" aria-hidden="true" />
                {t("onShiftFor")}
              </p>
              <p className="mt-1 text-[3.1rem] leading-none font-bold md:text-6xl">
                <ShiftTimer since={openShift.inAt.toISOString()} />
              </p>
              <p className="sr-only">{hours}</p>
            </div>
          ) : (
            <p className="figure text-[3.1rem] leading-none font-bold md:text-6xl" aria-label={hours}>
              {formatDuration(todayMinutes)}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
              <span className="font-bold">{t("thisWeek")}</span>
              <span className="figure text-slab-muted">{weekText}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(243_242_236/0.14)]" aria-hidden="true">
              <div
                className={cn("meter-fill h-full rounded-full", overLimit ? "bg-[#ff8a73]" : "bg-accent")}
                style={{ width: `${Math.max(weekShare * 100, 2)}%` }}
              />
            </div>
          </div>

          <Link
            href="/w/checkin"
            className={cn(buttonVariants({ variant: "accent", size: "lg" }), "w-full", openShift && "bg-slab-foreground text-[#0c1a16]")}
          >
            {openShift ? <LogOut aria-hidden="true" className="size-6" /> : <LogIn aria-hidden="true" className="size-6" />}
            {openShift ? t("tiles.checkout") : t("tiles.checkin")}
          </Link>
        </section>

        {fatigueKeys.length > 0 && (
          <section
            role="alert"
            className="flex items-start gap-3 rounded-worker border border-warning/40 bg-[color-mix(in_srgb,var(--warning)_9%,var(--card))] p-4"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning text-status-foreground">
              <BatteryLow aria-hidden="true" className="size-6" />
            </span>
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
      </div>

      <section aria-labelledby="actions" className="flex flex-col gap-3">
        <h2 id="actions" className="eyebrow rule-label">
          {t("quickActions")}
        </h2>
        <ul className="stagger grid grid-cols-2 gap-3">
          {ACTIONS.map(({ href, key, hint, Icon, tone }) => (
            <li key={href}>
              <Link href={href} className="tile flex h-full min-h-40 flex-col justify-between gap-4 rounded-worker p-4">
                <span className="flex items-start justify-between">
                  <span className={cn("flex size-12 items-center justify-center rounded-2xl", tone)}>
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <ArrowUpRight aria-hidden="true" className="nudge size-5 text-muted-foreground" />
                </span>
                <span>
                  <span className="block text-lg leading-tight font-extrabold">{t(`tiles.${key}`)}</span>
                  {hint && <span className="mt-1 block text-sm leading-snug text-muted-foreground">{t(`tileHints.${hint}`)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
