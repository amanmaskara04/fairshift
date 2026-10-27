/**
 * Format paise amount as INR currency string.
 * Uses Indian numbering format (lakhs/crores).
 */
export function formatINR(paise: number, locale: string = "en-IN"): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format minutes as human-readable duration "Xh Ym".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
