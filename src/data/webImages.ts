import { config } from '../config';
import { newId } from '../lib/id';
import { compressImage } from '../lib/image';
import { supabase } from '../lib/supabase';
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
  /** Shown for Google Lens product matches when Google knows it, e.g. "RM 129.00". */
  price?: string;
}

/** A photo to search with: either one already saved with the piece, or a new one not yet saved. */
export type PhotoInput = { path: string } | { blob: Blob };

const notSetUp = () => new NotSetUpError('Online photo search', 'Set up online photo search');

async function call(body: Record<string, unknown>): Promise<Response> {
  return callFunction('image-search', body, notSetUp());
}

export async function searchWebImages(query: string): Promise<WebImage[]> {
  const res = await call({ action: 'search', query });
  const data = await res.json();
  return data.results ?? [];
}

/**
 * Finds items that look like a photo (Google Lens). Lens needs a link it can open, so a
 * saved photo gets a 5-minute private link; a new photo is uploaded to a temporary file
 * in your own storage folder, used once, and deleted straight away.
 */
export async function searchByPhoto(photo: PhotoInput): Promise<WebImage[]> {
  const bucket = supabase.storage.from(config.bucket);
  let tempPath: string | null = null;
  try {
    let path: string;
    if ('path' in photo) {
      path = photo.path;
    } else {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) throw new Error('Please sign in again.');
      const small = await compressImage(photo.blob, 1000, 0.8);
      tempPath = `${uid}/tmp/lens-${newId()}.jpg`;
      const up = await bucket.upload(tempPath, small, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw new Error(`Couldn’t prepare the photo: ${up.error.message}`);
      path = tempPath;
    }
    const signed = await bucket.createSignedUrl(path, 300);
    if (signed.error || !signed.data?.signedUrl) throw new Error('Couldn’t prepare the photo for searching.');
    const res = await call({ action: 'lens', url: signed.data.signedUrl });
    const data = await res.json();
    return data.results ?? [];
  } finally {
    if (tempPath) bucket.remove([tempPath]).catch(() => undefined);
  }
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
