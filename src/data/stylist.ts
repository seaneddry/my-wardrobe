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

export const WEATHER_OPTIONS = ['Hot and sunny', 'Humid', 'Rainy', 'Cool (air-con)'];

/**
 * The stylist's instructions. They live in the app (not the server function) so they
 * can be improved with a normal app update. The function falls back to its own copy
 * if these are missing.
 */
export const STYLIST_RULES = `You are a friendly, practical personal stylist for someone living in Malaysia (tropical: hot, humid, frequent rain, strong air-conditioning indoors). Suggest exactly 3 distinct outfits for the brief below, built ONLY from the wardrobe pieces listed. Never invent pieces.

Slots: "head" (hats, caps), "outer" (jackets, blazers, cardigans), "top", "bottom", "full" (dresses, jumpsuits), "shoes", "accessory".

Rules for each outfit:
- Use either one "top" and one "bottom", or one "full" piece instead of both.
- Always include one "shoes" piece when any shoes are listed.
- Add one "head" piece when it suits the occasion and weather (for example a cap for casual sunny days). Leave it out for formal or work outfits unless the brief asks for it.
- Optionally add one "outer" piece (useful for air-conditioned places or rain) and up to two "accessory" pieces when they help the look.
- Never use two pieces from the same slot, except accessories.
- Respect the occasion's formality, the mood and the weather. Prefer pieces tagged with the occasion when that makes sense. Favour breathable, light pieces for hot or humid weather.
- Think about colour harmony and proportion. Make the 3 outfits clearly different from each other.
- Refer to pieces by their ref values only, in the "pieces" array.
- In "why" and "tip", mention pieces by their name or colour and type, never by ref. Keep them short and specific.`;

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
      occasions: i.occasions,
      condition: i.condition ?? undefined,
    };
  });

  const res = await callFunction(
    'stylist',
    { action: 'suggest', rules: STYLIST_RULES, occasion: brief.occasion, mood: brief.mood, weather: brief.weather, notes: brief.notes.trim(), pieces },
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
