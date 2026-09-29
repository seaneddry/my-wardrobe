import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { NavBar } from '../../components/NavBar';
import { SaveOutfitSheet, type OutfitDetails } from '../../components/SaveOutfitSheet';
import { SlotRow } from '../../components/SlotRow';
import { useToast } from '../../components/Toast';
import type { Outfit, OutfitPiece } from '../../data/types';
import { errorMessage } from '../../lib/format';
import {
  BUILDER_SLOTS,
  defaultOutfitName,
  EMPTY_SELECTION,
  OPTIONAL_SLOTS,
  piecesByRow,
  piecesToSelection,
  selectionToPieces,
  shuffle,
  SLOT_LABELS,
  slotForCategory,
  type BuilderSlot,
  type Selection,
} from '../../lib/outfits';
import { useData } from '../../state/data';

/** Passed in router state when opening a stylist suggestion in the builder. */
export interface BuilderSeed {
  pieces: OutfitPiece[];
  title?: string;
  why?: string;
  occasion?: string | null;
  mood?: string | null;
}

export function OutfitBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { outfits, loading } = useData();
  const existing = id ? outfits.find((o) => o.id === id) : undefined;
  if (id && !existing) {
    return (
      <div className="screen">
        <NavBar
          title={loading ? '' : 'Not found'}
          left={
            <button type="button" className="nav-button" onClick={() => navigate('/outfits')}>
              Close
            </button>
          }
        />
      </div>
    );
  }
  return <BuilderBody key={id ?? 'new'} existing={existing} />;
}

function BuilderBody({ existing }: { existing?: Outfit }) {
  const navigate = useNavigate();
  const location = useLocation();
  const seed = (location.state as { seed?: BuilderSeed } | null)?.seed;
  const toast = useToast();
  const { items, lookups, saveOutfit } = useData();
  const categories = lookups('category');

  const [occasion, setOccasion] = useState<string | null>(existing?.occasion ?? seed?.occasion ?? null);
  const [locked, setLocked] = useState<Set<BuilderSlot>>(new Set());
  const [source, setSource] = useState<Outfit['source']>(existing?.source ?? (seed ? 'ai' : 'manual'));
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotOf = (id: string) => slotForCategory(items.find((i) => i.id === id)?.category ?? '', categories);
  const isFull = (id: string | null) => (id ? slotOf(id) === 'full' : false);

  const baseRows = useMemo(() => piecesByRow(items, categories, occasion), [items, categories, occasion]);

  const [sel, setSel] = useState<Selection>(() => {
    if (existing) return piecesToSelection(existing.pieces);
    if (seed) return piecesToSelection(seed.pieces);
    return shuffle(EMPTY_SELECTION, new Set(), piecesByRow(items, categories, occasion), (id) =>
      id ? slotForCategory(items.find((i) => i.id === id)?.category ?? '', categories) === 'full' : false,
    );
  });

  // Keep the current choice visible even if the occasion filter would hide it.
  const rows = useMemo(() => {
    const out = { ...baseRows };
    for (const slot of BUILDER_SLOTS) {
      const id = sel[slot];
      if (id && !out[slot].some((i) => i.id === id)) {
        const item = items.find((i) => i.id === id);
        if (item) out[slot] = [item, ...out[slot]];
      }
    }
    return out;
  }, [baseRows, sel, items]);

  const hasCore = rows.top.length > 0 && (rows.bottom.length > 0 || rows.top.some((i) => isFull(i.id)));
  const pieces = selectionToPieces(sel, slotOf);
  const topIsFull = isFull(sel.top);

  function select(slot: BuilderSlot, id: string | null) {
    setSel((s) => {
      const next = { ...s, [slot]: id };
      if (slot === 'top' && isFull(id)) next.bottom = null;
      if (slot === 'top' && !isFull(id) && !next.bottom && rows.bottom.length && !locked.has('bottom')) next.bottom = rows.bottom[0].id;
      return next;
    });
    if (source === 'shuffle') setSource('manual');
  }

  function doShuffle() {
    setSel(shuffle(sel, locked, rows, isFull));
    setSource('shuffle');
  }

  function toggleLock(slot: BuilderSlot) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  async function save(d: OutfitDetails) {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveOutfit(
        {
          name: d.name,
          pieces,
          occasion: d.occasion,
          mood: d.mood,
          notes: d.notes?.trim() || null,
          source,
          ai_reason: existing?.ai_reason ?? seed?.why ?? null,
          favourite: existing?.favourite ?? false,
        },
        existing?.id,
      );
      toast(existing ? 'Outfit updated' : 'Outfit saved');
      navigate(`/outfits/${saved.id}`, { replace: true, viewTransition: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const visibleSlots = BUILDER_SLOTS.filter((slot) => rows[slot].length > 0);

  return (
    <div className="screen builder">
      <NavBar
        title={existing ? 'Edit outfit' : 'New outfit'}
        left={
          <button type="button" className="nav-button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        }
        right={
          <button type="button" className="nav-button nav-button-strong" disabled={!hasCore || pieces.length < 2} onClick={() => setSaveOpen(true)}>
            Save
          </button>
        }
      />

      {!hasCore ? (
        <div className="empty">
          <div className="empty-icon">
            <Icon name="layers" size={28} />
          </div>
          <h2>Add a few more pieces</h2>
          <p>Outfits need at least one top and one bottom, or a dress. Check your categories are assigned to outfit slots in Manage.</p>
          <Link to="/add" className="button button-primary">
            Add a piece
          </Link>
          <Link to="/manage/lists/category" className="button button-quiet">
            Check outfit slots
          </Link>
        </div>
      ) : (
        <>
          <div className="pill-row builder-occasions" role="group" aria-label="Shuffle for occasion">
            {[null, ...lookups('occasion').map((l) => l.value)].map((o) => (
              <button key={o ?? 'any'} type="button" className={`pill${occasion === o ? ' pill-on' : ''}`} aria-pressed={occasion === o} onClick={() => setOccasion(o)}>
                {o ?? 'Any occasion'}
              </button>
            ))}
          </div>

          {(error || seed?.why) && (
            <div className="builder-note">
              {error ? (
                <p className="notice notice-error">{error}</p>
              ) : (
                <p className="notice">
                  <Icon name="sparkles" size={16} /> {seed?.why}
                </p>
              )}
            </div>
          )}

          <main className="canvas">
            {visibleSlots.map((slot, n) => (
              <SlotRow
                key={slot}
                label={slot === 'top' && rows.top.some((i) => isFull(i.id)) ? 'Top or dress' : SLOT_LABELS[slot]}
                items={rows[slot]}
                selectedId={sel[slot]}
                onSelect={(id) => select(slot, id)}
                optional={OPTIONAL_SLOTS.has(slot) || slot === 'bottom'}
                locked={locked.has(slot)}
                onToggleLock={() => toggleLock(slot)}
                disabledNote={slot === 'bottom' && topIsFull ? 'Covered by the one-piece above' : undefined}
                delay={n * 70}
              />
            ))}
          </main>

          <div className="builder-bar">
            <button type="button" className="button button-primary builder-shuffle" onClick={doShuffle}>
              <Icon name="shuffle" size={20} weight={2.2} /> Shuffle
            </button>
            <Link to="/stylist" className="button button-secondary" aria-label="Ask the stylist">
              <Icon name="sparkles" size={20} /> Stylist
            </Link>
          </div>
        </>
      )}

      {saveOpen && (
        <SaveOutfitSheet
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          busy={busy}
          pieceCount={pieces.length}
          onSave={save}
          initial={{
            name: existing?.name ?? seed?.title ?? defaultOutfitName(occasion),
            occasion: existing?.occasion ?? occasion,
            mood: existing?.mood ?? seed?.mood ?? null,
            notes: existing?.notes ?? null,
          }}
        />
      )}
    </div>
  );
}
