"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { House, IndianRupee, TriangleAlert, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/w", key: "home", Icon: House },
  { href: "/w/pay", key: "pay", Icon: IndianRupee },
  { href: "/w/report", key: "report", Icon: TriangleAlert },
  { href: "/w/skills", key: "me", Icon: UserRound },
] as const;

function useIsCurrent() {
  const pathname = usePathname();
  return (href: string) => (href === "/w" ? pathname === "/w" : pathname.startsWith(href));
}

/** Phone: fixed thumb-reach tab bar, solid so content never shows through, clear of the gesture bar. */
export function BottomNav() {
  const t = useTranslations("worker.nav");
  const isCurrent = useIsCurrent();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(28,27,24,0.06)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = isCurrent(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-colors", current && "bg-accent text-accent-foreground")}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Laptop/tablet: the same destinations as an inline header nav. */
export function TopNav() {
  const t = useTranslations("worker.nav");
  const isCurrent = useIsCurrent();

  return (
    <nav aria-label={t("label")} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = isCurrent(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                  current ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
