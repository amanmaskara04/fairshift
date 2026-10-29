/** FairShift wordmark: a lime "shift" tile with a clock hand, set in the display face. */
export function BrandMark({ className = "text-xl", tone = "default" }: { className?: string; tone?: "default" | "slab" }) {
  return (
    <span className={`font-display inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.25em]">
        <rect x="1" y="1" width="22" height="22" rx="7" fill="var(--accent)" />
        <circle cx="12" cy="12" r="6.5" fill="none" stroke="#0c1a16" strokeWidth="2" />
        <path d="M12 8.5V12l2.5 1.5" fill="none" stroke="#0c1a16" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className={tone === "slab" ? "text-slab-foreground" : undefined}>FairShift</span>
    </span>
  );
}
