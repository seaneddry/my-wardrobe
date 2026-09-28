import { useEffect } from 'react';
import { DEFAULT_FILTERS, SORT_LABELS, type Filters, type SortKey } from '../lib/filters';
import { useData } from '../state/data';
import { Chips } from './Chips';
import { Icon } from './Icon';
import { Swatch } from './Swatch';

export function FilterSheet({ open, filters, onChange, onClose, resultCount }: {
  open: boolean;
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  const { lookups, items } = useData();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);

  if (!open) return null;
  // Sizes: listed sizes first, then any other size used on a piece (e.g. 32, 42).
  const listedSizes = lookups('size').map((l) => l.value);
  const usedSizes = [...new Set(items.map((i) => i.size).filter((s): s is string => Boolean(s)))];
  const sizeOptions = [
    ...listedSizes.filter((s) => usedSizes.includes(s)),
    ...usedSizes.filter((s) => !listedSizes.includes(s)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  ].map((value) => ({ value }));
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const opts = (list: Parameters<typeof lookups>[0]) => lookups(list).map((l) => ({ value: l.value }));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Filter and sort" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Filter and sort</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="sheet-body">
          <section className="field">
            <h3 className="field-label">Sort by</h3>
            <Chips
              label="Sort by"
              options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ value: k, label: SORT_LABELS[k] }))}
              value={[filters.sort]}
              allowDeselect={false}
              onChange={(v) => set({ sort: v[0] as SortKey })}
            />
          </section>
          <section className="field">
            <h3 className="field-label">Colour</h3>
            <Chips
              multiple
              label="Colour"
              options={lookups('colour').map((l) => ({
                value: l.value,
                label: (
                  <>
                    <Swatch hex={l.meta.hex ?? null} size={12} />
                    {l.value}
                  </>
                ),
              }))}
              value={filters.colours}
              onChange={(colours) => set({ colours })}
            />
          </section>
          <section className="field">
            <h3 className="field-label">Size</h3>
            <Chips multiple label="Size" options={sizeOptions.length ? sizeOptions : opts('size')} value={filters.sizes} onChange={(sizes) => set({ sizes })} />
          </section>
          <section className="field">
            <h3 className="field-label">Season</h3>
            <Chips multiple label="Season" options={opts('season')} value={filters.seasons} onChange={(seasons) => set({ seasons })} />
          </section>
          <section className="field">
            <h3 className="field-label">Occasion</h3>
            <Chips multiple label="Occasion" options={opts('occasion')} value={filters.occasions} onChange={(occasions) => set({ occasions })} />
          </section>
          <section className="field">
            <h3 className="field-label">Show</h3>
            <Chips
              label="Show"
              allowDeselect={false}
              options={[
                { value: 'active', label: 'In wardrobe' },
                { value: 'archived', label: 'Archived' },
                { value: 'all', label: 'Everything' },
              ]}
              value={[filters.status]}
              onChange={(v) => set({ status: v[0] as Filters['status'] })}
            />
          </section>
        </div>

        <div className="sheet-foot">
          <button
            type="button"
            className="button button-quiet"
            onClick={() => onChange({ ...DEFAULT_FILTERS, q: filters.q, category: filters.category })}
          >
            Clear filters
          </button>
          <button type="button" className="button button-primary" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'piece' : 'pieces'}
          </button>
        </div>
      </div>
    </div>
  );
}
