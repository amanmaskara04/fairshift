import { requireRole } from "@/server/dal";
import { LanguageSwitch } from "@/components/language-switch";
import { BottomNav } from "@/components/worker/bottom-nav";
import { OfflineSync } from "@/components/worker/offline-sync";

export default async function WorkerLayout({ children }: LayoutProps<"/w">) {
  await requireRole("worker");

  return (
    <div className="worker flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <span className="text-xl font-bold text-brand">FairShift</span>
          <LanguageSwitch />
        </div>
      </header>
      <OfflineSync />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
