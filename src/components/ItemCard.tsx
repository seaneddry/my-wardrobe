import { Link } from 'react-router-dom';
import { itemTitle, type Item } from '../data/types';
import { useData } from '../state/data';
import { Photo } from './Photo';
import { Swatch } from './Swatch';

export function ItemCard({ item }: { item: Item }) {
  const { colourHex } = useData();
  const title = itemTitle(item);
  const detail = [item.item_type || item.category, item.size].filter(Boolean).join(', ');
  return (
    <Link to={`/item/${item.id}`} className={`card${item.status === 'archived' ? ' card-archived' : ''}`}>
      <Photo path={item.thumb_path} alt={title} />
      <div className="card-text">
        <span className="card-title">
          <Swatch hex={colourHex(item.colour)} size={10} />
          {title}
        </span>
        <span className="card-detail">{item.status === 'archived' ? 'Archived' : detail}</span>
      </div>
    </Link>
  );
}
