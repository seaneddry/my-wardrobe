import { Link, useViewTransitionState } from 'react-router-dom';
import { itemTitle, type Item } from '../data/types';
import { useData } from '../state/data';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { Swatch } from './Swatch';

export function ItemCard({ item }: { item: Item }) {
  const { colourHex } = useData();
  const to = `/item/${item.id}`;
  // Names this card's photo during the transition so it morphs into the detail page.
  const transitioning = useViewTransitionState(to);
  const title = itemTitle(item);
  const detail = item.status === 'archived' ? 'Archived' : item.size ? `Size ${item.size}` : item.item_type || item.category;
  const cover = item.photos[0]?.thumb ?? item.thumb_path;

  return (
    <Link to={to} viewTransition className={`card pressable${item.status === 'archived' ? ' card-archived' : ''}`}>
      <div className="card-photo" style={transitioning ? { viewTransitionName: 'item-hero' } : undefined}>
        <Photo path={cover} alt={title} />
        {item.photos.length > 1 && (
          <span className="card-count" aria-label={`${item.photos.length} photos`}>
            <Icon name="photos" size={13} weight={2.2} />
            {item.photos.length}
          </span>
        )}
      </div>
      <div className="card-text">
        {item.brand && <span className="card-brand">{item.brand}</span>}
        <span className="card-title">{title}</span>
        {detail && (
          <span className="card-detail">
            <Swatch hex={colourHex(item.colour)} size={9} />
            {detail}
          </span>
        )}
      </div>
    </Link>
  );
}
