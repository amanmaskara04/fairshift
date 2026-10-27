// ─── FairShift Pay Periods ──────────────────────────────────────────
// Pay periods are IST calendar months, identified as 'YYYY-MM'.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** 'YYYY-MM' of the IST month containing `date`, shifted by `offset` months. */
export function monthKey(date: Date, offset = 0): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** UTC instants bounding an IST month: [start, end). */
export function monthRange(key: string): { start: Date; end: Date } {
  const [y, m] = key.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS),
  };
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
