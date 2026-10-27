import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { HardHat, Hospital, LayoutDashboard } from "lucide-react";
import { demoLogin } from "@/server/actions/auth";
import { getSession, HOME_FOR_ROLE } from "@/server/dal";
import { isDemoMode } from "@/server/config";
import { Button } from "@/components/ui/button";
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
    <main id="main" className="worker mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <h1 className="text-center text-3xl font-bold text-brand">FairShift</h1>

      {isDemoMode() && (
        <section aria-labelledby="demo-title" className="flex flex-col gap-3">
          <h2 id="demo-title" className="text-lg font-semibold">
            {t("demoTitle")}
          </h2>
          {DEMO_BUTTONS.map(({ persona, key, Icon }) => (
            <form key={persona} action={demoLogin}>
              <input type="hidden" name="persona" value={persona} />
              <Button type="submit" variant="secondary" size="lg" className="w-full justify-start">
                <Icon aria-hidden="true" className="size-7" />
                {t(key)}
              </Button>
            </form>
          ))}
        </section>
      )}

      <LoginForms />
    </main>
  );
}
