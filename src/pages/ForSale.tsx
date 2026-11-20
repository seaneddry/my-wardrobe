import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { NavBar } from '../components/NavBar';
import { Photo } from '../components/Photo';
import { SaleFilterSheet } from '../components/SaleFilterSheet';
import { SaleSheet } from '../components/SaleSheet';
import { Sheet } from '../components/Sheet';
import { itemTitle, type Item } from '../data/types';
import { browseState, scrollToPiece, takeStep } from '../lib/browse';
import { SALE_LABELS, formatMoney, saleTotal, shortDate, type SaleStatus } from '../lib/sale';
import {
  DEFAULT_SALE_FILTERS,
  applySaleFilters,
  loadSaleFilters,
  saleNarrowed,
  saleSheetCount,
  saveSaleFilters,
  type SaleFilters,
} from '../lib/saleFilters';
import { useData } from '../state/data';

const TAB_KEY = 'sale-tab';

function readTab(): SaleStatus {
  try {
    return sessionStorage.getItem(TAB_KEY) === 'sold' ? 'sold' : 'for_sale';
  } catch {
    return 'for_sale';
  }
}

export function ForSale() {
  const { items, loading, lookups } = useData();
  const [tab, setTabState] = useState<SaleStatus>(readTab);
  const [pickOpen, setPickOpen] = useState(false);
  const [listing, setListing] = useState<Item | null>(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<SaleFilters>(loadSaleFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => saveSaleFilters(filters), [filters]);

  // Coming back after stepping through pieces: show the last one you looked at.
  useEffect(() => {
    const stepped = takeStep();
    if (stepped) requestAnimationFrame(() => scrollToPiece(stepped));
  }, []);

  const setTab = (t: SaleStatus) => {
    setTabState(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const salePieces = useMemo(() => items.filter((i) => i.status === 'for_sale' || i.status === 'sold'), [items]);
  const allOnSale = salePieces.filter((i) => i.status === 'for_sale').length;
  const allSold = salePieces.length - allOnSale;
  // Search, sort and filter apply to both lists, and the totals add up only what matches.
  const matches = useMemo(() => applySaleFilters(salePieces, filters), [salePieces, filters]);
  const onSale = useMemo(() => matches.filter((i) => i.status === 'for_sale'), [matches]);
  const sold = useMemo(() => matches.filter((i) => i.status === 'sold'), [matches]);
  const shown = tab === 'sold' ? sold : onSale;
  const shownIds = useMemo(() => shown.map((i) => i.id), [shown]);
  const totals = useMemo(() => ({ for_sale: saleTotal(onSale), sold: saleTotal(sold) }), [onSale, sold]);
  const narrowed = saleNarrowed(filters);
  const sheetCount = saleSheetCount(filters);

  // Category pills: only categories used by sale pieces, in the order of the category list.
  const usedCategories = useMemo(() => {
    const used = new Set(salePieces.map((i) => i.category));
    return lookups('category')
      .map((l) => l.value)
      .filter((c) => used.has(c));
  }, [salePieces, lookups]);

  const wardrobe = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter((i) => i.status === 'active')
      .filter((i) => {
        const text = [itemTitle(i), i.brand, i.category, i.item_type, i.colour, i.size].filter(Boolean).join(' ').toLowerCase();
        return terms.every((t) => text.includes(t));
      });
  }, [items, q]);

  const subtitle = loading && items.length === 0 ? 'Loading…' : undefined;

  return (
    <div className="screen">
      <NavBar
        large
        title="For Sale"
        subtitle={subtitle}
        right={
          <>
            <button
              type="button"
              className="nav-icon-button"
              onClick={() => setFilterOpen(true)}
              aria-label={sheetCount ? `Sort and filter, ${sheetCount} active` : 'Sort and filter'}
            >
              <Icon name="filter" size={24} weight={2} />
              {sheetCount > 0 && <span className="badge-dot">{sheetCount}</span>}
            </button>
            <Link to="/sale/add" viewTransition className="nav-pill" aria-label="Add a piece to sell">
              <Icon name="plus" size={16} weight={2.6} />
              Add
            </Link>
          </>
        }
      >
        {salePieces.length > 0 && (
          <div className="search-bar">
            <label className="search-field">
              <Icon name="search" size={18} weight={2} />
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Search name, brand or type"
                aria-label="Search pieces for sale"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
              {filters.q && (
                <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setFilters({ ...filters, q: '' })}>
                  <Icon name="close" size={12} weight={3} />
                </button>
              )}
            </label>
          </div>
        )}
        {usedCategories.length > 1 && (
          <div className="pill-row" role="group" aria-label="Category">
            {[null, ...usedCategories].map((c) => (
              <button
                key={c ?? 'all'}
                type="button"
                className={`pill${filters.category === c ? ' pill-on' : ''}`}
                aria-pressed={filters.category === c}
                onClick={() => setFilters({ ...filters, category: c })}
              >
                {c ?? 'All'}
              </button>
            ))}
          </div>
        )}
      </NavBar>

      <main className="page stack">
        <div className="sale-totals" role="group" aria-label="Show">
          {(Object.keys(SALE_LABELS) as SaleStatus[]).map((s) => {
            const { total, unpriced } = totals[s];
            const count = s === 'sold' ? sold.length : onSale.length;
            const all = s === 'sold' ? allSold : allOnSale;
            return (
              <button
                key={s}
                type="button"
                className={`sale-total${tab === s ? ' is-on' : ''}`}
                aria-pressed={tab === s}
                onClick={() => setTab(s)}
              >
                <span className="sale-total-label">{s === 'sold' ? 'Sold for' : 'On sale'}</span>
                <span className="sale-total-value">{formatMoney(total)}</span>
                <span className="sale-total-sub">
                  {narrowed ? `${count} of ${all}` : `${count} ${count === 1 ? 'piece' : 'pieces'}`}
                  {unpriced > 0 && ` · ${unpriced} no price`}
                </span>
              </button>
            );
          })}
        </div>

        {shown.length === 0 && narrowed && (tab === 'sold' ? allSold : allOnSale) > 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon name="search" size={28} weight={1.8} />
            </div>
            <h2>No matches</h2>
            <p>Try a different search, or clear the filters.</p>
            <button type="button" className="button button-secondary" onClick={() => setFilters({ ...DEFAULT_SALE_FILTERS, sort: filters.sort })}>
              Clear search and filters
            </button>
          </div>
        ) : shown.length === 0 ? (
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
                <SaleRow key={item.id} item={item} list={shownIds} />
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
          <input
            type="search"
            placeholder="Search your wardrobe"
            aria-label="Search your wardrobe"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
                  <span className="piece-sub">
                    {[item.brand, item.size && `Size ${item.size}`].filter(Boolean).join(' · ') || item.category}
                  </span>
                </span>
                <Icon name="chevron" size={16} weight={2.4} />
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <SaleFilterSheet
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        resultCount={shown.length}
        pieces={salePieces}
      />

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

function SaleRow({ item, list }: { item: Item; list: string[] }) {
  const sold = item.status === 'sold';
  const date = sold ? item.sold_at : item.listed_at;
  const sub = [item.size && `Size ${item.size}`, date && `${sold ? 'Sold' : 'Listed'} ${shortDate(date)}`].filter(Boolean).join(' · ');
  return (
    <Link to={`/item/${item.id}`} state={browseState(list)} data-item-id={item.id} viewTransition className="row sale-row">
      <span className="sale-thumb">
        <Photo path={item.photos[0]?.thumb ?? item.thumb_path} alt="" />
        {sold && <span className="sale-thumb-badge">Sold</span>}
      </span>
      <span className="row-label">
        {item.brand && <span className="card-brand">{item.brand}</span>}
        <span className="piece-title">{itemTitle(item)}</span>
        {sub && <span className="piece-sub">{sub}</span>}
      </span>
      <span className={`sale-price${item.sale_price == null ? ' is-empty' : ''}`}>
        {item.sale_price == null ? 'No price' : formatMoney(item.sale_price)}
      </span>
    </Link>
  );
}
