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

export function BottomNav() {
  const t = useTranslations("worker.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="sticky bottom-0 border-t-2 border-ink bg-background">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = href === "/w" ? pathname === "/w" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-bold",
                  current
                    ? "text-foreground before:absolute before:inset-x-4 before:top-0 before:h-1 before:rounded-b before:bg-accent"
                    : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
