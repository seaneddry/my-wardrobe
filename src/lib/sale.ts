import type { Item, ItemStatus } from '../data/types';

/**
 * Selling pieces. The sale statuses are fixed in code (not a Manage list),
 * because the app relies on what "for sale" and "sold" mean.
 */
export type SaleStatus = Extract<ItemStatus, 'for_sale' | 'sold'>;

export const SALE_LABELS: Record<SaleStatus, string> = {
  for_sale: 'On sale',
  sold: 'Sold',
};

export function isSaleStatus(status: ItemStatus): status is SaleStatus {
  return status === 'for_sale' || status === 'sold';
}

/** Pieces you still have (not archived, not sold). */
export function isOwned(item: Pick<Item, 'status'>): boolean {
  return item.status === 'active' || item.status === 'for_sale';
}

/** Today as YYYY-MM-DD in the phone's own time zone. */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "RM 45" or "RM 45.50"; empty when no price is set. */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const whole = Number.isInteger(value);
  return `RM ${value.toLocaleString(undefined, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** Reads a typed price ("45", "45.50", "45,50"). Returns undefined when it isn't a valid price. */
export function parsePrice(text: string): number | null | undefined {
  const t = text.trim().replace(/^rm\s*/i, '');
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isNaN(n) || n < 0 ? undefined : Math.round(n * 100) / 100;
}

/** "28 Oct", or "28 Oct 2025" when it isn't this year. */
export function shortDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const sameYear = y === new Date().getFullYear();
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}
