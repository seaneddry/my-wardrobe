import { itemTitle, type Item } from '../data/types';

/** Search, sort and filter for the For Sale screen. Separate from the wardrobe's own filters. */
export type SaleSortKey = 'newest' | 'oldest' | 'price_high' | 'price_low' | 'name';

export interface SaleFilters {
  q: string;
  category: string | null;
  colours: string[];
  sizes: string[];
  price: 'all' | 'priced' | 'unpriced';
  sort: SaleSortKey;
}

export const DEFAULT_SALE_FILTERS: SaleFilters = {
  q: '',
  category: null,
  colours: [],
  sizes: [],
  price: 'all',
  sort: 'newest',
};

export const SALE_SORT_LABELS: Record<SaleSortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  price_high: 'Price: high to low',
  price_low: 'Price: low to high',
  name: 'Name A–Z',
};

const STORE_KEY = 'sale-filters';

export function loadSaleFilters(): SaleFilters {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_SALE_FILTERS, ...JSON.parse(raw) } : DEFAULT_SALE_FILTERS;
  } catch {
    return DEFAULT_SALE_FILTERS;
  }
}

export function saveSaleFilters(f: SaleFilters): void {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

/** Filters set in the sheet (search and category are visible on screen). Sort isn't counted. */
export function saleSheetCount(f: SaleFilters): number {
  return f.colours.length + f.sizes.length + (f.price !== 'all' ? 1 : 0);
}

/** True when anything narrows the list (not just the sort order). */
export function saleNarrowed(f: SaleFilters): boolean {
  return Boolean(f.q.trim() || f.category || saleSheetCount(f) > 0);
}

/** Search looks only at the name, brand and type. */
function searchText(item: Item): string {
  return [itemTitle(item), item.name, item.brand, item.item_type, item.category].filter(Boolean).join(' ').toLowerCase();
}

/** The date that matters for a piece: sold date once sold, otherwise listed date. */
function saleDate(item: Item): string {
  return (item.status === 'sold' ? item.sold_at : item.listed_at) ?? item.updated_at;
}

export function applySaleFilters(items: Item[], f: SaleFilters): Item[] {
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const result = items.filter((item) => {
    if (f.category && item.category !== f.category) return false;
    if (f.colours.length && !f.colours.some((c) => c === item.colour || c === item.secondary_colour)) return false;
    if (f.sizes.length && !(item.size && f.sizes.includes(item.size))) return false;
    if (f.price === 'priced' && item.sale_price == null) return false;
    if (f.price === 'unpriced' && item.sale_price != null) return false;
    if (terms.length) {
      const text = searchText(item);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });

  const byTitle = (a: Item, b: Item) => itemTitle(a).localeCompare(itemTitle(b));
  // Pieces without a price always go last when sorting by price.
  const byPrice = (dir: 1 | -1) => (a: Item, b: Item) => {
    if (a.sale_price == null && b.sale_price == null) return byTitle(a, b);
    if (a.sale_price == null) return 1;
    if (b.sale_price == null) return -1;
    return (a.sale_price - b.sale_price) * dir || byTitle(a, b);
  };
  switch (f.sort) {
    case 'oldest':
      return result.sort((a, b) => saleDate(a).localeCompare(saleDate(b)));
    case 'price_high':
      return result.sort(byPrice(-1));
    case 'price_low':
      return result.sort(byPrice(1));
    case 'name':
      return result.sort(byTitle);
    default:
      return result.sort((a, b) => saleDate(b).localeCompare(saleDate(a)));
  }
}
