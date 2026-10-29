import Link from "next/link";
import { requireRole } from "@/server/dal";
import { LanguageSwitch } from "@/components/language-switch";
import { BottomNav, TopNav } from "@/components/worker/bottom-nav";
import { OfflineSync } from "@/components/worker/offline-sync";
import { BrandMark } from "@/components/brand-mark";

export default async function WorkerLayout({ children }: LayoutProps<"/w">) {
  await requireRole("worker");

  return (
    <div className="worker flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-5 py-2.5 md:max-w-5xl md:px-8">
          <Link href="/w" className="rounded-xl">
            <BrandMark />
          </Link>
          <TopNav />
          <LanguageSwitch />
        </div>
      </header>
      <OfflineSync />
      {/* Bottom padding keeps the last item clear of the floating phone tab bar (and Android's gesture bar). */}
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-5 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:max-w-5xl md:px-8 md:pt-10 md:pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
