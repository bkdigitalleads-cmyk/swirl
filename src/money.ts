/** Currency helpers. Values are stored as integer cents (USD display). */

/**
 * Parse a user-typed dollar amount ("1,299.99", "$450", "1299") into cents.
 * Returns 0 for empty/invalid input; never negative; caps at $99,999,999.
 */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n * 100), 9_999_999_900);
}

/** Format cents as "$1,299.99"; whole dollars drop the ".00" ("$450"). */
export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rem = Math.abs(cents % 100);
  const grouped = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rem === 0 ? `$${grouped}` : `$${grouped}.${String(rem).padStart(2, '0')}`;
}

/** Editable text for a stored value ("1299.99"), empty for zero. */
export function centsToEditable(cents: number): string {
  if (cents <= 0) return '';
  const s = (cents / 100).toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}
