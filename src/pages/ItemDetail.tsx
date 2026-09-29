import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Carousel } from '../components/Carousel';
import { formatAttribute } from '../components/CustomField';
import { Group } from '../components/Group';
import { Icon } from '../components/Icon';
import { NavBar } from '../components/NavBar';
import { Swatch } from '../components/Swatch';
import { useToast } from '../components/Toast';
import { itemTitle } from '../data/types';
import { errorMessage, formatDate, formatPrice } from '../lib/format';
import { useData } from '../state/data';

export function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { items, fields, colourHex, setItemStatus, deleteItem, loading } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const item = items.find((i) => i.id === id);

  // Opened directly (no history in this app): go to the wardrobe instead.
  const goBack = () => (location.key === 'default' ? navigate('/', { viewTransition: true }) : navigate(-1));
  const back = (
    <button type="button" className="nav-icon-button" onClick={goBack} aria-label="Back">
      <Icon name="back" size={22} weight={2.4} />
    </button>
  );

  if (!item) {
    return (
      <div className="screen">
        <NavBar title={loading ? '' : 'Not found'} left={back} />
        {!loading && (
          <div className="empty">
            <h2>Piece not found</h2>
            <p>It may have been deleted.</p>
            <Link to="/" className="button button-secondary">
              Back to wardrobe
            </Link>
          </div>
        )}
      </div>
    );
  }

  const current = item;
  const title = itemTitle(current);

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

  function remove() {
    if (!window.confirm(`Delete “${title}”? This removes the piece and all its photos for good.`)) return;
    run(async () => {
      await deleteItem(current);
      navigate('/', { replace: true, viewTransition: true });
    }, 'Piece deleted');
  }

  const facts = [
    ['Size', current.size],
    [
      'Colour',
      current.colour ? (
        <>
          <Swatch hex={colourHex(current.colour)} size={12} />
          {current.colour}
        </>
      ) : null,
    ],
    ['Condition', current.condition],
  ].filter(([, v]) => v) as Array<[string, React.ReactNode]>;

  const rows: Array<[string, string]> = [
    ['Category', current.category],
    ['Type', current.item_type ?? ''],
    ['Second colour', current.secondary_colour ?? ''],
    ['Season', current.seasons.join(', ')],
    ['Occasion', current.occasions.join(', ')],
    ['Bought', formatDate(current.purchase_date)],
    ['Price', formatPrice(current.price)],
    ...fields.map((f) => [f.label, formatAttribute(f, current.attributes[f.key])] as [string, string]),
  ];
  const shownRows = rows.filter(([, v]) => v);

  return (
    <div className="screen">
      <NavBar
        overlay
        title={title}
        left={back}
        right={
          <Link to={`/item/${current.id}/edit`} className="nav-button nav-button-strong">
            Edit
          </Link>
        }
      />
      <Carousel photos={current.photos} alt={title} heroName="item-hero" />

      <div className="detail-head">
        {current.brand && <p className="detail-brand">{current.brand}</p>}
        <h1 className="detail-title">{title}</h1>
        <p className="detail-sub">
          {current.item_type && current.item_type !== title ? `${current.category}, ${current.item_type}` : current.category}
        </p>
      </div>

      <main className="page detail-body stack" style={{ paddingTop: 16 }}>
        {current.status === 'archived' && <p className="notice">Archived. It’s hidden from your wardrobe but kept on record.</p>}

        {facts.length > 0 && (
          <div className="facts" style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}>
            {facts.map(([k, v]) => (
              <div key={k} className="fact">
                <span className="fact-label">{k}</span>
                <span className="fact-value">{v}</span>
              </div>
            ))}
          </div>
        )}

        {shownRows.length > 0 && (
          <Group header="Details">
            {shownRows.map(([k, v]) => (
              <div key={k} className="row">
                <span className="row-label">{k}</span>
                <span className="row-value">{v}</span>
              </div>
            ))}
          </Group>
        )}

        {current.notes && (
          <Group header="Notes" pad>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{current.notes}</p>
          </Group>
        )}

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}

        <Group>
          <button
            type="button"
            className="row"
            disabled={busy}
            onClick={() =>
              run(
                () => setItemStatus(current, current.status === 'archived' ? 'active' : 'archived'),
                current.status === 'archived' ? 'Back in your wardrobe' : 'Moved to archive',
              )
            }
          >
            <span className="row-icon">
              <Icon name={current.status === 'archived' ? 'restore' : 'archive'} size={18} />
            </span>
            <span className="row-label">{current.status === 'archived' ? 'Move back to wardrobe' : 'Archive'}</span>
          </button>
          <button type="button" className="row row-danger" disabled={busy} onClick={remove}>
            <span className="row-icon" style={{ color: 'var(--danger)' }}>
              <Icon name="trash" size={18} />
            </span>
            <span className="row-label">Delete piece</span>
          </button>
        </Group>

        <p className="footnote">Added {new Date(current.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>
    </div>
  );
}
