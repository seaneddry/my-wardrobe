import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { NavBar } from '../../components/NavBar';
import { OutfitCollage } from '../../components/OutfitCollage';
import { outfitItems } from '../../lib/outfits';
import { useData } from '../../state/data';

export function Outfits() {
  const { outfits, items, loading } = useData();
  const [filter, setFilter] = useState<string>('all');

  const occasions = useMemo(() => [...new Set(outfits.map((o) => o.occasion).filter((o): o is string => Boolean(o)))], [outfits]);
  const visible = outfits.filter((o) =>
    filter === 'all' ? true : filter === 'favourites' ? o.favourite : o.occasion === filter,
  );

  return (
    <div className="screen">
      <NavBar
        large
        title="Outfits"
        subtitle={loading && outfits.length === 0 ? 'Loading…' : `${outfits.length} saved`}
        right={
          <Link to="/outfits/new" viewTransition className="nav-icon-button" aria-label="New outfit">
            <Icon name="plus" size={26} weight={2} />
          </Link>
        }
      >
        {outfits.length > 0 && (
          <div className="pill-row" role="group" aria-label="Show">
            {['all', 'favourites', ...occasions].map((f) => (
              <button key={f} type="button" className={`pill${filter === f ? ' pill-on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'favourites' ? 'Favourites' : f}
              </button>
            ))}
          </div>
        )}
      </NavBar>

      <main className="page">
        {!loading && outfits.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon name="layers" size={28} />
            </div>
            <h2>No outfits yet</h2>
            <p>Mix and match your pieces on the canvas, or let the stylist suggest a few looks.</p>
            <Link to="/outfits/new" viewTransition className="button button-primary">
              Build an outfit
            </Link>
            <Link to="/stylist" viewTransition className="button button-secondary">
              <Icon name="sparkles" size={20} /> Ask the stylist
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <h2>Nothing here</h2>
            <p>No outfits match this filter.</p>
          </div>
        ) : (
          <div className="outfit-grid">
            {visible.map((o) => {
              const pieces = outfitItems(o, items);
              const meta = [o.occasion, o.mood].filter(Boolean).join(', ');
              return (
                <Link key={o.id} to={`/outfits/${o.id}`} viewTransition className="outfit-card pressable">
                  <div className="outfit-card-photo">
                    <OutfitCollage items={pieces} label={o.name} />
                    {o.favourite && (
                      <span className="outfit-fav" aria-label="Favourite">
                        <Icon name="heart" size={14} filled weight={0} />
                      </span>
                    )}
                    {o.source === 'ai' && (
                      <span className="outfit-ai" title="Suggested by the stylist">
                        <Icon name="sparkles" size={13} weight={2} />
                      </span>
                    )}
                  </div>
                  <span className="card-title">{o.name}</span>
                  <span className="card-detail">{meta || `${pieces.length} pieces`}</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
