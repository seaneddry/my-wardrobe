import type { ReactNode } from 'react';

interface Option {
  value: string;
  label?: ReactNode;
}

/** A wrapping group of toggle chips. Single-select when `multiple` is false. */
export function Chips({ options, value, onChange, multiple = false, label, allowDeselect = true }: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  label: string;
  allowDeselect?: boolean;
}) {
  function toggle(v: string) {
    const on = value.includes(v);
    if (multiple) onChange(on ? value.filter((x) => x !== v) : [...value, v]);
    else if (on) allowDeselect && onChange([]);
    else onChange([v]);
  }
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" className={`chip${on ? ' chip-on' : ''}`} aria-pressed={on} onClick={() => toggle(o.value)}>
            {o.label ?? o.value}
          </button>
        );
      })}
    </div>
  );
}
