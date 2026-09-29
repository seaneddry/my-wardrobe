import { config } from '../config';
import { compressImage } from '../lib/image';
import { CACHE_KEYS, readJSON, writeJSON } from '../lib/storage';
import { supabase } from '../lib/supabase';

const FULL_EDGE = 1600;
const THUMB_EDGE = 480;
/** Signed URLs last 7 days and are reused, so the device can cache the photos. */
const URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const RENEW_BEFORE_MS = 1000 * 60 * 60 * 24;

export async function uploadItemPhoto(userId: string, itemId: string, file: Blob) {
  const [full, thumb] = await Promise.all([
    compressImage(file, FULL_EDGE, 0.82),
    compressImage(file, THUMB_EDGE, 0.78),
  ]);
  // A unique name means a replaced photo gets a new URL, so no stale caches.
  const base = `${userId}/${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const photo_path = `${base}.jpg`;
  const thumb_path = `${base}-thumb.jpg`;
  const bucket = supabase.storage.from(config.bucket);
  const options = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
  const [a, b] = await Promise.all([bucket.upload(photo_path, full, options), bucket.upload(thumb_path, thumb, options)]);
  if (a.error || b.error) {
    await removePhotos([photo_path, thumb_path]);
    throw new Error(`Photo upload failed: ${(a.error ?? b.error)?.message}`);
  }
  return { photo_path, thumb_path };
}

export async function removePhotos(paths: Array<string | null | undefined>): Promise<void> {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  await supabase.storage.from(config.bucket).remove(list);
  const cache = loadUrlCache();
  list.forEach((p) => delete cache[p]);
  writeJSON(CACHE_KEYS.photoUrls, cache);
}

// ---------------------------------------------------------------------------
// Signed URL batching and caching
// ---------------------------------------------------------------------------
type UrlCache = Record<string, { url: string; expires: number }>;

let memoryCache: UrlCache | null = null;
function loadUrlCache(): UrlCache {
  if (!memoryCache) memoryCache = readJSON<UrlCache>(CACHE_KEYS.photoUrls) ?? {};
  return memoryCache;
}

export function clearPhotoUrlCache(): void {
  memoryCache = {};
}

let pending = new Map<string, Array<(url: string | null) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Returns a viewable URL for a stored photo. Requests made together are batched into one call. */
export function photoUrl(path: string): Promise<string | null> {
  const cached = loadUrlCache()[path];
  if (cached && cached.expires - Date.now() > RENEW_BEFORE_MS) return Promise.resolve(cached.url);
  return new Promise((resolve) => {
    const waiting = pending.get(path) ?? [];
    waiting.push(resolve);
    pending.set(path, waiting);
    if (!timer) timer = setTimeout(flush, 30);
  });
}

async function flush() {
  timer = null;
  const batch = pending;
  pending = new Map();
  const paths = [...batch.keys()];
  const cache = loadUrlCache();
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { data, error } = await supabase.storage.from(config.bucket).createSignedUrls(chunk, URL_TTL_SECONDS);
    const expires = Date.now() + URL_TTL_SECONDS * 1000;
    chunk.forEach((path) => {
      const hit = error ? null : data?.find((d) => d.path === path && !d.error && d.signedUrl);
      if (hit?.signedUrl) cache[path] = { url: hit.signedUrl, expires };
      batch.get(path)?.forEach((resolve) => resolve(hit?.signedUrl ?? null));
    });
  }
  writeJSON(CACHE_KEYS.photoUrls, cache);
}
