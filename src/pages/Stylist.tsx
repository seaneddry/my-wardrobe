import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chips } from '../components/Chips';
import { Group } from '../components/Group';
import { Icon } from '../components/Icon';
import { NavBar } from '../components/NavBar';
import { OutfitCollage } from '../components/OutfitCollage';
import { useToast } from '../components/Toast';
import { NotSetUpError } from '../data/functions';
import { askStylist, WEATHER_OPTIONS, type StylistBrief, type Suggestion } from '../data/stylist';
import { errorMessage } from '../lib/format';
import { outfitItems } from '../lib/outfits';
import { useData } from '../state/data';

const STORE = 'wardrobe-stylist';

function load(): { brief: StylistBrief; results: Suggestion[] } {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { brief: { occasion: null, mood: null, weather: null, notes: '' }, results: [] };
}

export function Stylist() {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, lookups, saveOutfit } = useData();
  const [brief, setBrief] = useState<StylistBrief>(() => load().brief);
  const [results, setResults] = useState<Suggestion[]>(() => load().results);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notSetUp, setNotSetUp] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ brief, results }));
    } catch {
      /* ignore */
    }
  }, [brief, results]);

  const activeCount = items.filter((i) => i.status === 'active').length;

  async function run() {
    setBusy(true);
    setError(null);
    setNotSetUp(false);
    try {
      const found = await askStylist(brief, items, lookups('category'));
      if (found.length === 0) setError('The stylist couldn’t put together outfits from your pieces. Try a different brief, or add more pieces.');
      setResults(found);
      setSaved(new Set());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof NotSetUpError) setNotSetUp(true);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function save(s: Suggestion) {
    try {
      await saveOutfit({
        name: s.title,
        pieces: s.pieces,
        occasion: brief.occasion,
        mood: brief.mood,
        notes: s.tip ? `Tip: ${s.tip}` : null,
        source: 'ai',
        ai_reason: s.why || null,
        favourite: false,
      });
      setSaved((prev) => new Set(prev).add(s.key));
      toast('Saved to Outfits');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const set = (patch: Partial<StylistBrief>) => setBrief((b) => ({ ...b, ...patch }));

  return (
    <div className="screen">
      <NavBar large title="Stylist" subtitle="Outfit ideas from your own wardrobe" />
      <main className="page stack" style={{ maxWidth: 720 }}>
        {busy && (
          <div className="stylist-loading" role="status">
            <div className="spinner" />
            <p>Styling your wardrobe…</p>
          </div>
        )}

        {notSetUp && (
          <div className="notice">
            <strong>The AI stylist isn’t set up yet.</strong> It needs a free Gemini key and a small Supabase function.
            Follow “Set up the AI stylist” in <code>docs/UPGRADING.md</code>. The outfit builder and Shuffle work without it.
          </div>
        )}
        {error && <p className="notice notice-error">{error}</p>}

        {!busy && results.length > 0 && (
          <section className="stack" aria-label="Suggestions">
            {results.map((s) => {
              const pieces = outfitItems(s, items);
              const isSaved = saved.has(s.key);
              return (
                <article key={s.key} className="suggestion">
                  <div className="suggestion-photo">
                    <OutfitCollage items={pieces} label={s.title} />
                  </div>
                  <div className="suggestion-body">
                    <h2 className="suggestion-title">{s.title}</h2>
                    {s.why && <p className="prose">{s.why}</p>}
                    {s.tip && (
                      <p className="suggestion-tip">
                        <Icon name="sparkles" size={15} /> {s.tip}
                      </p>
                    )}
                    <div className="suggestion-actions">
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() =>
                          navigate('/outfits/new', {
                            state: { seed: { pieces: s.pieces, title: s.title, why: s.why, occasion: brief.occasion, mood: brief.mood } },
                          })
                        }
                      >
                        Open in builder
                      </button>
                      <button type="button" className="button button-primary button-small" disabled={isSaved} onClick={() => save(s)}>
                        {isSaved ? (
                          <>
                            <Icon name="check" size={16} weight={2.6} /> Saved
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <button type="button" className="button button-quiet" onClick={() => setResults([])}>
              Clear suggestions
            </button>
          </section>
        )}

        {!busy && results.length === 0 && (
          <>
            <Group header="Occasion" pad>
              <Chips label="Occasion" options={lookups('occasion').map((l) => ({ value: l.value }))} value={brief.occasion ? [brief.occasion] : []} onChange={(v) => set({ occasion: v[0] ?? null })} />
            </Group>
            <Group header="Mood" pad>
              <Chips label="Mood" options={lookups('mood').map((l) => ({ value: l.value }))} value={brief.mood ? [brief.mood] : []} onChange={(v) => set({ mood: v[0] ?? null })} />
            </Group>
            <Group header="Weather" pad>
              <Chips label="Weather" options={WEATHER_OPTIONS.map((w) => ({ value: w }))} value={brief.weather ? [brief.weather] : []} onChange={(v) => set({ weather: v[0] ?? null })} />
            </Group>
            <Group header="Anything else?" footer="Only text descriptions of your pieces are sent to Google Gemini, not your photos. On Gemini's free tier, Google may use requests to improve its products.">
              <textarea
                className="textarea"
                rows={3}
                maxLength={300}
                placeholder="Lunch outdoors, want to wear my new loafers"
                value={brief.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Group>
          </>
        )}

        <div className="stylist-bar">
          <button type="button" className="button button-primary button-block" disabled={busy || activeCount < 2} onClick={run}>
            <Icon name="sparkles" size={20} />
            {busy ? 'Thinking…' : results.length ? 'Suggest 3 more' : 'Suggest outfits'}
          </button>
          {activeCount < 2 && <p className="footnote">Add a few pieces to your wardrobe first.</p>}
        </div>
      </main>
    </div>
  );
}
