import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ArrowRight, HardHat, Hospital, LayoutDashboard } from "lucide-react";
import { demoLogin } from "@/server/actions/auth";
import { getSession, HOME_FOR_ROLE } from "@/server/dal";
import { isDemoMode } from "@/server/config";
import { BrandMark } from "@/components/brand-mark";
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
    <main id="main" className="worker flex flex-1 flex-col">
      <div className="hazard-tape" aria-hidden="true" />
      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-5 py-8 md:grid-cols-2 md:gap-14 md:py-14">
        <div className="flex flex-col gap-6">
          <BrandMark className="text-2xl" />
          <h1 className="font-display text-4xl leading-tight font-extrabold">{t("title")}</h1>

          {isDemoMode() && (
            <section aria-labelledby="demo-title" className="flex flex-col gap-3">
              <h2 id="demo-title" className="eyebrow">
                {t("demoTitle")}
              </h2>
              <ul className="stagger flex flex-col gap-3">
                {DEMO_BUTTONS.map(({ persona, key, Icon }) => (
                  <li key={persona}>
                    <form action={demoLogin}>
                      <input type="hidden" name="persona" value={persona} />
                      <button type="submit" className="print-card group flex min-h-16 w-full items-center gap-3 rounded-worker px-4 py-3 text-left font-bold">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-admin bg-accent text-accent-foreground">
                          <Icon aria-hidden="true" className="size-6" />
                        </span>
                        <span className="flex-1">{t(key)}</span>
                        <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-1" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="rounded-worker border border-border bg-card p-5 md:p-6">
          <LoginForms />
        </div>
      </div>
    </main>
  );
}
