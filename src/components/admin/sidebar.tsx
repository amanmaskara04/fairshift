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
    <nav aria-label={t("navLabel")} className="sticky top-0 z-10 border-b border-border bg-background md:static md:w-56 md:shrink-0 md:border-r md:border-b-0">
      {/* Phones: a swipeable tab strip with a fade on the right edge hinting there is more. */}
      <ul className="flex snap-x gap-1 overflow-x-auto p-2 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] md:flex-col md:[mask-image:none]">
        {ITEMS.map(({ href, key, Icon }) => {
          const current = href === "/a" ? pathname === "/a" : pathname.startsWith(href);
          return (
            <li key={href} className="snap-start">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-admin px-3 font-semibold transition-colors",
                  current
                    ? "bg-accent text-accent-foreground md:bg-card md:text-foreground md:shadow-[inset_4px_0_0_var(--accent)] md:ring-1 md:ring-border"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
