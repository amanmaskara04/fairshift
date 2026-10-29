import { getTranslations } from "next-intl/server";
import { Building2, LogOut } from "lucide-react";
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
  const [org, t, tc] = await Promise.all([getRepos().orgs.getById(session.orgId), getTranslations("admin"), getTranslations("common")]);
  const sector = org ? t(`sector.${org.sector}`) : "";

  return (
    <div className="admin flex min-h-dvh flex-col md:flex-row">
      {/* Laptops: a full-height evergreen rail. */}
      <aside className="slab sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 p-4 md:flex">
        <BrandMark className="px-2 pt-1 text-xl" tone="slab" />
        <div className="flex items-center gap-3 rounded-2xl bg-[rgb(243_242_236/0.07)] p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Building2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{org?.name}</p>
            <p className="text-sm text-slab-muted">{sector}</p>
          </div>
        </div>
        <Sidebar variant="rail" />
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slab-line pt-4">
          <LanguageSwitch tone="slab" />
          <form action={logout}>
            <SubmitButton
              variant="ghost"
              size="sm"
              className="text-slab-foreground hover:bg-[rgb(243_242_236/0.1)]"
              aria-label={tc("logout")}
            >
              <LogOut aria-hidden="true" className="size-4" />
              {tc("logout")}
            </SubmitButton>
          </form>
        </div>
      </aside>

      {/* Phones and tablets: compact header with the organisation on its own line, then swipeable tabs. */}
      <header className="border-b border-border bg-background md:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <BrandMark className="shrink-0 text-lg" />
          <div className="flex shrink-0 items-center gap-1">
            <LanguageSwitch />
            <form action={logout}>
              <SubmitButton variant="ghost" size="icon" aria-label={tc("logout")}>
                <LogOut aria-hidden="true" className="size-5" />
              </SubmitButton>
            </form>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 px-4 pb-2.5">
          <span className="min-w-0 truncate font-bold">{org?.name}</span>
          {org && <Badge tone="brand">{sector}</Badge>}
        </div>
        <Sidebar variant="strip" />
      </header>

      <main id="main" className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 md:px-10 md:py-10">
        {children}
      </main>
    </div>
  );
}
