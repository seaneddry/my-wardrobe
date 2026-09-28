/** Small, failure-tolerant wrappers around localStorage. */
export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the app still works, just without the cache.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const CACHE_KEYS = {
  data: 'wardrobe-data-cache',
  photoUrls: 'wardrobe-photo-urls',
  filters: 'wardrobe-filters',
} as const;
