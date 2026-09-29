import type { AttributeValue, FieldDefinition } from '../data/types';
import { Chips } from './Chips';

/** A user-defined field rendered as a row inside a grouped list. */
export function CustomFieldRow({ def, value, onChange }: {
  def: FieldDefinition;
  value: AttributeValue | undefined;
  onChange: (v: AttributeValue) => void;
}) {
  const id = `custom-${def.key}`;
  switch (def.field_type) {
    case 'boolean':
      return (
        <label className="row-input" htmlFor={id}>
          <span className="row-label" style={{ flex: 1 }}>
            {def.label}
          </span>
          <span className="switch">
            <input id={id} type="checkbox" role="switch" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
            <span className="switch-track" />
          </span>
        </label>
      );
    case 'select':
      return (
        <label className="row-input" htmlFor={id}>
          <span className="row-label">{def.label}</span>
          <select id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)}>
            <option value="">Not set</option>
            {def.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      );
    case 'number':
      return (
        <label className="row-input" htmlFor={id}>
          <span className="row-label">{def.label}</span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => {
              const raw = e.target.value.replace(',', '.');
              onChange(raw === '' ? null : Number.isNaN(Number(raw)) ? raw : Number(raw));
            }}
          />
        </label>
      );
    case 'date':
      return (
        <label className="row-input" htmlFor={id}>
          <span className="row-label">{def.label}</span>
          <input id={id} type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} />
        </label>
      );
    case 'multiselect':
      return null; // rendered separately as a chip group
    default:
      return (
        <label className="row-input" htmlFor={id}>
          <span className="row-label">{def.label}</span>
          <input id={id} type="text" placeholder="Add" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} />
        </label>
      );
  }
}

export function CustomMultiselect({ def, value, onChange }: {
  def: FieldDefinition;
  value: AttributeValue | undefined;
  onChange: (v: AttributeValue) => void;
}) {
  return (
    <Chips
      multiple
      label={def.label}
      options={def.options.map((o) => ({ value: o }))}
      value={Array.isArray(value) ? value : []}
      onChange={(v) => onChange(v)}
    />
  );
}

/** Formats a custom field value for display on the item page. */
export function formatAttribute(def: FieldDefinition, value: AttributeValue | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (def.field_type === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
