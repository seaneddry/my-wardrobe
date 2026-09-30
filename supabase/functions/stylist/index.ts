// My Wardrobe — Edge Function "stylist" (v1.4.0)
// Suggests outfits from the user's own wardrobe using Google Gemini.
// Secrets: GEMINI_API_KEY (required), GEMINI_MODEL (optional override).
// Without GEMINI_MODEL, it asks Google which models this key can use and tries
// Flash-Lite first (largest free allowance), then Flash. If one model is out of
// quota or busy, it moves on to the next. One attempt per model, to save quota.
// The stylist's instructions are sent by the app ("rules"), so they can change with an
// app update; DEFAULT_RULES below is only used if the app doesn't send any.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const API = 'https://generativelanguage.googleapis.com/v1beta';

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
  rules?: string;
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

const DEFAULT_RULES = `You are a friendly, practical personal stylist. Suggest exactly 3 distinct outfits for the brief below, built ONLY from the wardrobe pieces listed. Never invent pieces.

Rules for each outfit:
- Use either one "top" and one "bottom", or one "full" piece (like a dress or jumpsuit) instead of both.
- Always include one "shoes" piece when any shoes are listed.
- Optionally add one "head" piece (hat, cap), one "outer" piece, and up to two "accessory" pieces when they help the look.
- Never use two pieces from the same slot, except accessories.
- Respect the occasion's formality, the mood and the weather. Prefer pieces tagged with the occasion when that makes sense.
- Think about colour harmony and proportion. Make the 3 outfits clearly different from each other.
- Refer to pieces by their ref values only, in the "pieces" array.
- In "why" and "tip", mention pieces by their name or colour and type, never by ref. Keep them short and specific.`;

function buildPrompt(b: Brief): string {
  const rules = typeof b.rules === 'string' && b.rules.trim().length > 50 ? b.rules.trim().slice(0, 6000) : DEFAULT_RULES;
  const brief = [
    b.occasion ? `Occasion: ${b.occasion}` : 'Occasion: any',
    b.mood ? `Mood: ${b.mood}` : '',
    b.weather ? `Weather: ${b.weather}` : '',
    b.notes ? `Extra wishes from the wearer: ${b.notes}` : '',
  ].filter(Boolean).join('\n');

  return `${rules}

Reply with JSON only, in this shape: {"outfits":[{"title":"...","pieces":["p1","p2"],"why":"...","tip":"..."}]}

Brief:
${brief}

Wardrobe:
${b.pieces.map(describe).join('\n')}`;
}

/** Version number from a model name, e.g. "gemini-3.8-flash" → 3.8 */
function versionOf(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Asks Google which models this key can use. Order: newest Flash-Lite, newest Flash,
 * next Flash-Lite, next Flash… (stable before preview). Flash-Lite has the largest
 * free-tier allowance, and the two families have separate capacity and quotas.
 */
async function discoverModels(key: string): Promise<string[]> {
  const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `status ${res.status}`;
    if (/api key/i.test(msg)) throw new Error('The Gemini API key isn’t valid. Check GEMINI_API_KEY in Supabase.');
    throw new Error(`Couldn’t list Gemini models: ${msg}`);
  }
  const names: string[] = (data.models ?? [])
    // deno-lint-ignore no-explicit-any
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    // deno-lint-ignore no-explicit-any
    .map((m: any) => String(m.name).replace(/^models\//, ''))
    .filter((n: string) => /flash/.test(n) && !/(image|tts|audio|live|omni|embed|transcribe|robotics|thinking-exp)/.test(n));

  const newestFirst = (list: string[]) => [...list].sort((a, b) => versionOf(b) - versionOf(a));
  const isPreview = (n: string) => /(preview|exp)/.test(n);
  const lite = newestFirst(names.filter((n) => /lite/.test(n) && !isPreview(n)));
  const flash = newestFirst(names.filter((n) => !/lite/.test(n) && !isPreview(n)));
  const previews = newestFirst(names.filter(isPreview));

  const order: string[] = [];
  for (let i = 0; i < Math.max(flash.length, lite.length); i++) {
    if (lite[i]) order.push(lite[i]);
    if (flash[i]) order.push(flash[i]);
  }
  return [...order, ...previews].slice(0, 6);
}

async function callGemini(model: string, key: string, prompt: string, withSchema: boolean): Promise<Response> {
  const generationConfig: Record<string, unknown> = { responseMimeType: 'application/json', temperature: 0.9 };
  if (withSchema) generationConfig.responseSchema = SCHEMA;
  return await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
    signal: AbortSignal.timeout(50000),
  });
}

/** One attempt per model. Only repeats (without the schema) if the model rejected the schema itself. */
async function callOnce(model: string, key: string, prompt: string): Promise<{ res: Response; data: any }> {
  let res = await callGemini(model, key, prompt, true);
  let data = await res.json().catch(() => ({}));
  const msg: string = data?.error?.message ?? '';
  if (res.status === 400 && /(schema|response_?mime|responseSchema|json)/i.test(msg)) {
    res = await callGemini(model, key, prompt, false);
    data = await res.json().catch(() => ({}));
  }
  return { res, data };
}

function parseOutfits(data: unknown): unknown[] {
  // deno-lint-ignore no-explicit-any
  const parts = (data as any)?.candidates?.[0]?.content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  const text = parts.filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join('').trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, '');
  if (!text) throw new Error('The stylist returned an empty answer. Try again.');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const parsed = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  return Array.isArray(parsed) ? parsed : parsed.outfits ?? [];
}

async function suggest(b: Brief): Promise<Response> {
  const key = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!key) return json({ error: 'not_configured' }, 503);
  if (!Array.isArray(b.pieces) || b.pieces.length < 2) return json({ error: 'Add a few more pieces to your wardrobe first.' }, 400);

  const pieces = b.pieces.slice(0, 400);
  const prompt = buildPrompt({ ...b, pieces });

  let models: string[];
  const custom = Deno.env.get('GEMINI_MODEL')?.trim().replace(/^models\//, '');
  try {
    models = custom ? [custom] : await discoverModels(key);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Couldn’t reach Gemini.' }, 502);
  }
  if (models.length === 0) return json({ error: 'Your Gemini key has no Flash models available. Check your key at aistudio.google.com.' }, 502);

  const problems: string[] = [];
  let quota = 0;
  let noFreeTier = 0;
  let busy = 0;
  const started = Date.now();
  for (const model of models) {
    if (Date.now() - started > 100000) break; // stay well inside the function's time limit
    const { res, data } = await callOnce(model, key, prompt);
    const msg: string = data?.error?.message ?? '';
    if (res.ok) {
      try {
        return json({ outfits: parseOutfits(data), model });
      } catch (err) {
        problems.push(`${model}: ${err instanceof Error ? err.message : 'unreadable answer'}`);
        continue;
      }
    }
    console.error('Gemini error', model, res.status, msg);
    if (/api key/i.test(msg)) return json({ error: 'The Gemini API key isn’t valid. Check GEMINI_API_KEY in Supabase.' }, 400);
    if (res.status === 429) {
      if (/limit:\s*0\b/.test(msg)) {
        noFreeTier++;
        problems.push(`${model}: not included in your free tier`);
      } else {
        quota++;
        problems.push(`${model}: free limit used up`);
      }
    } else if (res.status === 503 || res.status === 500) {
      busy++;
      problems.push(`${model}: busy`);
    } else {
      problems.push(`${model}: ${msg.slice(0, 120) || res.status}`);
    }
  }

  const tried = problems.join('; ');
  if (quota + noFreeTier === problems.length && problems.length > 0) {
    return json({
      error:
        `No free Gemini requests are left right now (${tried}). Daily limits reset at midnight US Pacific time. ` +
        'Check your limits at aistudio.google.com/usage.',
    }, 429);
  }
  if (busy > 0 && busy + quota + noFreeTier === problems.length) {
    return json({ error: `Google’s AI is busy or out of free requests right now (${tried}). Try again in a few minutes.` }, 503);
  }
  return json({ error: `The stylist couldn’t answer (${tried.slice(0, 300)}).` }, 502);
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
