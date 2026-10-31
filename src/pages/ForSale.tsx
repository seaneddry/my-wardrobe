import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { NavBar } from '../components/NavBar';
import { Photo } from '../components/Photo';
import { SaleSheet } from '../components/SaleSheet';
import { Sheet } from '../components/Sheet';
import { itemTitle, type Item } from '../data/types';
import { SALE_LABELS, formatMoney, shortDate, type SaleStatus } from '../lib/sale';
import { useData } from '../state/data';

const TAB_KEY = 'sale-tab';

function readTab(): SaleStatus {
  try {
    return sessionStorage.getItem(TAB_KEY) === 'sold' ? 'sold' : 'for_sale';
  } catch {
    return 'for_sale';
  }
}

/** Newest first: by sold date on the Sold tab, by listed date on the On sale tab. */
function byDate(tab: SaleStatus) {
  return (a: Item, b: Item) => {
    const da = (tab === 'sold' ? a.sold_at : a.listed_at) ?? a.updated_at;
    const db = (tab === 'sold' ? b.sold_at : b.listed_at) ?? b.updated_at;
    return db.localeCompare(da);
  };
}

export function ForSale() {
  const { items, loading } = useData();
  const [tab, setTabState] = useState<SaleStatus>(readTab);
  const [pickOpen, setPickOpen] = useState(false);
  const [listing, setListing] = useState<Item | null>(null);
  const [q, setQ] = useState('');

  const setTab = (t: SaleStatus) => {
    setTabState(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const onSale = useMemo(() => items.filter((i) => i.status === 'for_sale').sort(byDate('for_sale')), [items]);
  const sold = useMemo(() => items.filter((i) => i.status === 'sold').sort(byDate('sold')), [items]);
  const shown = tab === 'sold' ? sold : onSale;

  const wardrobe = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter((i) => i.status === 'active')
      .filter((i) => {
        const text = [itemTitle(i), i.brand, i.category, i.item_type, i.colour, i.size].filter(Boolean).join(' ').toLowerCase();
        return terms.every((t) => text.includes(t));
      });
  }, [items, q]);

  const subtitle =
    loading && items.length === 0 ? 'Loading…' : `${onSale.length} on sale · ${sold.length} sold`;

  return (
    <div className="screen">
      <NavBar
        large
        title="For Sale"
        subtitle={subtitle}
        right={
          <Link to="/sale/add" viewTransition className="nav-pill" aria-label="Add a piece to sell">
            <Icon name="plus" size={16} weight={2.6} />
            Add
          </Link>
        }
      >
        <div className="sale-tabs">
          <div className="segmented" role="group" aria-label="Show">
            {(Object.keys(SALE_LABELS) as SaleStatus[]).map((s) => (
              <button key={s} type="button" aria-pressed={tab === s} onClick={() => setTab(s)}>
                {SALE_LABELS[s]}
                <span className="segmented-count">{s === 'sold' ? sold.length : onSale.length}</span>
              </button>
            ))}
          </div>
        </div>
      </NavBar>

      <main className="page stack">
        {shown.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon name="tag" size={28} weight={1.8} />
            </div>
            {tab === 'sold' ? (
              <>
                <h2>Nothing sold yet</h2>
                <p>When a piece sells, mark it as sold and it moves here.</p>
              </>
            ) : (
              <>
                <h2>Nothing on sale</h2>
                <p>Add a piece you want to sell, or pick one from your wardrobe.</p>
                <Link to="/sale/add" viewTransition className="button button-primary">
                  Add a piece to sell
                </Link>
              </>
            )}
          </div>
        ) : (
          <section className="group">
            <div className="group-body">
              {shown.map((item) => (
                <SaleRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {tab === 'for_sale' && (
          <button type="button" className="quick-link" onClick={() => setPickOpen(true)}>
            <span className="row-icon">
              <Icon name="hanger" size={18} />
            </span>
            <span className="row-label">
              <span className="piece-title">Sell something from my wardrobe</span>
              <span className="piece-sub">Pick a piece you already have</span>
            </span>
            <Icon name="chevron" size={16} weight={2.4} />
          </button>
        )}
      </main>

      <Sheet open={pickOpen} onClose={() => setPickOpen(false)} title="Choose a piece" full>
        <label className="search-field" style={{ flex: 'none', marginBottom: 12 }}>
          <Icon name="search" size={18} weight={2} />
          <input type="search" placeholder="Search your wardrobe" aria-label="Search your wardrobe" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {wardrobe.length === 0 ? (
          <p className="sale-hint">{q ? 'No matches.' : 'Everything in your wardrobe is already on sale or sold.'}</p>
        ) : (
          <div className="group-body">
            {wardrobe.map((item) => (
              <button
                key={item.id}
                type="button"
                className="row piece-row"
                onClick={() => {
                  setPickOpen(false);
                  // Let the picker finish closing before the price sheet opens.
                  setTimeout(() => setListing(item), 260);
                }}
              >
                <span className="piece-thumb">
                  <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" />
                </span>
                <span className="row-label">
                  <span className="piece-title">{itemTitle(item)}</span>
                  <span className="piece-sub">{[item.brand, item.size && `Size ${item.size}`].filter(Boolean).join(' · ') || item.category}</span>
                </span>
                <Icon name="chevron" size={16} weight={2.4} />
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <SaleSheet
        item={listing}
        open={listing !== null}
        onClose={() => setListing(null)}
        onDone={() => {
          setTab('for_sale');
          setQ('');
        }}
      />
    </div>
  );
}

function SaleRow({ item }: { item: Item }) {
  const sold = item.status === 'sold';
  const date = sold ? item.sold_at : item.listed_at;
  const sub = [item.size && `Size ${item.size}`, date && `${sold ? 'Sold' : 'Listed'} ${shortDate(date)}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link to={`/item/${item.id}`} viewTransition className="row sale-row">
      <span className="sale-thumb">
        <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" />
        {sold && <span className="sale-thumb-badge">Sold</span>}
      </span>
      <span className="row-label">
        {item.brand && <span className="card-brand">{item.brand}</span>}
        <span className="piece-title">{itemTitle(item)}</span>
        {sub && <span className="piece-sub">{sub}</span>}
      </span>
      <span className={`sale-price${item.sale_price == null ? ' is-empty' : ''}`}>{item.sale_price == null ? 'No price' : formatMoney(item.sale_price)}</span>
    </Link>
  );
}
