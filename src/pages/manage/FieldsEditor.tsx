import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import type { FieldDefinition, FieldType } from '../../data/types';
import { errorMessage } from '../../lib/format';
import { FIELD_TYPE_LABELS, fieldKeyFor, fieldUsage, hasOptions, move, piecesLabel } from '../../lib/manage';
import { useData } from '../../state/data';
import { BackToManage } from './ManageLayout';

type Draft = { label: string; field_type: FieldType; options: string[] };

export function FieldsEditor() {
  const { allFields, items, manage } = useData();
  const [mode, setMode] = useState<{ kind: 'add' } | { kind: 'edit'; field: FieldDefinition } | null>(null);
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
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(draft: Draft) {
    const label = draft.label.trim();
    if (mode?.kind === 'add') {
      const ok = await run(
        () =>
          manage.addField({
            key: fieldKeyFor(label, allFields),
            label,
            field_type: draft.field_type,
            options: hasOptions(draft.field_type) ? draft.options : [],
          }),
        `Added "${label}". It now appears on the item form.`,
      );
      if (ok) setMode(null);
    } else if (mode?.kind === 'edit') {
      const field = mode.field;
      const ok = await run(
        () => manage.updateField(field.id, { label, options: hasOptions(field.field_type) ? draft.options : field.options }),
        'Saved.',
      );
      if (ok) setMode(null);
    }
  }

  function toggleActive(field: FieldDefinition) {
    run(
      () => manage.updateField(field.id, { active: !field.active }),
      field.active
        ? `"${field.label}" is hidden from the item form. Its values are kept.`
        : `"${field.label}" is back on the item form.`,
    );
  }

  function remove(field: FieldDefinition) {
    const used = fieldUsage(items, field.key);
    const message = used
      ? `Delete "${field.label}"?\n\nThis also removes its values from ${used} ${used === 1 ? 'piece' : 'pieces'}, and can't be undone. To keep the values, hide the field instead.`
      : `Delete "${field.label}"?`;
    if (!window.confirm(message)) return;
    run(() => manage.deleteField(field.id), `Deleted "${field.label}".`);
  }

  function reorder(index: number, delta: number) {
    const next = move(allFields, index, delta);
    if (next === allFields) return;
    run(() => manage.reorderFields(next.map((f) => f.id)));
  }

  return (
    <section className="manage-section">
      <BackToManage />
      <h2 className="manage-title">Custom fields</h2>
      <p className="manage-help">
        Extra details you want to record on a piece, such as fabric or where you bought it. They appear on the item form
        after the standard fields, in this order.
      </p>

      {mode === null && (
        <div>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setMode({ kind: 'add' });
              setError(null);
              setNotice(null);
            }}
          >
            Add a field
          </button>
        </div>
      )}

      {mode?.kind === 'add' && (
        <FieldForm
          key="add"
          title="New field"
          initial={{ label: '', field_type: 'text', options: [] }}
          busy={busy}
          onSave={save}
          onCancel={() => setMode(null)}
          existingLabels={allFields.map((f) => f.label)}
        />
      )}

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <ul className="mlist mlist-fields">
        {allFields.map((field, index) => {
          if (mode?.kind === 'edit' && mode.field.id === field.id) {
            return (
              <li key={field.id} className="mrow mrow-editing">
                <FieldForm
                  key={field.id}
                  title={`Edit ${field.label}`}
                  initial={{ label: field.label, field_type: field.field_type, options: field.options }}
                  lockedType
                  busy={busy}
                  onSave={save}
                  onCancel={() => setMode(null)}
                  existingLabels={allFields.filter((f) => f.id !== field.id).map((f) => f.label)}
                />
              </li>
            );
          }
          const used = fieldUsage(items, field.key);
          const detail = [
            FIELD_TYPE_LABELS[field.field_type],
            hasOptions(field.field_type) ? `${field.options.length} ${field.options.length === 1 ? 'option' : 'options'}` : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li key={field.id} className={`mrow${field.active ? '' : ' mrow-hidden'}`}>
              <div className="mrow-main">
                <span className="mrow-name">
                  {field.label}
                  {!field.active && <span className="badge">Hidden</span>}
                </span>
                <span className="mrow-meta">
                  {detail}. {piecesLabel(used)}.
                </span>
              </div>
              <div className="mrow-actions">
                <button type="button" className="icon-button" aria-label={`Move ${field.label} up`} disabled={busy || index === 0} onClick={() => reorder(index, -1)}>
                  <Icon name="up" size={20} />
                </button>
                <button type="button" className="icon-button" aria-label={`Move ${field.label} down`} disabled={busy || index === allFields.length - 1} onClick={() => reorder(index, 1)}>
                  <Icon name="down" size={20} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Edit ${field.label}`}
                  disabled={busy}
                  onClick={() => {
                    setMode({ kind: 'edit', field });
                    setError(null);
                    setNotice(null);
                  }}
                >
                  <Icon name="edit" size={20} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={field.active ? `Hide ${field.label}` : `Show ${field.label}`}
                  title={field.active ? 'Hide from the item form' : 'Show on the item form'}
                  disabled={busy}
                  onClick={() => toggleActive(field)}
                >
                  <Icon name={field.active ? 'eye' : 'eyeOff'} size={20} />
                </button>
                <button type="button" className="icon-button icon-button-danger" aria-label={`Delete ${field.label}`} disabled={busy} onClick={() => remove(field)}>
                  <Icon name="trash" size={20} />
                </button>
              </div>
            </li>
          );
        })}
        {allFields.length === 0 && mode?.kind !== 'add' && (
          <li className="mrow mrow-empty">No custom fields yet. Add one to record extra details on your pieces.</li>
        )}
      </ul>
    </section>
  );
}

function FieldForm({ title, initial, lockedType = false, busy, onSave, onCancel, existingLabels }: {
  title: string;
  initial: Draft;
  lockedType?: boolean;
  busy: boolean;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  existingLabels: string[];
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [optionText, setOptionText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const needsOptions = hasOptions(draft.field_type);

  function addOption() {
    const value = optionText.trim();
    if (!value) return;
    if (draft.options.some((o) => o.toLowerCase() === value.toLowerCase())) {
      setProblem(`"${value}" is already an option.`);
      return;
    }
    setDraft({ ...draft, options: [...draft.options, value] });
    setOptionText('');
    setProblem(null);
  }

  function onOptionKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const label = draft.label.trim();
    if (!label) return setProblem('Give the field a name.');
    if (existingLabels.some((l) => l.toLowerCase() === label.toLowerCase())) return setProblem(`There's already a field called "${label}".`);
    if (needsOptions && draft.options.length === 0) return setProblem('Add at least one option.');
    setProblem(null);
    onSave(draft);
  }

  return (
    <form className="field-form" onSubmit={submit}>
      <h3 className="section-title">{title}</h3>

      <label className="field" htmlFor="field-label">
        <span className="field-label">Name</span>
        <input
          id="field-label"
          className="input"
          placeholder="For example, Fabric"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          maxLength={40}
          autoFocus
        />
      </label>

      <label className="field" htmlFor="field-type">
        <span className="field-label">Type of answer</span>
        <select
          id="field-type"
          className="input"
          value={draft.field_type}
          disabled={lockedType}
          onChange={(e) => setDraft({ ...draft, field_type: e.target.value as FieldType })}
        >
          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {lockedType && <span className="meta">The type can't change once a field exists, so saved values stay valid.</span>}
      </label>

      {needsOptions && (
        <div className="field">
          <span className="field-label">Options</span>
          <div className="manage-add">
            <label className="sr-only" htmlFor="option-text">
              New option
            </label>
            <input
              id="option-text"
              className="input"
              placeholder="Add an option"
              value={optionText}
              onChange={(e) => setOptionText(e.target.value)}
              onKeyDown={onOptionKey}
              maxLength={40}
            />
            <button type="button" className="button button-secondary" onClick={addOption} disabled={!optionText.trim()}>
              Add
            </button>
          </div>
          {draft.options.length > 0 && (
            <ul className="option-list">
              {draft.options.map((o, i) => (
                <li key={o} className="option-item">
                  <span>{o}</span>
                  <span className="option-actions">
                    <button type="button" className="icon-button" aria-label={`Move ${o} up`} disabled={i === 0} onClick={() => setDraft({ ...draft, options: move(draft.options, i, -1) })}>
                      <Icon name="up" size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${o}`}
                      onClick={() => setDraft({ ...draft, options: draft.options.filter((x) => x !== o) })}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {lockedType && <span className="meta">Pieces that already use a removed option keep it.</span>}
        </div>
      )}

      {problem && <p className="notice notice-error" role="alert">{problem}</p>}

      <div className="mrow-edit-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save field'}
        </button>
        <button type="button" className="button button-quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
