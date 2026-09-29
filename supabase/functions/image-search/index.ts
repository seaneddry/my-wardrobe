// =============================================================================
// My Wardrobe — Edge Function "image-search"
//
// Two jobs, both for signed-in users only:
//   { action: "search", query }  → finds product photos online (Google Images via SerpApi)
//   { action: "fetch",  url }    → downloads one chosen photo so the app can save a copy
//
// Secrets (Supabase → Edge Functions → Secrets):
//   SERPAPI_KEY      required — free key from serpapi.com (250 searches/month, no card)
//   BRAVE_API_KEY    optional alternative, used only if SERPAPI_KEY isn't set
// =============================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** Confirms the caller is a signed-in user of this project. */
async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization');
  const apikey = req.headers.get('apikey');
  const base = Deno.env.get('SUPABASE_URL');
  if (!auth?.startsWith('Bearer ') || !apikey || !base) return false;
  const res = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  return res.ok;
}

interface Result {
  thumbnail: string;
  original: string;
  title: string;
  source: string;
  page: string;
  width?: number;
  height?: number;
}

async function searchSerpApi(query: string, key: string): Promise<Result[]> {
  const params = new URLSearchParams({ engine: 'google_images', q: query, api_key: key, safe: 'active', ijn: '0' });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) });
  const data = await res.json();
  if (!res.ok || data.error) {
    if (typeof data.error === 'string' && /hasn't returned any results/i.test(data.error)) return [];
    throw new Error(data.error ?? `Search service error (${res.status})`);
  }
  // deno-lint-ignore no-explicit-any
  return (data.images_results ?? []).map((i: any) => ({
    thumbnail: i.thumbnail,
    original: i.original,
    title: i.title ?? '',
    source: i.source ?? '',
    page: i.link ?? '',
    width: i.original_width,
    height: i.original_height,
  }));
}

async function searchBrave(query: string, key: string): Promise<Result[]> {
  const params = new URLSearchParams({ q: query, count: '50', safesearch: 'strict' });
  const res = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.detail ?? `Search service error (${res.status})`);
  // deno-lint-ignore no-explicit-any
  return (data.results ?? []).map((i: any) => ({
    thumbnail: i.thumbnail?.src,
    original: i.properties?.url,
    title: i.title ?? '',
    source: i.source ?? '',
    page: i.url ?? '',
    width: i.properties?.width,
    height: i.properties?.height,
  }));
}

async function search(query: unknown): Promise<Response> {
  if (typeof query !== 'string' || !query.trim()) return json({ error: 'Type what to search for.' }, 400);
  const q = query.trim().slice(0, 200);
  const serp = Deno.env.get('SERPAPI_KEY');
  const brave = Deno.env.get('BRAVE_API_KEY');
  if (!serp && !brave) return json({ error: 'not_configured' }, 503);
  const results = serp ? await searchSerpApi(q, serp) : await searchBrave(q, brave!);
  const clean = results.filter((r) => r.thumbnail && r.original?.startsWith('http')).slice(0, 40);
  return json({ results: clean });
}

/** Blocks requests to local or private network addresses. */
function isPublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const h = url.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
  if (h.startsWith('[') || h === '::1') return false;
  return true;
}

async function fetchImage(url: unknown): Promise<Response> {
  if (typeof url !== 'string' || !isPublicUrl(url)) return json({ error: 'That image address isn’t allowed.' }, 400);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return json({ error: 'The website didn’t respond. Try another photo.' }, 502);
  }
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/') || type.includes('svg')) {
    return json({ error: 'This website doesn’t allow its photo to be downloaded. Try another one.' }, 502);
  }
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_IMAGE_BYTES) return json({ error: 'That photo is too large.' }, 413);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: 'That photo is too large.' }, 413);
  return new Response(bytes, { headers: { ...CORS, 'Content-Type': type, 'Cache-Control': 'no-store' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    if (!(await isSignedIn(req))) return json({ error: 'Please sign in again.' }, 401);
    const body = await req.json().catch(() => ({}));
    if (body.action === 'search') return await search(body.query);
    if (body.action === 'fetch') return await fetchImage(body.url);
    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500);
  }
});
