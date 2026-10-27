import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { logout } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { LanguageSwitch } from "@/components/language-switch";
import { Sidebar } from "@/components/admin/sidebar";
import { BrandMark } from "@/components/brand-mark";

export default async function AdminLayout({ children }: LayoutProps<"/a">) {
  const session = await requireRole("admin");
  const [org, t, tc] = await Promise.all([
    getRepos().orgs.getById(session.orgId),
    getTranslations("admin"),
    getTranslations("common"),
  ]);

  const orgLabel = (
    <>
      <span className="min-w-0 truncate font-semibold">{org?.name}</span>
      {org && <Badge tone="brand">{t(`sector.${org.sector}`)}</Badge>}
    </>
  );

  return (
    <div className="admin flex min-h-dvh flex-col">
      <div className="hazard-tape" aria-hidden="true" />
      <header className="border-b border-border bg-background">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark className="shrink-0 text-lg" />
            <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden min-w-0 items-center gap-2 sm:flex">{orgLabel}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageSwitch />
            <form action={logout}>
              <SubmitButton variant="ghost" size="sm" aria-label={tc("logout")}>
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{tc("logout")}</span>
              </SubmitButton>
            </form>
          </div>
        </div>
        {/* Phones: organisation on its own line so the header never overflows. */}
        <div className="flex min-w-0 items-center gap-2 px-4 pb-2 sm:hidden">{orgLabel}</div>
      </header>
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <Sidebar />
        <main id="main" className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
