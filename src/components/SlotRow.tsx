import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { itemTitle, type Item } from '../data/types';
import { Icon } from './Icon';
import { Photo } from './Photo';

/**
 * One row of the outfit canvas: a horizontal strip of pieces that snaps to the
 * centre. The centred piece is the one "worn". Optional rows start with "None".
 */
export function SlotRow({ label, items, selectedId, onSelect, optional, locked, onToggleLock, disabledNote, delay = 0 }: {
  label: string;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  optional: boolean;
  locked: boolean;
  onToggleLock: () => void;
  /** Shown instead of the strip, e.g. "Covered by your dress". */
  disabledNote?: string;
  /** Stagger for shuffle animations, in ms. */
  delay?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const options: Array<Item | null> = optional ? [null, ...items] : items;
  const indexOf = (id: string | null) => Math.max(0, options.findIndex((o) => (o ? o.id : null) === id));
  const [active, setActive] = useState(indexOf(selectedId));
  const programmatic = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = () => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('.slot-card');
    if (!el || !card) return 1;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    return card.offsetWidth + gap;
  };

  // Jump into place on first render without animating.
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = indexOf(selectedId) * step();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledNote]);

  // When the selection changes from outside (shuffle, AI, reset), glide to it.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const target = indexOf(selectedId);
    if (Math.round(el.scrollLeft / step()) === target) {
      setActive(target);
      return;
    }
    programmatic.current = true;
    const t = setTimeout(() => {
      el.scrollTo({ left: target * step(), behavior: 'smooth' });
      setActive(target);
      setTimeout(() => (programmatic.current = false), 450);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, items.length]);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollLeft / step())));
    setActive(i);
    if (programmatic.current) return;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const chosen = options[i];
      const id = chosen ? chosen.id : null;
      if (id !== selectedId) onSelect(id);
    }, 140);
  }

  function choose(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * step(), behavior: 'smooth' });
  }

  const current = options[active];

  return (
    <section className={`slot-row${locked ? ' is-locked' : ''}`} aria-label={label}>
      <div className="slot-head">
        <span className="slot-label">{label}</span>
        <span className="slot-name">{disabledNote ? '' : current ? itemTitle(current) : 'None'}</span>
        {!disabledNote && (
          <button
            type="button"
            className={`slot-lock${locked ? ' is-on' : ''}`}
            onClick={onToggleLock}
            aria-pressed={locked}
            aria-label={locked ? `Unlock ${label}` : `Lock ${label} so shuffle keeps it`}
          >
            <Icon name={locked ? 'lock' : 'unlock'} size={15} weight={2.2} />
          </button>
        )}
      </div>
      {disabledNote ? (
        <div className="slot-note">{disabledNote}</div>
      ) : (
        <div className="slot-track" ref={track} onScroll={onScroll}>
          {options.map((item, i) => (
            <button
              key={item ? item.id : 'none'}
              type="button"
              className={`slot-card${i === active ? ' is-active' : ''}`}
              onClick={() => choose(i)}
              aria-label={item ? itemTitle(item) : `No ${label.toLowerCase()}`}
              aria-current={i === active}
              disabled={locked}
            >
              {item ? <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" /> : <span className="slot-none">None</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
