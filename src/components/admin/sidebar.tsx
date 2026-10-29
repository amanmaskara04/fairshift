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

/** Admin navigation: a vertical rail on the dark sidebar, or a swipeable tab strip on phones. */
export function Sidebar({ variant }: { variant: "rail" | "strip" }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const rail = variant === "rail";

  return (
    <nav aria-label={t("navLabel")}>
      <ul
        className={cn(
          rail
            ? "flex flex-col gap-1"
            : "no-scrollbar flex snap-x gap-1.5 overflow-x-auto px-4 pb-3 [mask-image:linear-gradient(to_right,black_85%,transparent)]",
        )}
      >
        {ITEMS.map(({ href, key, Icon }) => {
          const current = href === "/a" ? pathname === "/a" : pathname.startsWith(href);
          return (
            <li key={href} className="snap-start">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 font-bold whitespace-nowrap transition-colors duration-200",
                  rail ? "min-h-11 rounded-xl px-3" : "min-h-10 rounded-full px-4 text-sm",
                  rail &&
                    (current ? "bg-accent text-accent-foreground" : "text-slab-muted hover:bg-[rgb(243_242_236/0.08)] hover:text-slab-foreground"),
                  !rail && (current ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
                )}
              >
                <Icon aria-hidden="true" className={rail ? "size-5" : "size-4"} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
