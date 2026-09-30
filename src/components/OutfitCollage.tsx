import type { Item } from '../data/types';
import { Photo } from './Photo';

/**
 * A flat-lay style collage of an outfit's pieces.
 * 1 piece fills the frame; 2 sit side by side; 3–4 use a 2×2 grid; 5–6 use a 3×2 grid
 * (the last tile shows "+N" when there are more).
 */
export function OutfitCollage({ items, label }: { items: Item[]; label: string }) {
  const shown = items.slice(0, 6);
  const extra = items.length - shown.length;
  return (
    <div className={`collage collage-${Math.min(items.length, 6) || 1}`} role="img" aria-label={label}>
      {shown.length === 0 && <div className="collage-tile" />}
      {shown.map((item, i) => (
        <div key={item.id} className="collage-tile">
          <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" />
          {i === shown.length - 1 && extra > 0 && <span className="collage-more">+{extra}</span>}
        </div>
      ))}
    </div>
  );
}
