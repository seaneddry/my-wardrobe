import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatAttribute } from '../components/CustomField';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { Swatch } from '../components/Swatch';
import { itemTitle } from '../data/types';
import { errorMessage, formatDate, formatPrice } from '../lib/format';
import { useData } from '../state/data';

export function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, fields, colourHex, setItemStatus, deleteItem, loading } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const item = items.find((i) => i.id === id);

  const back = (
    <button type="button" className="header-button" onClick={() => navigate(-1)}>
      <Icon name="back" size={20} /> Back
    </button>
  );

  if (!item) {
    return (
      <div className="screen">
        <Header title={loading ? 'Loading…' : 'Piece not found'} left={back} />
        {!loading && (
          <div className="page">
            <p>This piece may have been deleted.</p>
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

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!window.confirm(`Delete “${title}”? This removes the piece and its photo for good.`)) return;
    run(async () => {
      await deleteItem(current);
      navigate('/', { replace: true });
    });
  }

  const colours = [current.colour, current.secondary_colour].filter((c): c is string => Boolean(c));
  const rows: Array<[string, React.ReactNode]> = [
    ['Category', current.category],
    ['Type', current.item_type],
    [
      'Colour',
      colours.length ? (
        <span className="inline-list">
          {colours.map((c) => (
            <span key={c} className="with-swatch">
              <Swatch hex={colourHex(c)} /> {c}
            </span>
          ))}
        </span>
      ) : null,
    ],
    ['Size', current.size],
    ['Brand', current.brand],
    ['Season', current.seasons.join(', ')],
    ['Occasion', current.occasions.join(', ')],
    ['Bought', formatDate(current.purchase_date)],
    ['Price', formatPrice(current.price)],
    ['Condition', current.condition],
    ...fields.map((f) => [f.label, formatAttribute(f, current.attributes[f.key])] as [string, string]),
  ];

  return (
    <div className="screen">
      <Header
        title={title}
        left={back}
        right={
          <Link to={`/item/${current.id}/edit`} className="header-button">
            <Icon name="edit" size={20} /> Edit
          </Link>
        }
      />
      <div className="detail-photo">
        <Photo path={current.photo_path} alt={title} fit="contain" eager />
      </div>
      <main className="page stack">
        {current.status === 'archived' && <p className="notice">Archived. It's hidden from your wardrobe but kept on record.</p>}
        <dl className="details">
          {rows
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => (
              <div key={k} className="detail-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        {current.notes && (
          <section>
            <h2 className="section-title">Notes</h2>
            <p className="notes">{current.notes}</p>
          </section>
        )}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="action-row">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={() => run(() => setItemStatus(current, current.status === 'archived' ? 'active' : 'archived'))}
          >
            <Icon name="archive" size={20} />
            {current.status === 'archived' ? 'Move back to wardrobe' : 'Archive'}
          </button>
          <button type="button" className="button button-danger" disabled={busy} onClick={remove}>
            <Icon name="trash" size={20} /> Delete
          </button>
        </div>
        <p className="meta">Added {new Date(current.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </main>
    </div>
  );
}
