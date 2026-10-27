import { requireRole } from "@/server/dal";
import { LanguageSwitch } from "@/components/language-switch";
import { BottomNav } from "@/components/worker/bottom-nav";
import { OfflineSync } from "@/components/worker/offline-sync";
import { BrandMark } from "@/components/brand-mark";

export default async function WorkerLayout({ children }: LayoutProps<"/w">) {
  await requireRole("worker");

  return (
    <div className="worker flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="hazard-tape" aria-hidden="true" />
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <BrandMark />
          <LanguageSwitch />
        </div>
      </header>
      <OfflineSync />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-5 pt-6 pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
