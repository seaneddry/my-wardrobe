import { config } from '../config';
import { supabase } from '../lib/supabase';

export interface WebImage {
  thumbnail: string;
  original: string;
  title: string;
  source: string;
  page: string;
  width?: number;
  height?: number;
}

export class NotSetUpError extends Error {
  constructor() {
    super('Online photo search isn’t set up yet. Follow “Set up online photo search” in docs/UPGRADING.md.');
  }
}

/** Calls the "image-search" Edge Function as the signed-in user. */
async function call(body: Record<string, unknown>): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  let res: Response;
  try {
    res = await fetch(`${config.supabaseUrl}/functions/v1/image-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: config.supabaseKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Couldn’t reach the search service. Check your connection.');
  }
  if (res.status === 404) throw new NotSetUpError();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === 'not_configured') throw new NotSetUpError();
    throw new Error(err.error ?? err.msg ?? err.message ?? `Search failed (${res.status}).`);
  }
  return res;
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
