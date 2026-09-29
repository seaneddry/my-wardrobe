import { itemTitle, type Item, type Lookup, type OutfitPiece } from './types';
import { callFunction, NotSetUpError } from './functions';
import { slotForCategory } from '../lib/outfits';

export interface StylistBrief {
  occasion: string | null;
  mood: string | null;
  weather: string | null;
  notes: string;
}

export interface Suggestion {
  key: string;
  title: string;
  why: string;
  tip: string;
  pieces: OutfitPiece[];
}

export const WEATHER_OPTIONS = ['Hot', 'Warm', 'Cool', 'Cold', 'Rainy'];

/**
 * Asks the "stylist" Edge Function for 3 outfits. Pieces are sent as short
 * text descriptions (no photos), labelled p1, p2… so the AI can't invent IDs.
 */
export async function askStylist(brief: StylistBrief, items: Item[], categories: Lookup[]): Promise<Suggestion[]> {
  const usable = items
    .filter((i) => i.status === 'active')
    .map((i) => ({ item: i, slot: slotForCategory(i.category, categories) }))
    .filter((x) => x.slot !== 'none');
  const refs = new Map<string, { item: Item; slot: OutfitPiece['slot'] }>();
  const pieces = usable.map((x, n) => {
    const ref = `p${n + 1}`;
    refs.set(ref, x);
    const i = x.item;
    return {
      ref,
      slot: x.slot,
      category: i.category,
      type: i.item_type ?? undefined,
      name: i.name ? itemTitle(i) : undefined,
      brand: i.brand ?? undefined,
      colour: i.colour ?? undefined,
      colour2: i.secondary_colour ?? undefined,
      seasons: i.seasons,
      occasions: i.occasions,
      condition: i.condition ?? undefined,
    };
  });

  const res = await callFunction(
    'stylist',
    { action: 'suggest', occasion: brief.occasion, mood: brief.mood, weather: brief.weather, notes: brief.notes.trim(), pieces },
    new NotSetUpError('The AI stylist', 'Set up the AI stylist'),
  );
  const data = await res.json();
  const raw: Array<{ title?: string; pieces?: string[]; why?: string; tip?: string }> = data.outfits ?? [];

  // Keep only real pieces, one per slot (accessories up to two), and drop empty outfits.
  return raw
    .map((o, n) => {
      const seen = new Set<string>();
      let accessories = 0;
      const chosen: OutfitPiece[] = [];
      for (const ref of o.pieces ?? []) {
        const hit = refs.get(String(ref).trim());
        if (!hit || seen.has(hit.item.id)) continue;
        const takenSlot = chosen.some((c) => c.slot === hit.slot);
        if (hit.slot === 'accessory') {
          if (accessories >= 2) continue;
          accessories++;
        } else if (takenSlot) continue;
        if (hit.slot === 'full' && chosen.some((c) => c.slot === 'top' || c.slot === 'bottom')) continue;
        if ((hit.slot === 'top' || hit.slot === 'bottom') && chosen.some((c) => c.slot === 'full')) continue;
        seen.add(hit.item.id);
        chosen.push({ slot: hit.slot, item_id: hit.item.id });
      }
      return {
        key: `${Date.now()}-${n}`,
        title: (o.title ?? '').trim() || `Idea ${n + 1}`,
        why: (o.why ?? '').trim(),
        tip: (o.tip ?? '').trim(),
        pieces: chosen,
      };
    })
    .filter((s) => s.pieces.length >= 2);
}
