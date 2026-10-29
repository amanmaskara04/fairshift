import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ArrowRight, HardHat, Hospital, LayoutDashboard } from "lucide-react";
import { demoLogin } from "@/server/actions/auth";
import { getSession, HOME_FOR_ROLE } from "@/server/dal";
import { isDemoMode } from "@/server/config";
import { BrandMark } from "@/components/brand-mark";
import { RevealText } from "@/components/reveal-text";
import { WavesBackground } from "@/components/waves-background";
import { SubmitButton } from "@/components/ui/submit-button";
import { LoginForms } from "./login-forms";

const DEMO_BUTTONS = [
  { persona: "ramesh", key: "demoRamesh", Icon: HardHat },
  { persona: "sunita", key: "demoSunita", Icon: Hospital },
  { persona: "priya", key: "demoPriya", Icon: LayoutDashboard },
] as const;

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);
  const t = await getTranslations("login");

  return (
    <main id="main" className="worker grid flex-1 md:grid-cols-[1fr_1.05fr]">
      <section className="slab flex flex-col gap-8 px-5 py-7 md:px-12 md:py-12">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 text-accent opacity-[0.14]" aria-hidden="true">
          <WavesBackground />
        </div>
        <Link href="/" className="w-fit rounded-xl">
          <BrandMark className="text-2xl" tone="slab" />
        </Link>
        <h1 className="font-display max-w-md text-4xl leading-[1.02] font-extrabold md:text-6xl">
          <RevealText text={t("title")} />
        </h1>

        {isDemoMode() && (
          <section aria-labelledby="demo-title" className="mt-auto flex flex-col gap-3">
            <h2 id="demo-title" className="eyebrow flex items-center gap-2">
              <span className="live-dot" aria-hidden="true" />
              {t("demoTitle")}
            </h2>
            <ul className="stagger flex flex-col gap-2.5">
              {DEMO_BUTTONS.map(({ persona, key, Icon }) => (
                <li key={persona}>
                  <form action={demoLogin}>
                    <input type="hidden" name="persona" value={persona} />
                    <SubmitButton
                      unstyled
                      className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-slab-line bg-[rgb(243_242_236/0.06)] px-3 py-2.5 text-left font-bold text-slab-foreground transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-[rgb(243_242_236/0.1)]"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Icon aria-hidden="true" className="size-6" />
                      </span>
                      <span className="flex-1">{t(key)}</span>
                      <ArrowRight aria-hidden="true" className="size-5 text-accent transition-transform group-hover:translate-x-1" />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      <div className="flex items-start justify-center px-5 py-8 md:items-center md:px-12">
        <div className="sheet rise-in w-full max-w-md rounded-[28px] p-5 md:p-7">
          <LoginForms />
        </div>
      </div>
    </main>
  );
}
