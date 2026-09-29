// =============================================================================
// My Wardrobe — Edge Function "stylist"
//
// Suggests outfits from the user's own wardrobe using Google Gemini.
// The app sends a short description of each piece (no photos) plus the
// occasion, mood, weather and notes. Gemini replies with 3 outfits that use
// only those pieces.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY   required — free key from https://aistudio.google.com/apikey
//   GEMINI_MODEL     optional — a model name to use instead of the defaults below
// =============================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Tried in order until one exists. Google renames models often; set GEMINI_MODEL to override.
const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization');
  const apikey = req.headers.get('apikey');
  const base = Deno.env.get('SUPABASE_URL');
  if (!auth?.startsWith('Bearer ') || !apikey || !base) return false;
  const res = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  return res.ok;
}

interface Piece {
  ref: string;
  slot: string;
  category: string;
  type?: string;
  name?: string;
  brand?: string;
  colour?: string;
  colour2?: string;
  seasons?: string[];
  occasions?: string[];
  condition?: string;
}

interface Brief {
  occasion?: string;
  mood?: string;
  weather?: string;
  notes?: string;
  pieces: Piece[];
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    outfits: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'A short, evocative name for the outfit, 2 to 5 words.' },
          pieces: { type: 'ARRAY', items: { type: 'STRING' }, description: 'The refs of the pieces used.' },
          why: { type: 'STRING', description: 'One or two sentences on why it suits the brief.' },
          tip: { type: 'STRING', description: 'One short styling tip.' },
        },
        required: ['title', 'pieces', 'why', 'tip'],
      },
    },
  },
  required: ['outfits'],
};

function describe(p: Piece): string {
  const bits = [
    `ref=${p.ref}`,
    `slot=${p.slot}`,
    p.name ? `name="${p.name}"` : '',
    `category=${p.category}`,
    p.type ? `type=${p.type}` : '',
    p.brand ? `brand=${p.brand}` : '',
    p.colour ? `colour=${p.colour}${p.colour2 ? `/${p.colour2}` : ''}` : '',
    p.seasons?.length ? `seasons=${p.seasons.join('|')}` : '',
    p.occasions?.length ? `occasions=${p.occasions.join('|')}` : '',
    p.condition ? `condition=${p.condition}` : '',
  ];
  return '- ' + bits.filter(Boolean).join(', ');
}

function buildPrompt(b: Brief): string {
  const brief = [
    b.occasion ? `Occasion: ${b.occasion}` : 'Occasion: any',
    b.mood ? `Mood: ${b.mood}` : '',
    b.weather ? `Weather: ${b.weather}` : '',
    b.notes ? `Extra wishes from the wearer: ${b.notes}` : '',
  ].filter(Boolean).join('\n');

  return `You are a friendly, practical personal stylist. Suggest exactly 3 distinct outfits for the brief below, built ONLY from the wardrobe pieces listed. Never invent pieces.

Rules for each outfit:
- Use either one "top" and one "bottom", or one "full" piece (like a dress or jumpsuit) instead of both.
- Add one "shoes" piece if any are available.
- Optionally add one "outer" piece and up to two "accessory" pieces when they help the look.
- Never use two pieces from the same slot, except accessories.
- Respect the occasion's formality, the mood, and the weather. Prefer pieces tagged with the occasion or season when that makes sense.
- Think about colour harmony and proportion. Make the 3 outfits clearly different from each other.
- Refer to pieces by their ref values only, in the "pieces" array.
- In "why" and "tip", mention pieces by their name or colour and type, never by ref. Keep them short and specific.

Brief:
${brief}

Wardrobe:
${b.pieces.map(describe).join('\n')}`;
}

async function callGemini(model: string, key: string, prompt: string, withSchema: boolean): Promise<Response> {
  const generationConfig: Record<string, unknown> = { responseMimeType: 'application/json', temperature: 0.9 };
  if (withSchema) generationConfig.responseSchema = SCHEMA;
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
    signal: AbortSignal.timeout(55000),
  });
}

function parseOutfits(data: unknown): unknown[] {
  // deno-lint-ignore no-explicit-any
  const parts = (data as any)?.candidates?.[0]?.content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  const text = parts.map((p: any) => p.text ?? '').join('').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  if (!text) throw new Error('The stylist returned an empty answer. Try again.');
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.outfits ?? [];
}

async function suggest(b: Brief): Promise<Response> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: 'not_configured' }, 503);
  if (!Array.isArray(b.pieces) || b.pieces.length < 2) return json({ error: 'Add a few more pieces to your wardrobe first.' }, 400);

  const pieces = b.pieces.slice(0, 400);
  const prompt = buildPrompt({ ...b, pieces });
  const custom = Deno.env.get('GEMINI_MODEL')?.trim();
  const models = custom ? [custom] : DEFAULT_MODELS;

  let lastError = 'The stylist is unavailable right now.';
  for (const model of models) {
    let res = await callGemini(model, key, prompt, true);
    if (res.status === 400) {
      // Some models reject the schema format; ask for plain JSON instead.
      res = await callGemini(model, key, prompt, false);
    }
    if (res.status === 404) {
      lastError = `Model ${model} isn’t available.`;
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return json({ error: 'The free AI limit has been reached for now. Try again later.' }, 429);
    if (res.status === 400 || res.status === 403) {
      const msg = data?.error?.message ?? '';
      if (/api key/i.test(msg)) return json({ error: 'The Gemini API key isn’t valid. Check GEMINI_API_KEY in Supabase.' }, 400);
      return json({ error: msg || 'The stylist couldn’t handle that request.' }, 400);
    }
    if (!res.ok) {
      lastError = data?.error?.message ?? `The stylist returned an error (${res.status}).`;
      continue;
    }
    try {
      return json({ outfits: parseOutfits(data), model });
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'The stylist’s answer couldn’t be read.';
    }
  }
  return json({ error: lastError }, 502);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    if (!(await isSignedIn(req))) return json({ error: 'Please sign in again.' }, 401);
    const body = await req.json().catch(() => ({}));
    if (body.action === 'suggest') return await suggest(body as Brief);
    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500);
  }
});
