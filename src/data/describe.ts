import { compressImage } from '../lib/image';
import { photoUrl } from './photos';
import { callFunction, NotSetUpError } from './functions';
import type { PhotoInput } from './webImages';

/**
 * Instructions for reading a photo of a piece. They live in the app so they can be
 * improved with a normal app update; the stylist function has a fallback copy.
 */
export const DESCRIBE_RULES = `You are cataloguing one piece of clothing from a photo for a personal wardrobe app. Look only at the main garment or item (ignore the background, hangers, furniture and any person). Fill in:
- category: from the allowed list, the best fit.
- item_type: a short specific type, such as "Oxford shirt", "Polo tee", "Chinos", "Sneakers", "Baseball cap", "Baju kurung".
- name: 2 to 4 plain words, colour then type, e.g. "Navy oxford shirt".
- colour: the main colour, from the allowed list.
- secondary_colour: a clearly visible second colour from the allowed list, or "None".
- brand: only if a brand name or logo is clearly readable in the photo, otherwise "". Never guess a brand.
- occasions: 1 to 3 from the allowed list that this piece suits.`;

export interface PhotoDetails {
  category: string | null;
  item_type: string | null;
  name: string | null;
  colour: string | null;
  secondary_colour: string | null;
  brand: string | null;
  occasions: string[];
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('The photo couldn’t be read.'));
    reader.readAsDataURL(blob);
  });
}

async function blobFor(photo: PhotoInput): Promise<Blob> {
  if ('blob' in photo) return photo.blob;
  const url = await photoUrl(photo.path);
  if (!url) throw new Error('The photo couldn’t be loaded.');
  const res = await fetch(url);
  if (!res.ok) throw new Error('The photo couldn’t be loaded.');
  return await res.blob();
}

/** Picks the matching value from a list, ignoring case; null if it isn't in the list. */
function fromList(value: unknown, list: string[]): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim().toLowerCase();
  return list.find((x) => x.toLowerCase() === v) ?? null;
}

const clean = (v: unknown, max = 60) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Asks Gemini to read a photo and suggest details, restricted to your own lists. */
export async function describePhoto(
  photo: PhotoInput,
  lists: { categories: string[]; colours: string[]; occasions: string[] },
): Promise<PhotoDetails> {
  // Small enough to be quick and light on the free allowance, big enough to read a label.
  const small = await compressImage(await blobFor(photo), 1024, 0.8);
  const res = await callFunction(
    'stylist',
    {
      action: 'describe',
      rules: DESCRIBE_RULES,
      image: { mime: 'image/jpeg', data: await toBase64(small) },
      categories: lists.categories,
      colours: lists.colours,
      occasions: lists.occasions,
    },
    new NotSetUpError('The AI stylist', 'Set up the AI stylist'),
  );
  const data = await res.json();
  const d = data.details ?? {};
  const colour = fromList(d.colour, lists.colours);
  const second = fromList(d.secondary_colour, lists.colours);
  const brand = clean(d.brand, 40);
  return {
    category: fromList(d.category, lists.categories),
    item_type: clean(d.item_type),
    name: clean(d.name),
    colour,
    secondary_colour: second && second !== colour ? second : null,
    brand: brand && !/^(none|unknown|n\/a|no brand)$/i.test(brand) ? brand : null,
    occasions: Array.isArray(d.occasions)
      ? [...new Set((d.occasions as unknown[]).map((o) => fromList(o, lists.occasions)).filter((o): o is string => Boolean(o)))].slice(0, 3)
      : [],
  };
}
