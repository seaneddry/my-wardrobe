import { useState, type FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Swatch } from '../../components/Swatch';
import { LOOKUP_LISTS, type Lookup, type LookupList } from '../../data/types';
import { errorMessage } from '../../lib/format';
import { LIST_INFO, lookupUsage, move, piecesLabel } from '../../lib/manage';
import { useData } from '../../state/data';
import { BackToManage } from './ManageLayout';

const DEFAULT_HEX = '#8a8f98';
const isHex = (v: string | undefined): v is string => Boolean(v && /^#[0-9a-f]{6}$/i.test(v));

export function ListEditor() {
  const { list } = useParams();
  if (!list || !(LOOKUP_LISTS as readonly string[]).includes(list)) return <Navigate to="/manage" replace />;
  // Keyed so switching lists resets the editor.
  return <ListEditorBody key={list} list={list as LookupList} />;
}

function ListEditorBody({ list }: { list: LookupList }) {
  const { lookups, items, manage } = useData();
  const info = LIST_INFO[list];
  const rows = lookups(list);
  const isColour = list === 'colour';

  const [newValue, setNewValue] = useState('');
  const [newHex, setNewHex] = useState(DEFAULT_HEX);
  const [editing, setEditing] = useState<Lookup | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editHex, setEditHex] = useState(DEFAULT_HEX);
  const [editMulti, setEditMulti] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<void>, done?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (done) setNotice(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const exists = (value: string, exceptId?: string) =>
    rows.some((r) => r.id !== exceptId && r.value.toLowerCase() === value.trim().toLowerCase());

  function add(e: FormEvent) {
    e.preventDefault();
    const value = newValue.trim();
    if (!value) return;
    if (exists(value)) {
      setError(`"${value}" is already in this list.`);
      return;
    }
    run(async () => {
      await manage.addLookup(list, value, isColour ? { hex: newHex } : {});
      setNewValue('');
    }, `Added "${value}".`);
  }

  function startEdit(row: Lookup) {
    setEditing(row);
    setEditValue(row.value);
    setEditMulti(row.meta.hex === 'multi');
    setEditHex(isHex(row.meta.hex) ? row.meta.hex : DEFAULT_HEX);
    setError(null);
    setNotice(null);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const row = editing;
    const value = editValue.trim();
    if (!value) {
      setError('The name can’t be empty.');
      return;
    }
    if (exists(value, row.id)) {
      setError(`"${value}" is already in this list.`);
      return;
    }
    const renamed = value !== row.value;
    const hex = editMulti ? 'multi' : editHex;
    const recoloured = isColour && hex !== row.meta.hex;
    const used = lookupUsage(items, list, row.value);
    run(async () => {
      if (renamed) await manage.renameLookup(list, row.value, value);
      if (recoloured) await manage.updateLookupMeta(row.id, { ...row.meta, hex });
      setEditing(null);
    }, renamed && used ? `Renamed to "${value}" and updated ${used} ${used === 1 ? 'piece' : 'pieces'}.` : 'Saved.');
  }

  function remove(row: Lookup) {
    if (list === 'category' && rows.length <= 1) {
      setError('Keep at least one category, or you won’t be able to add pieces.');
      return;
    }
    const used = lookupUsage(items, list, row.value);
    const message = used
      ? `Remove "${row.value}" from ${info.title.toLowerCase()}?\n\n${used} ${used === 1 ? 'piece uses' : 'pieces use'} it. They’ll keep "${row.value}", but it won’t be offered as an option any more.`
      : `Remove "${row.value}" from ${info.title.toLowerCase()}?`;
    if (!window.confirm(message)) return;
    run(() => manage.deleteLookup(row.id), `Removed "${row.value}".`);
  }

  function reorder(index: number, delta: number) {
    const next = move(rows, index, delta);
    if (next === rows) return;
    run(() => manage.reorderLookups(list, next.map((r) => r.id)));
  }

  return (
    <section className="manage-section">
      <BackToManage />
      <h2 className="manage-title">{info.title}</h2>
      <p className="manage-help">{info.help}</p>

      <form className="manage-add" onSubmit={add}>
        <label className="sr-only" htmlFor="new-value">
          New {info.noun}
        </label>
        <input
          id="new-value"
          className="input"
          placeholder={`Add a ${info.noun}`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          disabled={busy}
          maxLength={40}
        />
        {isColour && (
          <input
            type="color"
            className="colour-input"
            aria-label="Swatch colour"
            value={newHex}
            onChange={(e) => setNewHex(e.target.value)}
            disabled={busy}
          />
        )}
        <button type="submit" className="button button-primary" disabled={busy || !newValue.trim()}>
          Add
        </button>
      </form>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <ul className="mlist">
        {rows.map((row, index) => {
          const used = lookupUsage(items, list, row.value);
          if (editing?.id === row.id) {
            return (
              <li key={row.id} className="mrow mrow-editing">
                <form className="mrow-edit" onSubmit={saveEdit}>
                  <div className="mrow-edit-fields">
                    <label className="sr-only" htmlFor="edit-value">
                      Name
                    </label>
                    <input
                      id="edit-value"
                      className="input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      maxLength={40}
                    />
                    {isColour && (
                      <input
                        type="color"
                        className="colour-input"
                        aria-label="Swatch colour"
                        value={editHex}
                        disabled={editMulti}
                        onChange={(e) => setEditHex(e.target.value)}
                      />
                    )}
                  </div>
                  {isColour && (
                    <label className="toggle toggle-small">
                      <input type="checkbox" checked={editMulti} onChange={(e) => setEditMulti(e.target.checked)} />
                      <span>Multicolour swatch</span>
                    </label>
                  )}
                  {used > 0 && editValue.trim() !== row.value && (
                    <p className="meta">
                      Renaming also updates the {used} {used === 1 ? 'piece' : 'pieces'} that use it.
                    </p>
                  )}
                  <div className="mrow-edit-actions">
                    <button type="submit" className="button button-primary" disabled={busy}>
                      Save
                    </button>
                    <button type="button" className="button button-quiet" onClick={() => setEditing(null)} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            );
          }
          return (
            <li key={row.id} className="mrow">
              <div className="mrow-main">
                <span className="mrow-name">
                  {isColour && <Swatch hex={row.meta.hex ?? null} size={16} />}
                  {row.value}
                </span>
                <span className="mrow-meta">{piecesLabel(used)}</span>
              </div>
              <div className="mrow-actions">
                <button type="button" className="icon-button" aria-label={`Move ${row.value} up`} disabled={busy || index === 0} onClick={() => reorder(index, -1)}>
                  <Icon name="up" size={20} />
                </button>
                <button type="button" className="icon-button" aria-label={`Move ${row.value} down`} disabled={busy || index === rows.length - 1} onClick={() => reorder(index, 1)}>
                  <Icon name="down" size={20} />
                </button>
                <button type="button" className="icon-button" aria-label={`Edit ${row.value}`} disabled={busy} onClick={() => startEdit(row)}>
                  <Icon name="edit" size={20} />
                </button>
                <button type="button" className="icon-button icon-button-danger" aria-label={`Remove ${row.value}`} disabled={busy} onClick={() => remove(row)}>
                  <Icon name="trash" size={20} />
                </button>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="mrow mrow-empty">Nothing here yet. Add the first {info.noun} above.</li>}
      </ul>
    </section>
  );
}
