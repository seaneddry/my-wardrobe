import { itemTitle, type Item } from '../data/types';

export type SortKey = 'newest' | 'oldest' | 'name' | 'purchased';

export interface Filters {
  q: string;
  category: string | null;
  colours: string[];
  sizes: string[];
  occasions: string[];
  status: 'active' | 'archived' | 'all';
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  category: null,
  colours: [],
  sizes: [],
  occasions: [],
  status: 'active',
  sort: 'newest',
};

export const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Recently added',
  oldest: 'Oldest added',
  name: 'Name A–Z',
  purchased: 'Recently bought',
};

const STORE_KEY = 'wardrobe-filters';

export function loadFilters(): Filters {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const { seasons: _old, ...saved } = JSON.parse(raw);
    return { ...DEFAULT_FILTERS, ...saved };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveFilters(f: Filters): void {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

/** Number of filters set in the filter sheet (search and category chips are visible on screen). */
export function sheetFilterCount(f: Filters): number {
  return f.colours.length + f.sizes.length + f.occasions.length + (f.status !== 'active' ? 1 : 0);
}

function searchText(item: Item): string {
  return [
    itemTitle(item),
    item.name,
    item.item_type,
    item.category,
    item.colour,
    item.secondary_colour,
    item.brand,
    item.size,
    item.notes,
    ...item.occasions,
    ...Object.values(item.attributes).flat().map((v) => (v === null ? '' : String(v))),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));

export function applyFilters(items: Item[], f: Filters): Item[] {
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const result = items.filter((item) => {
    if (f.status !== 'all' && item.status !== f.status) return false;
    if (f.category && item.category !== f.category) return false;
    if (f.colours.length && !f.colours.some((c) => c === item.colour || c === item.secondary_colour)) return false;
    if (f.sizes.length && !(item.size && f.sizes.includes(item.size))) return false;
    if (f.occasions.length && !overlaps(f.occasions, item.occasions)) return false;
    if (terms.length) {
      const text = searchText(item);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });

  const byTitle = (a: Item, b: Item) => itemTitle(a).localeCompare(itemTitle(b));
  switch (f.sort) {
    case 'oldest':
      return result.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'name':
      return result.sort(byTitle);
    case 'purchased':
      return result.sort((a, b) => {
        if (a.purchase_date === b.purchase_date) return byTitle(a, b);
        if (!a.purchase_date) return 1;
        if (!b.purchase_date) return -1;
        return b.purchase_date.localeCompare(a.purchase_date);
      });
    default:
      return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
