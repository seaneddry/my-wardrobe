import { useEffect, useState, type FormEvent } from 'react';
import { fetchWebImage, hostOf, NotSetUpError, searchWebImages, type WebImage } from '../data/webImages';
import { errorMessage } from '../lib/format';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export interface ApprovedImage {
  blob: Blob;
  sourceUrl: string;
}

// Results are kept for the session so reopening the sheet doesn't use another search.
const resultCache = new Map<string, WebImage[]>();

/**
 * Finds photos online for a piece. Nothing is added until the user opens a
 * result, checks it at full size, and taps "Use this photo".
 */
export function WebImageSearch({ open, onClose, initialQuery, room, onAdd }: {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
  /** How many more photos the piece can take. */
  room: number;
  onAdd: (images: ApprovedImage[]) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<WebImage[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notSetUp, setNotSetUp] = useState(false);
  const [approved, setApproved] = useState<Map<string, Blob>>(new Map());
  const [preview, setPreview] = useState<WebImage | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fresh state each time the sheet opens; search straight away if there's something to search for.
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setApproved(new Map());
    setPreview(null);
    setError(null);
    setNotSetUp(false);
    const cached = resultCache.get(initialQuery.trim().toLowerCase());
    setResults(cached ?? null);
    if (!cached && initialQuery.trim()) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!previewBlob) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(previewBlob);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [previewBlob]);

  async function runSearch(q: string) {
    const text = q.trim();
    if (!text) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchWebImages(text);
      resultCache.set(text.toLowerCase(), found);
      setResults(found);
    } catch (err) {
      if (err instanceof NotSetUpError) setNotSetUp(true);
      else setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    runSearch(query);
  }

  async function openPreview(image: WebImage) {
    setPreview(image);
    setPreviewError(null);
    const already = approved.get(image.original);
    if (already) {
      setPreviewBlob(already);
      return;
    }
    setPreviewBlob(null);
    try {
      setPreviewBlob(await fetchWebImage(image.original));
    } catch (err) {
      setPreviewError(errorMessage(err));
    }
  }

  function approve() {
    if (!preview || !previewBlob) return;
    const next = new Map(approved);
    if (next.has(preview.original)) next.delete(preview.original);
    else next.set(preview.original, previewBlob);
    setApproved(next);
    setPreview(null);
  }

  function finish() {
    onAdd([...approved].map(([sourceUrl, blob]) => ({ blob, sourceUrl })));
    onClose();
  }

  const isApproved = preview ? approved.has(preview.original) : false;
  const atLimit = !isApproved && approved.size >= room;

  const footer = preview ? (
    <>
      <button type="button" className="button button-secondary" onClick={() => setPreview(null)}>
        Back
      </button>
      <button type="button" className="button button-primary" onClick={approve} disabled={!previewBlob || atLimit}>
        {isApproved ? 'Don’t use this photo' : atLimit ? 'Photo limit reached' : 'Use this photo'}
      </button>
    </>
  ) : (
    <button type="button" className="button button-primary" onClick={finish} disabled={approved.size === 0}>
      {approved.size === 0 ? 'Choose photos to add' : `Add ${approved.size} ${approved.size === 1 ? 'photo' : 'photos'}`}
    </button>
  );

  return (
    <Sheet open={open} onClose={onClose} title={preview ? 'Check this photo' : 'Find photos online'} full footer={footer}>
      {preview ? (
        <div className="web-preview">
          <div className="web-preview-frame">
            {previewUrl ? (
              <img src={previewUrl} alt={preview.title} />
            ) : previewError ? (
              <img src={preview.thumbnail} alt={preview.title} style={{ opacity: 0.5 }} />
            ) : (
              <div className="spinner" aria-label="Loading full-size photo" />
            )}
          </div>
          {previewError && <p className="notice notice-error">{previewError}</p>}
          <div className="web-preview-meta">
            <span className="web-preview-title">{preview.title || 'Untitled photo'}</span>
            <span className="web-preview-source">
              From{' '}
              <a href={preview.page || preview.original} target="_blank" rel="noreferrer">
                {preview.source || hostOf(preview.page || preview.original)}
              </a>
              {preview.width && preview.height ? `, ${preview.width} × ${preview.height}` : ''}
            </span>
          </div>
          <p className="web-hint">Only use it if it’s the same piece you own. A private copy is saved with your piece.</p>
        </div>
      ) : (
        <>
          <form className="web-search-form" onSubmit={submit}>
            <label className="search-field" style={{ height: 44 }}>
              <Icon name="search" size={18} />
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Brand, name and colour"
                aria-label="Search for photos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button type="submit" className="button button-primary button-small" style={{ minHeight: 44 }} disabled={searching || !query.trim()}>
              Search
            </button>
          </form>

          {notSetUp && (
            <div className="notice">
              <strong>Online search isn’t set up yet.</strong> It needs a free SerpApi key and a small Supabase
              function. Follow “Set up online photo search” in <code>docs/UPGRADING.md</code>. Camera and Library still
              work as usual.
            </div>
          )}
          {error && <p className="notice notice-error">{error}</p>}

          {searching && (
            <div className="empty" style={{ padding: 40 }}>
              <div className="spinner" />
              <p>Looking for photos…</p>
            </div>
          )}

          {!searching && results && results.length === 0 && (
            <div className="empty" style={{ padding: 40 }}>
              <h2>No photos found</h2>
              <p>Try fewer words, or add the brand name.</p>
            </div>
          )}

          {!searching && results && results.length > 0 && (
            <>
              <p className="web-hint">Tap a photo to check it at full size before adding it.</p>
              <div className="web-grid">
                {results.map((r) => {
                  const picked = approved.has(r.original);
                  return (
                    <button
                      key={r.original}
                      type="button"
                      className={`web-thumb pressable${picked ? ' is-picked' : ''}`}
                      onClick={() => openPreview(r)}
                      aria-label={`${r.title || 'Photo'} from ${r.source || hostOf(r.page)}${picked ? ', selected' : ''}`}
                    >
                      {picked && (
                        <span className="web-check">
                          <Icon name="check" size={15} weight={3} />
                        </span>
                      )}
                      <img src={r.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!searching && !results && !notSetUp && !error && (
            <p className="web-hint">
              Type the brand, name and colour, then search. Results come from Google Images; each search uses one of
              your 250 free searches a month.
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
