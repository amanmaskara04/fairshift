/** FairShift wordmark: a clock-face "O" in the shift colours, set in the display face. */
export function BrandMark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-display inline-flex items-center gap-1.5 font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.1em]">
        <circle cx="12" cy="12" r="10" fill="var(--accent)" stroke="var(--ink-line)" strokeWidth="2" />
        <path d="M12 6v6l4 2" fill="none" stroke="var(--ink-line)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      FairShift
    </span>
  );
}
