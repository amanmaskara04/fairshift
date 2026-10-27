import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { logout } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="admin flex min-h-dvh flex-col">
      <div className="hazard-tape" aria-hidden="true" />
      <header className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
        <div className="flex items-center gap-3">
          <BrandMark className="text-lg" />
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <span className="font-semibold">{org?.name}</span>
          {org && <Badge tone="brand">{t(`sector.${org.sector}`)}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitch />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut aria-hidden="true" className="size-4" />
              {tc("logout")}
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
