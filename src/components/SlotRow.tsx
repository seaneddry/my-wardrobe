import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { itemTitle, type Item } from '../data/types';
import { Icon } from './Icon';
import { Photo } from './Photo';

/**
 * One row of the outfit canvas: large photos that snap to the centre. The centred
 * piece is the one "worn". Swipe, use the ‹ › buttons, or tap the centred piece
 * (or "See all") to pick from a grid. Optional rows start with "None".
 */
export function SlotRow({ id, label, items, selectedId, onSelect, optional, locked, onToggleLock, onSeeAll, emptyHint, disabledNote, delay = 0 }: {
  id: string;
  label: string;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  optional: boolean;
  locked: boolean;
  onToggleLock: () => void;
  onSeeAll: () => void;
  emptyHint: string;
  /** Shown instead of the photos, e.g. "Covered by your dress". */
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
  }, [disabledNote, items.length === 0]);

  // When the selection changes from outside (shuffle, AI, grid picker), glide to it.
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

  function go(i: number) {
    const el = track.current;
    if (!el || locked) return;
    const target = Math.min(options.length - 1, Math.max(0, i));
    el.scrollTo({ left: target * step(), behavior: 'smooth' });
  }

  const current = options[active];
  const isEmpty = items.length === 0;

  return (
    <section id={id} className={`slot-row${locked ? ' is-locked' : ''}`} aria-label={label}>
      <div className="slot-head">
        <div className="slot-titles">
          <span className="slot-label">{label}</span>
          <span className="slot-name">{disabledNote || isEmpty ? '' : current ? itemTitle(current) : 'None'}</span>
        </div>
        {!disabledNote && !isEmpty && (
          <>
            <button type="button" className="slot-action" onClick={onSeeAll} disabled={locked}>
              See all
            </button>
            <button
              type="button"
              className={`slot-lock${locked ? ' is-on' : ''}`}
              onClick={onToggleLock}
              aria-pressed={locked}
              aria-label={locked ? `Unlock ${label}` : `Lock ${label} so shuffle keeps it`}
            >
              <Icon name={locked ? 'lock' : 'unlock'} size={17} weight={2.2} />
            </button>
          </>
        )}
      </div>

      {disabledNote ? (
        <div className="slot-note">{disabledNote}</div>
      ) : isEmpty ? (
        <Link to="/add" className="slot-empty">
          <span>{emptyHint}</span>
          <span className="slot-empty-cta">
            <Icon name="plus" size={16} weight={2.4} /> Add one
          </span>
        </Link>
      ) : (
        <div className="slot-stage">
          <div className="slot-track" ref={track} onScroll={onScroll}>
            {options.map((item, i) => (
              <button
                key={item ? item.id : 'none'}
                type="button"
                className={`slot-card${i === active ? ' is-active' : ''}`}
                onClick={() => (i === active ? onSeeAll() : go(i))}
                aria-label={item ? itemTitle(item) : `No ${label.toLowerCase()}`}
                aria-current={i === active}
                disabled={locked}
              >
                {item ? <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" /> : <span className="slot-none">None</span>}
              </button>
            ))}
          </div>
          {options.length > 1 && !locked && (
            <>
              <button type="button" className="slot-arrow slot-arrow-prev" onClick={() => go(active - 1)} disabled={active === 0} aria-label={`Previous ${label.toLowerCase()}`}>
                <Icon name="left" size={20} weight={2.4} />
              </button>
              <button type="button" className="slot-arrow slot-arrow-next" onClick={() => go(active + 1)} disabled={active >= options.length - 1} aria-label={`Next ${label.toLowerCase()}`}>
                <Icon name="right" size={20} weight={2.4} />
              </button>
            </>
          )}
          {options.length > 1 && (
            <div className="slot-count" aria-hidden="true">
              {active + 1} / {options.length}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
