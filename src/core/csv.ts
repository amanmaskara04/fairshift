// ─── CSV export helpers ─────────────────────────────────────────────

/**
 * Quote a cell and neutralise spreadsheet formula injection: values starting with
 * = + - @ (or tab/CR) are prefixed with an apostrophe so Excel/Sheets treat them as text.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) || text !== String(value) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Paise → rupees with 2 decimals, as a plain number string for spreadsheets. */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}
