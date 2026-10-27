"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { HardHat, IndianRupee, LayoutDashboard, MapPin, MessageSquare, QrCode, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/a", key: "overview", Icon: LayoutDashboard },
  { href: "/a/hazards", key: "hazards", Icon: TriangleAlert },
  { href: "/a/people", key: "people", Icon: HardHat },
  { href: "/a/feedback", key: "feedback", Icon: MessageSquare },
  { href: "/a/payroll", key: "payroll", Icon: IndianRupee },
  { href: "/a/sites", key: "sites", Icon: MapPin },
  { href: "/a/kiosk", key: "kiosk", Icon: QrCode },
] as const;

export function Sidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <nav aria-label={t("navLabel")} className="border-border md:w-56 md:border-r">
      <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = href === "/a" ? pathname === "/a" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-admin px-3 font-medium",
                  current ? "bg-brand text-brand-foreground" : "hover:bg-muted",
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
