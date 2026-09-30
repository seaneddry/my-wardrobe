import type { Item, Lookup, Outfit, OutfitPiece, SlotKey } from '../data/types';

/** Rows of the outfit builder, top to bottom. */
export const BUILDER_SLOTS = ['head', 'outer', 'top', 'bottom', 'shoes', 'accessory'] as const;
export type BuilderSlot = (typeof BUILDER_SLOTS)[number];

export const SLOT_LABELS: Record<SlotKey, string> = {
  head: 'Headwear',
  outer: 'Outerwear',
  top: 'Top',
  bottom: 'Bottom',
  full: 'Dress or one-piece',
  shoes: 'Shoes',
  accessory: 'Accessory',
  none: 'Not used in outfits',
};

/** Slots that can be left empty in an outfit. */
export const OPTIONAL_SLOTS = new Set<BuilderSlot>(['head', 'outer', 'accessory']);

/** Short hints shown in an empty builder row. */
export const EMPTY_HINTS: Record<BuilderSlot, string> = {
  head: 'No hats or caps yet',
  outer: 'No outerwear yet',
  top: 'No tops yet',
  bottom: 'No bottoms yet',
  shoes: 'No shoes yet',
  accessory: 'No accessories yet',
};

/** Best guess for a category's slot from its name, used until one is set in Manage. */
export function guessSlot(category: string): SlotKey {
  const c = category.toLowerCase();
  if (/\bhats?\b|\bcaps?\b|beanie|beret|fedora|bucket|headwear|headband|visor/.test(c)) return 'head';
  if (/dress|jumpsuit|romper|playsuit|overall|dungaree|kurung|kebaya|abaya|saree|sari/.test(c)) return 'full';
  if (/outer|jacket|coat|blazer|suit|parka|cardigan|vest|gilet/.test(c)) return 'outer';
  if (/bottom|trouser|pant|jean|short|skirt|chino|legging|sarong/.test(c)) return 'bottom';
  if (/shoe|sneaker|trainer|boot|sandal|loafer|heel|slipper|footwear/.test(c)) return 'shoes';
  if (/bag|accessor|belt|scarf|jewel|watch|tie|sock|glass|sunglass|wallet|ring|necklace/.test(c)) return 'accessory';
  if (/top|shirt|tee|knit|sweater|jumper|hoodie|blouse|polo|tank|activewear|sport/.test(c)) return 'top';
  return 'none';
}

export function slotForCategory(category: string, categories: Lookup[]): SlotKey {
  const set = categories.find((l) => l.value === category)?.meta.slot;
  return set ?? guessSlot(category);
}

/** The builder row a piece belongs in ("full" pieces live in the Top row). */
export function rowForSlot(slot: SlotKey): BuilderSlot | null {
  if (slot === 'full') return 'top';
  if (slot === 'none') return null;
  return slot;
}

export type Selection = Record<BuilderSlot, string | null>;

export const EMPTY_SELECTION: Selection = { head: null, outer: null, top: null, bottom: null, shoes: null, accessory: null };

/** Groups active pieces into builder rows, optionally keeping only those for an occasion. */
export function piecesByRow(items: Item[], categories: Lookup[], occasion: string | null): Record<BuilderSlot, Item[]> {
  const rows: Record<BuilderSlot, Item[]> = { head: [], outer: [], top: [], bottom: [], shoes: [], accessory: [] };
  for (const item of items) {
    if (item.status !== 'active') continue;
    const row = rowForSlot(slotForCategory(item.category, categories));
    if (row) rows[row].push(item);
  }
  if (occasion) {
    // Keep pieces tagged with the occasion, plus untagged ones; fall back to all if nothing is tagged.
    for (const slot of BUILDER_SLOTS) {
      const matching = rows[slot].filter((i) => i.occasions.length === 0 || i.occasions.includes(occasion));
      if (matching.length) rows[slot] = matching;
    }
  }
  return rows;
}

function pick<T>(list: T[], avoid?: T): T | undefined {
  if (list.length === 0) return undefined;
  if (list.length > 1 && avoid !== undefined) {
    const others = list.filter((x) => x !== avoid);
    return others[Math.floor(Math.random() * others.length)];
  }
  return list[Math.floor(Math.random() * list.length)];
}

/** Random outfit, keeping locked rows. Optional rows are filled about half the time. */
export function shuffle(
  current: Selection,
  locked: Set<BuilderSlot>,
  rows: Record<BuilderSlot, Item[]>,
  isFull: (id: string | null) => boolean,
): Selection {
  const next: Selection = { ...current };
  for (const slot of BUILDER_SLOTS) {
    if (locked.has(slot)) continue;
    const ids = rows[slot].map((i) => i.id);
    if (OPTIONAL_SLOTS.has(slot) && Math.random() < 0.45) {
      next[slot] = null;
      continue;
    }
    next[slot] = pick(ids, current[slot] ?? undefined) ?? null;
  }
  // A dress or jumpsuit on top means no separate bottom.
  if (isFull(next.top) && !locked.has('bottom')) next.bottom = null;
  return next;
}

export function selectionToPieces(sel: Selection, slotOf: (id: string) => SlotKey): OutfitPiece[] {
  return BUILDER_SLOTS.flatMap((row) => {
    const id = sel[row];
    return id ? [{ slot: slotOf(id), item_id: id }] : [];
  });
}

export function piecesToSelection(pieces: OutfitPiece[]): Selection {
  const sel: Selection = { ...EMPTY_SELECTION };
  for (const p of pieces) {
    const row = rowForSlot(p.slot);
    if (row && !sel[row]) sel[row] = p.item_id;
  }
  return sel;
}

/** Pieces of an outfit that still exist, in display order. */
export function outfitItems(outfit: Pick<Outfit, 'pieces'>, items: Item[]): Item[] {
  const order: SlotKey[] = ['head', 'outer', 'top', 'full', 'bottom', 'shoes', 'accessory', 'none'];
  return [...outfit.pieces]
    .sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot))
    .map((p) => items.find((i) => i.id === p.item_id))
    .filter((i): i is Item => Boolean(i));
}

export function defaultOutfitName(occasion: string | null): string {
  const day = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return occasion ? `${occasion} look, ${day}` : `Outfit, ${day}`;
}
