import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { logout } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/language-switch";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: LayoutProps<"/a">) {
  const session = await requireRole("admin");
  const [org, t, tc] = await Promise.all([
    getRepos().orgs.getById(session.orgId),
    getTranslations("admin"),
    getTranslations("common"),
  ]);

  return (
    <div className="admin flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-brand">FairShift</span>
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
        <main id="main" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
