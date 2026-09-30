import { itemTitle, type Item } from '../data/types';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { Sheet } from './Sheet';

/** Full grid of options for one outfit row. */
export function SlotPicker({ open, onClose, label, items, selectedId, optional, onSelect }: {
  open: boolean;
  onClose: () => void;
  label: string;
  items: Item[];
  selectedId: string | null;
  optional: boolean;
  onSelect: (id: string | null) => void;
}) {
  const choose = (id: string | null) => {
    onSelect(id);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={`Choose ${label.toLowerCase()}`} full>
      <div className="picker-grid">
        {optional && (
          <button type="button" className={`picker-item${selectedId === null ? ' is-on' : ''}`} onClick={() => choose(null)}>
            <span className="picker-photo picker-none">None</span>
            <span className="picker-name">No {label.toLowerCase()}</span>
          </button>
        )}
        {items.map((item) => (
          <button key={item.id} type="button" className={`picker-item pressable${selectedId === item.id ? ' is-on' : ''}`} onClick={() => choose(item.id)}>
            <span className="picker-photo">
              <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" />
              {selectedId === item.id && (
                <span className="web-check">
                  <Icon name="check" size={15} weight={3} />
                </span>
              )}
            </span>
            <span className="picker-name">{itemTitle(item)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
