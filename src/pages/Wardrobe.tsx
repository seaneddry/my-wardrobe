import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterSheet } from '../components/FilterSheet';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { ItemCard } from '../components/ItemCard';
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

  // Only show category chips that are in use, in the order of the category list.
  const usedCategories = useMemo(() => {
    const used = new Set(items.map((i) => i.category));
    return lookups('category').map((l) => l.value).filter((c) => used.has(c));
  }, [items, lookups]);

  return (
    <div className="screen">
      <Header
        title="Wardrobe"
        subtitle={loading && items.length === 0 ? 'Loading…' : `${inWardrobe} ${inWardrobe === 1 ? 'piece' : 'pieces'}`}
      >
        <div className="search-row">
          <label className="search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search your wardrobe"
              aria-label="Search your wardrobe"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </label>
          <button
            type="button"
            className={`filter-button${sheetCount ? ' filter-button-on' : ''}`}
            onClick={() => setSheetOpen(true)}
            aria-label={sheetCount ? `Filter and sort, ${sheetCount} active` : 'Filter and sort'}
          >
            <Icon name="filter" size={20} />
            {sheetCount > 0 && <span className="filter-count">{sheetCount}</span>}
          </button>
        </div>
      </Header>

      {usedCategories.length > 1 && (
        <div className="category-scroll" role="group" aria-label="Category">
          {[null, ...usedCategories].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              className={`category${filters.category === c ? ' category-on' : ''}`}
              aria-pressed={filters.category === c}
              onClick={() => setFilters({ ...filters, category: c })}
            >
              {c ?? 'All'}
            </button>
          ))}
        </div>
      )}

      <main className="page">
        {!loading && items.length === 0 ? (
          <div className="empty">
            <h2>Start with one piece</h2>
            <p>Take a photo of something you wear often, add its details, and build from there.</p>
            <Link to="/add" className="button button-primary">
              Add a piece
            </Link>
          </div>
        ) : visible.length === 0 && narrowed ? (
          <div className="empty">
            <h2>Nothing matches</h2>
            <p>Try a different search, or clear the filters to see everything.</p>
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

      <FilterSheet
        open={sheetOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setSheetOpen(false)}
        resultCount={visible.length}
      />
    </div>
  );
}
