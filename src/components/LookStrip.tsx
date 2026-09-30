import type { Item } from '../data/types';
import { BUILDER_SLOTS, SLOT_LABELS, type BuilderSlot, type Selection } from '../lib/outfits';

const SHORT: Record<BuilderSlot, string> = { head: 'Hat', outer: 'Outer', top: 'Top', bottom: 'Bottom', shoes: 'Shoes', accessory: 'Extra' };
import { Photo } from './Photo';

/** Sticky mini preview of the whole outfit. Tap a piece to jump to its row. */
export function LookStrip({ sel, items, shown, onJump }: {
  sel: Selection;
  items: Item[];
  shown: BuilderSlot[];
  onJump: (slot: BuilderSlot) => void;
}) {
  return (
    <div className="look-strip" role="navigation" aria-label="Outfit so far">
      {BUILDER_SLOTS.filter((s) => shown.includes(s)).map((slot) => {
        const item = sel[slot] ? items.find((i) => i.id === sel[slot]) : undefined;
        return (
          <button key={slot} type="button" className={`look-tile${item ? '' : ' is-empty'}`} onClick={() => onJump(slot)} aria-label={`${SLOT_LABELS[slot]}${item ? '' : ', none'}. Jump to row`}>
            {item ? <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" /> : <span>{SHORT[slot]}</span>}
          </button>
        );
      })}
    </div>
  );
}
