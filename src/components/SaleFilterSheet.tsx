import type { Item } from '../data/types';
import { DEFAULT_SALE_FILTERS, SALE_SORT_LABELS, type SaleFilters, type SaleSortKey } from '../lib/saleFilters';
import { useData } from '../state/data';
import { Chips } from './Chips';
import { Sheet } from './Sheet';
import { Swatch } from './Swatch';

/** Sort and filter sheet for the For Sale screen. Only offers colours and sizes used by sale pieces. */
export function SaleFilterSheet({ open, filters, onChange, onClose, resultCount, pieces }: {
  open: boolean;
  filters: SaleFilters;
  onChange: (f: SaleFilters) => void;
  onClose: () => void;
  resultCount: number;
  /** All on-sale and sold pieces, to work out which colours and sizes to offer. */
  pieces: Item[];
}) {
  const { lookups } = useData();
  const set = (patch: Partial<SaleFilters>) => onChange({ ...filters, ...patch });

  const usedColours = new Set(pieces.flatMap((i) => [i.colour, i.secondary_colour]).filter(Boolean));
  const colourOptions = lookups('colour')
    .filter((l) => usedColours.has(l.value) || filters.colours.includes(l.value))
    .map((l) => ({
      value: l.value,
      label: (
        <>
          <Swatch hex={l.meta.hex ?? null} size={12} />
          {l.value}
        </>
      ),
    }));

  const listedSizes = lookups('size').map((l) => l.value);
  const usedSizes = [...new Set(pieces.map((i) => i.size).filter((s): s is string => Boolean(s)))];
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
      title="Sort and filter"
      headerRight={
        <button type="button" className="nav-button" onClick={() => onChange({ ...DEFAULT_SALE_FILTERS, q: filters.q, category: filters.category })}>
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
          options={(Object.keys(SALE_SORT_LABELS) as SaleSortKey[]).map((k) => ({ value: k, label: SALE_SORT_LABELS[k] }))}
          value={[filters.sort]}
          allowDeselect={false}
          onChange={(v) => set({ sort: v[0] as SaleSortKey })}
        />,
      )}
      {section(
        'Price',
        <Chips
          label="Price"
          allowDeselect={false}
          options={[
            { value: 'all', label: 'Any' },
            { value: 'priced', label: 'Has a price' },
            { value: 'unpriced', label: 'No price yet' },
          ]}
          value={[filters.price]}
          onChange={(v) => set({ price: v[0] as SaleFilters['price'] })}
        />,
      )}
      {colourOptions.length > 0 &&
        section('Colour', <Chips multiple label="Colour" options={colourOptions} value={filters.colours} onChange={(colours) => set({ colours })} />)}
      {sizeOptions.length > 0 &&
        section('Size', <Chips multiple label="Size" options={sizeOptions} value={filters.sizes} onChange={(sizes) => set({ sizes })} />)}
    </Sheet>
  );
}
