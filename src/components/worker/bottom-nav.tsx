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

/** Phone: a floating evergreen tab bar in thumb reach, clear of the gesture bar. */
export function BottomNav() {
  const t = useTranslations("worker.nav");
  const isCurrent = useIsCurrent();

  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[26px] bg-slab p-1.5 shadow-[0_18px_40px_-18px_rgb(12_26_22/0.7)]">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = isCurrent(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[20px] text-xs font-bold transition-colors duration-200",
                  current ? "bg-accent text-accent-foreground" : "text-slab-muted hover:text-slab-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
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
      <ul className="flex items-center gap-1 rounded-full bg-muted p-1">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = isCurrent(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200",
                  current ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
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
