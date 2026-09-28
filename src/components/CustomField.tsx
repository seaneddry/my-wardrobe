import type { AttributeValue, FieldDefinition } from '../data/types';
import { Chips } from './Chips';

/** Renders one user-defined field from the field_definitions table. */
export function CustomField({ def, value, onChange }: {
  def: FieldDefinition;
  value: AttributeValue | undefined;
  onChange: (v: AttributeValue) => void;
}) {
  const id = `custom-${def.key}`;
  switch (def.field_type) {
    case 'boolean':
      return (
        <label className="toggle" htmlFor={id}>
          <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span>{def.label}</span>
        </label>
      );
    case 'multiselect':
      return (
        <div className="field">
          <span className="field-label">{def.label}</span>
          <Chips
            multiple
            label={def.label}
            options={def.options.map((o) => ({ value: o }))}
            value={Array.isArray(value) ? value : []}
            onChange={(v) => onChange(v)}
          />
        </div>
      );
    case 'select':
      return (
        <label className="field" htmlFor={id}>
          <span className="field-label">{def.label}</span>
          <select id={id} className="input" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)}>
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
        <label className="field" htmlFor={id}>
          <span className="field-label">{def.label}</span>
          <input
            id={id}
            className="input"
            type="text"
            inputMode="decimal"
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
        <label className="field" htmlFor={id}>
          <span className="field-label">{def.label}</span>
          <input id={id} className="input" type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} />
        </label>
      );
    default:
      return (
        <label className="field" htmlFor={id}>
          <span className="field-label">{def.label}</span>
          <input id={id} className="input" type="text" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} />
        </label>
      );
  }
}

/** Formats a custom field value for display on the item page. */
export function formatAttribute(def: FieldDefinition, value: AttributeValue | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (def.field_type === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
