import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChart3, Building2, Clock, HardHat, IndianRupee, Mic, QrCode, ShieldCheck, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { RevealText } from "@/components/reveal-text";
import { EntryBar } from "@/components/entry/entry-bar";
import { DemoLogins } from "@/components/entry/demo-logins";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const promises = [
    { Icon: Clock, text: t("promiseHours") },
    { Icon: IndianRupee, text: t("promisePay") },
    { Icon: ShieldCheck, text: t("promiseVoice") },
  ];
  const steps = [
    { Icon: QrCode, text: t("how1") },
    { Icon: IndianRupee, text: t("how2") },
    { Icon: Mic, text: t("how3") },
  ];
  const chips = [
    { Icon: WifiOff, text: t("chipOffline") },
    { Icon: Mic, text: t("chipVoice") },
    { Icon: ShieldCheck, text: t("chipPrivate") },
  ];

  return (
    <>
      <EntryBar animatedLogo />
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 pt-8 pb-[30vh] md:px-8 md:pt-14">
        <div className="grid gap-10 md:grid-cols-[1.15fr_1fr] md:items-start md:gap-14">
          <section className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold tracking-wide uppercase">{t("sdg")}</span>
            <h1 className="font-display text-[2.8rem] leading-[0.98] font-extrabold md:text-[4.6rem]">
              <RevealText text={t("subtitle")} markLast />
            </h1>
            <ul className="stagger flex flex-col gap-3">
              {promises.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="pt-1.5 leading-snug">{text}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "min-h-16")}>
                <HardHat aria-hidden="true" className="size-6" />
                {t("imWorker")}
              </Link>
              <Link href="/login?role=admin" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "min-h-16")}>
                <Building2 aria-hidden="true" className="size-6" />
                {t("imEmployer")}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2">
              {chips.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1.5 text-sm font-bold">
                  <Icon aria-hidden="true" className="size-4 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <div className="card rise-in p-5 md:p-6">
            <DemoLogins compact />
          </div>
        </div>

        <section aria-labelledby="how" className="flex flex-col gap-5">
          <h2 id="how" className="font-display text-3xl font-extrabold">
            {t("howTitle")}
          </h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {steps.map(({ Icon, text }, i) => (
              <li key={text} className="card flex items-center gap-4 p-5">
                <span className="figure font-display text-4xl font-extrabold text-primary">0{i + 1}</span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-warning-ink">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <p className="leading-snug font-bold">
                  <span className="sr-only">{t("step", { n: i + 1 })}: </span>
                  {text}
                </p>
              </li>
            ))}
          </ol>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="card flex flex-col gap-2 p-5">
              <HardHat aria-hidden="true" className="size-8 text-warning-ink" />
              <h2 className="font-display text-xl font-extrabold">{t("forWorkersTitle")}</h2>
              <p className="text-ink-2">{t("forWorkersText")}</p>
            </div>
            <div className="card flex flex-col gap-2 p-5">
              <BarChart3 aria-hidden="true" className="size-8 text-primary" />
              <h2 className="font-display text-xl font-extrabold">{t("forManagersTitle")}</h2>
              <p className="text-ink-2">{t("forManagersText")}</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="relative mt-auto px-4 py-5 text-center text-sm text-ink-2 md:px-8">{t("footer")}</footer>
    </>
  );
}
