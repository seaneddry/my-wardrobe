import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Group } from '../../components/Group';
import { Icon } from '../../components/Icon';
import { NavBar } from '../../components/NavBar';
import { OutfitCollage } from '../../components/OutfitCollage';
import { Photo } from '../../components/Photo';
import { useToast } from '../../components/Toast';
import { itemTitle } from '../../data/types';
import { errorMessage } from '../../lib/format';
import { outfitItems, SLOT_LABELS, slotForCategory } from '../../lib/outfits';
import { useData } from '../../state/data';

export function OutfitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { outfits, items, lookups, saveOutfit, deleteOutfit, loading } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outfit = outfits.find((o) => o.id === id);

  const goBack = () => (location.key === 'default' ? navigate('/outfits', { viewTransition: true }) : navigate(-1));
  const back = (
    <button type="button" className="nav-icon-button" onClick={goBack} aria-label="Back">
      <Icon name="back" size={22} weight={2.4} />
    </button>
  );

  if (!outfit) {
    return (
      <div className="screen">
        <NavBar title="" left={back} />
        {!loading && (
          <div className="empty">
            <h2>Outfit not found</h2>
            <Link to="/outfits" className="button button-secondary">
              Back to outfits
            </Link>
          </div>
        )}
      </div>
    );
  }

  const current = outfit;
  const pieces = outfitItems(current, items);
  const missing = current.pieces.length - pieces.length;
  const categories = lookups('category');

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (done) toast(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleFavourite() {
    const { id: _id, created_at: _c, updated_at: _u, ...fields } = current;
    run(() => saveOutfit({ ...fields, favourite: !current.favourite }, current.id), current.favourite ? 'Removed from favourites' : 'Added to favourites');
  }

  function remove() {
    if (!window.confirm(`Delete the outfit “${current.name}”? Your pieces stay in your wardrobe.`)) return;
    run(async () => {
      await deleteOutfit(current.id);
      navigate('/outfits', { replace: true, viewTransition: true });
    }, 'Outfit deleted');
  }

  return (
    <div className="screen">
      <NavBar
        title={current.name}
        left={back}
        right={
          <Link to={`/outfits/${current.id}/edit`} className="nav-button nav-button-strong">
            Edit
          </Link>
        }
      />
      <main className="page stack" style={{ maxWidth: 720, paddingTop: 8 }}>
        <div className="outfit-hero">
          <OutfitCollage items={pieces} label={current.name} />
        </div>

        <div>
          <h1 className="detail-title">{current.name}</h1>
          <div className="tag-row">
            {current.occasion && <span className="tag">{current.occasion}</span>}
            {current.mood && <span className="tag">{current.mood}</span>}
            {current.source === 'ai' && (
              <span className="tag tag-ai">
                <Icon name="sparkles" size={13} weight={2} /> Stylist pick
              </span>
            )}
          </div>
        </div>

        {current.ai_reason && (
          <Group header="Why it works" pad>
            <p className="prose">{current.ai_reason}</p>
          </Group>
        )}

        <Group header={`${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}`} footer={missing > 0 ? `${missing} piece${missing === 1 ? ' was' : 's were'} deleted from your wardrobe.` : undefined}>
          {pieces.map((item) => (
            <Link key={item.id} to={`/item/${item.id}`} viewTransition className="row piece-row">
              <span className="piece-thumb">
                <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" />
              </span>
              <span className="row-label">
                <span className="piece-title">{itemTitle(item)}</span>
                <span className="piece-sub">{SLOT_LABELS[slotForCategory(item.category, categories)]}</span>
              </span>
              <Icon name="chevron" size={16} weight={2.4} />
            </Link>
          ))}
        </Group>

        {current.notes && (
          <Group header="Notes" pad>
            <p className="prose">{current.notes}</p>
          </Group>
        )}

        {error && <p className="notice notice-error">{error}</p>}

        <Group>
          <button type="button" className="row" disabled={busy} onClick={toggleFavourite}>
            <span className="row-icon">
              <Icon name="heart" size={18} filled={current.favourite} weight={current.favourite ? 0 : 1.8} />
            </span>
            <span className="row-label">{current.favourite ? 'Remove from favourites' : 'Add to favourites'}</span>
          </button>
          <button type="button" className="row row-danger" disabled={busy} onClick={remove}>
            <span className="row-icon" style={{ color: 'var(--danger)' }}>
              <Icon name="trash" size={18} />
            </span>
            <span className="row-label">Delete outfit</span>
          </button>
        </Group>
      </main>
    </div>
  );
}
