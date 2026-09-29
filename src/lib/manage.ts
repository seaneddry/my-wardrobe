import type { FieldDefinition, FieldType, Item, LookupList } from '../data/types';

export const LIST_INFO: Record<LookupList, { title: string; noun: string; help: string }> = {
  category: {
    title: 'Categories',
    noun: 'category',
    help: 'The main groups your pieces are sorted into. Every piece needs one. Each category also has a place in outfits (top, bottom, shoes and so on), which the outfit builder and stylist use; tap edit to change it.',
  },
  colour: {
    title: 'Colours',
    noun: 'colour',
    help: 'Each colour has a swatch that shows on the form, in filters and on your pieces.',
  },
  size: {
    title: 'Sizes',
    noun: 'size',
    help: 'Suggested when you type a size. You can still enter any size on a piece, such as 32 or 42.',
  },
  season: { title: 'Seasons', noun: 'season', help: 'A piece can have several. "All year" pieces match any season filter.' },
  occasion: { title: 'Occasions', noun: 'occasion', help: 'A piece can have several. Used for filtering.' },
  condition: { title: 'Conditions', noun: 'condition', help: 'How worn a piece is. A piece has at most one.' },
  mood: { title: 'Moods', noun: 'mood', help: 'How you want to feel. Offered to the stylist and when saving an outfit.' },
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Pick one',
  multiselect: 'Pick several',
  boolean: 'Yes or no',
};

export const hasOptions = (t: FieldType) => t === 'select' || t === 'multiselect';

/** How many pieces use a list value. */
export function lookupUsage(items: Item[], list: LookupList, value: string): number {
  return items.filter((i) => {
    switch (list) {
      case 'category':
        return i.category === value;
      case 'colour':
        return i.colour === value || i.secondary_colour === value;
      case 'size':
        return i.size === value;
      case 'condition':
        return i.condition === value;
      case 'season':
        return i.seasons.includes(value);
      case 'occasion':
        return i.occasions.includes(value);
      case 'mood':
        return false;
    }
  }).length;
}

/** How many pieces have a value for a custom field. */
export function fieldUsage(items: Item[], key: string): number {
  return items.filter((i) => {
    const v = i.attributes[key];
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;
}

export function piecesLabel(n: number): string {
  if (n === 0) return 'Not used yet';
  return `Used on ${n} ${n === 1 ? 'piece' : 'pieces'}`;
}

/** Builds a storage key from a label, e.g. "Care label" → "care_label", unique among existing fields. */
export function fieldKeyFor(label: string, existing: FieldDefinition[]): string {
  let base = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (!base) base = 'field';
  if (!/^[a-z]/.test(base)) base = `f_${base}`;
  const taken = new Set(existing.map((f) => f.key));
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;
  return key;
}

/** Returns a copy of the array with the element at `index` moved by `delta`. */
export function move<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
