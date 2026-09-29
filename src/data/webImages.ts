import { callFunction, NotSetUpError } from './functions';

export { NotSetUpError };

export interface WebImage {
  thumbnail: string;
  original: string;
  title: string;
  source: string;
  page: string;
  width?: number;
  height?: number;
}

const notSetUp = () => new NotSetUpError('Online photo search', 'Set up online photo search');

async function call(body: Record<string, unknown>): Promise<Response> {
  return callFunction('image-search', body, notSetUp());
}

export async function searchWebImages(query: string): Promise<WebImage[]> {
  const res = await call({ action: 'search', query });
  const data = await res.json();
  return data.results ?? [];
}

/** Downloads the full-size photo through the Edge Function (websites usually block direct downloads). */
export async function fetchWebImage(url: string): Promise<Blob> {
  const res = await call({ action: 'fetch', url });
  return await res.blob();
}

/** Builds a sensible search from what's been typed on the form. */
export function buildQuery(parts: { brand?: string | null; name?: string | null; type?: string | null; colour?: string | null; category?: string }): string {
  const { brand, name, type, colour, category } = parts;
  const words: string[] = [];
  if (brand) words.push(brand);
  if (name) {
    words.push(name);
    if (colour && !name.toLowerCase().includes(colour.toLowerCase())) words.push(colour);
  } else {
    if (colour) words.push(colour);
    words.push(type || category || '');
  }
  return words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
