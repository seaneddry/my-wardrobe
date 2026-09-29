import { DEFAULT_FILTERS, SORT_LABELS, type Filters, type SortKey } from '../lib/filters';
import { useData } from '../state/data';
import { Chips } from './Chips';
import { Sheet } from './Sheet';
import { Swatch } from './Swatch';

export function FilterSheet({ open, filters, onChange, onClose, resultCount }: {
  open: boolean;
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  const { lookups, items } = useData();
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const opts = (list: Parameters<typeof lookups>[0]) => lookups(list).map((l) => ({ value: l.value }));

  // Sizes: listed sizes first, then any other size used on a piece (e.g. 32, 42).
  const listedSizes = lookups('size').map((l) => l.value);
  const usedSizes = [...new Set(items.map((i) => i.size).filter((s): s is string => Boolean(s)))];
  const sizeOptions = [
    ...listedSizes.filter((s) => usedSizes.includes(s)),
    ...usedSizes.filter((s) => !listedSizes.includes(s)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  ].map((value) => ({ value }));

  const section = (title: string, body: React.ReactNode) => (
    <section className="field">
      <h3 className="field-label">{title}</h3>
      {body}
    </section>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter and sort"
      headerRight={
        <button type="button" className="nav-button" onClick={() => onChange({ ...DEFAULT_FILTERS, q: filters.q, category: filters.category })}>
          Reset
        </button>
      }
      footer={
        <button type="button" className="button button-primary" onClick={onClose}>
          Show {resultCount} {resultCount === 1 ? 'piece' : 'pieces'}
        </button>
      }
    >
      {section(
        'Sort by',
        <Chips
          label="Sort by"
          options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ value: k, label: SORT_LABELS[k] }))}
          value={[filters.sort]}
          allowDeselect={false}
          onChange={(v) => set({ sort: v[0] as SortKey })}
        />,
      )}
      {section(
        'Colour',
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
        />,
      )}
      {section('Size', <Chips multiple label="Size" options={sizeOptions.length ? sizeOptions : opts('size')} value={filters.sizes} onChange={(sizes) => set({ sizes })} />)}
      {section('Season', <Chips multiple label="Season" options={opts('season')} value={filters.seasons} onChange={(seasons) => set({ seasons })} />)}
      {section('Occasion', <Chips multiple label="Occasion" options={opts('occasion')} value={filters.occasions} onChange={(occasions) => set({ occasions })} />)}
      {section(
        'Show',
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
        />,
      )}
    </Sheet>
  );
}
