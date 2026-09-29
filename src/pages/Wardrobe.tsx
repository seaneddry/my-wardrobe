import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterSheet } from '../components/FilterSheet';
import { Icon } from '../components/Icon';
import { ItemCard } from '../components/ItemCard';
import { NavBar } from '../components/NavBar';
import { DEFAULT_FILTERS, applyFilters, loadFilters, saveFilters, sheetFilterCount, type Filters } from '../lib/filters';
import { useData } from '../state/data';

const SCROLL_KEY = 'wardrobe-scroll';

export function Wardrobe() {
  const { items, loading, lookups } = useData();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => saveFilters(filters), [filters]);

  // Return to the same scroll position after viewing a piece.
  useEffect(() => {
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(SCROLL_KEY) || 0);
    } catch {
      /* ignore */
    }
    if (saved) requestAnimationFrame(() => window.scrollTo(0, saved));
    return () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      } catch {
        /* ignore */
      }
    };
  }, []);

  const visible = useMemo(() => applyFilters(items, filters), [items, filters]);
  const inWardrobe = items.filter((i) => i.status === 'active').length;
  const sheetCount = sheetFilterCount(filters);
  const narrowed = filters.q || filters.category || sheetCount > 0;

  // Only show categories that are in use, in the order of the category list.
  const usedCategories = useMemo(() => {
    const used = new Set(items.map((i) => i.category));
    return lookups('category').map((l) => l.value).filter((c) => used.has(c));
  }, [items, lookups]);

  return (
    <div className="screen">
      <NavBar
        large
        title="Wardrobe"
        subtitle={loading && items.length === 0 ? 'Loading…' : `${inWardrobe} ${inWardrobe === 1 ? 'piece' : 'pieces'}`}
        right={
          <button
            type="button"
            className="nav-icon-button"
            onClick={() => setSheetOpen(true)}
            aria-label={sheetCount ? `Filter and sort, ${sheetCount} active` : 'Filter and sort'}
          >
            <Icon name="filter" size={24} weight={2} />
            {sheetCount > 0 && <span className="badge-dot">{sheetCount}</span>}
          </button>
        }
      >
        <div className="search-bar">
          <label className="search-field">
            <Icon name="search" size={18} weight={2} />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Search"
              aria-label="Search your wardrobe"
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

      <main className="page">
        {!loading && items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon name="hanger" size={30} weight={1.6} />
            </div>
            <h2>Your wardrobe is empty</h2>
            <p>Add something you wear often. Snap a photo, pick one from your library, or find it online.</p>
            <Link to="/add" viewTransition className="button button-primary">
              Add your first piece
            </Link>
          </div>
        ) : visible.length === 0 && narrowed ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon name="search" size={28} weight={1.8} />
            </div>
            <h2>No matches</h2>
            <p>Try a different search, or clear the filters.</p>
            <button type="button" className="button button-secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear search and filters
            </button>
          </div>
        ) : (
          <div className="grid">
            {visible.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      <FilterSheet open={sheetOpen} filters={filters} onChange={setFilters} onClose={() => setSheetOpen(false)} resultCount={visible.length} />
    </div>
  );
}
