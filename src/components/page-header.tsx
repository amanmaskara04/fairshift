import type { ReactNode } from "react";

/** Masthead used on every inner page: small label, big title, optional action (e.g. read-aloud). */
export function PageHeader({ eyebrow, title, action, children }: { eyebrow?: string; title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1 pb-1">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="text-muted-foreground">{children}</div>}
    </header>
  );
}

/** Today's date in IST, e.g. "Tue, 27 Oct". */
export function todayLabel(locale: string): string {
  const tag = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN" }[locale] ?? "en-IN";
  return new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date());
}
