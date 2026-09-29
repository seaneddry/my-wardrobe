import { useState } from 'react';
import { useData } from '../state/data';
import { Chips } from './Chips';
import { Sheet } from './Sheet';

export interface OutfitDetails {
  name: string;
  occasion: string | null;
  mood: string | null;
  notes: string | null;
}

/** Name, occasion, mood and notes for an outfit, shown when saving. */
export function SaveOutfitSheet({ open, onClose, initial, busy, onSave, pieceCount }: {
  open: boolean;
  onClose: () => void;
  initial: OutfitDetails;
  busy: boolean;
  onSave: (d: OutfitDetails) => void;
  pieceCount: number;
}) {
  const { lookups } = useData();
  const [d, setD] = useState<OutfitDetails>(initial);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save outfit"
      footer={
        <button type="button" className="button button-primary" disabled={busy || !d.name.trim()} onClick={() => onSave({ ...d, name: d.name.trim() })}>
          {busy ? 'Saving…' : `Save outfit (${pieceCount} ${pieceCount === 1 ? 'piece' : 'pieces'})`}
        </button>
      }
    >
      <div className="group-body">
        <label className="row-input" htmlFor="outfit-name">
          <span className="row-label">Name</span>
          <input id="outfit-name" value={d.name} maxLength={60} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </label>
      </div>
      <section className="field">
        <h3 className="field-label">Occasion</h3>
        <Chips label="Occasion" options={lookups('occasion').map((l) => ({ value: l.value }))} value={d.occasion ? [d.occasion] : []} onChange={(v) => setD({ ...d, occasion: v[0] ?? null })} />
      </section>
      <section className="field">
        <h3 className="field-label">Mood</h3>
        <Chips label="Mood" options={lookups('mood').map((l) => ({ value: l.value }))} value={d.mood ? [d.mood] : []} onChange={(v) => setD({ ...d, mood: v[0] ?? null })} />
      </section>
      <section className="field">
        <h3 className="field-label">Notes</h3>
        <div className="group-body">
          <textarea
            className="textarea"
            rows={3}
            placeholder="Where you'll wear it, what to change next time"
            value={d.notes ?? ''}
            onChange={(e) => setD({ ...d, notes: e.target.value || null })}
          />
        </div>
      </section>
    </Sheet>
  );
}
