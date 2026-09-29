import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chips } from '../components/Chips';
import { CustomFieldRow, CustomMultiselect } from '../components/CustomField';
import { Group } from '../components/Group';
import { NavBar } from '../components/NavBar';
import { MAX_PHOTOS, PhotoStrip } from '../components/PhotoStrip';
import { Swatch } from '../components/Swatch';
import { useToast } from '../components/Toast';
import { WebImageSearch } from '../components/WebImageSearch';
import type { PhotoDraft } from '../data/repository';
import { emptyItemFields, type AttributeValue, type Item, type ItemFields } from '../data/types';
import { buildQuery } from '../data/webImages';
import { errorMessage } from '../lib/format';
import { newId } from '../lib/id';
import { useData } from '../state/data';

function fieldsFrom(item: Item): ItemFields {
  const { id: _id, photo_path: _p, thumb_path: _t, photos: _ph, created_at: _c, updated_at: _u, ...fields } = item;
  return fields;
}

/** Distinct, sorted, non-empty values — used for typing suggestions. */
function distinct(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v?.trim())))].sort((a, b) => a.localeCompare(b));
}

export function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, loading } = useData();
  const existing = id ? items.find((i) => i.id === id) : undefined;

  if (id && !existing) {
    return (
      <div className="screen">
        <NavBar
          title={loading ? '' : 'Not found'}
          left={
            <button type="button" className="nav-button" onClick={() => navigate('/')}>
              Close
            </button>
          }
        />
      </div>
    );
  }
  // Keyed so the form starts fresh for each piece.
  return <ItemFormBody key={id ?? 'new'} existing={existing} />;
}

function ItemFormBody({ existing }: { existing?: Item }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, fields: customFields, lookups, saveItem } = useData();

  const [form, setForm] = useState<ItemFields>(() => (existing ? fieldsFrom(existing) : emptyItemFields()));
  const [priceText, setPriceText] = useState(existing?.price != null ? String(existing.price) : '');
  const [photos, setPhotos] = useState<PhotoDraft[]>(() =>
    (existing?.photos ?? []).map((photo) => ({ kind: 'stored', key: photo.path, photo })),
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () => ({
      types: distinct(items.map((i) => i.item_type)),
      brands: distinct(items.map((i) => i.brand)),
      sizes: distinct([...lookups('size').map((l) => l.value), ...items.map((i) => i.size)]),
    }),
    [items, lookups],
  );

  function update<K extends keyof ItemFields>(key: K, value: ItemFields[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function updateAttribute(key: string, value: AttributeValue) {
    setForm((f) => ({ ...f, attributes: { ...f.attributes, [key]: value } }));
    setDirty(true);
  }

  const text = (v: string) => (v.trim() === '' ? null : v);

  function cancel() {
    if (dirty && !window.confirm('Discard your changes?')) return;
    navigate(-1);
  }

  function fail(message: string) {
    setError(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setError(null);
    if (!form.category) return fail('Choose a category before saving.');
    const price = priceText.trim() === '' ? null : Number(priceText.replace(',', '.'));
    if (price !== null && (Number.isNaN(price) || price < 0)) return fail('Price must be a number, for example 49.90.');
    const badNumber = customFields.find((f) => f.field_type === 'number' && typeof form.attributes[f.key] === 'string');
    if (badNumber) return fail(`${badNumber.label} must be a number.`);

    setBusy(true);
    try {
      const saved = await saveItem({
        existing,
        fields: {
          ...form,
          name: form.name?.trim() || null,
          item_type: form.item_type?.trim() || null,
          size: form.size?.trim() || null,
          brand: form.brand?.trim() || null,
          notes: form.notes?.trim() || null,
          price,
        },
        photos,
      });
      toast(existing ? 'Changes saved' : 'Piece added');
      navigate(`/item/${saved.id}`, { replace: true, viewTransition: true });
    } catch (err) {
      fail(errorMessage(err));
      setBusy(false);
    }
  }

  const newCount = photos.filter((p) => p.kind === 'new').length;
  const colourOptions = lookups('colour');
  const rowFields = customFields.filter((f) => f.field_type !== 'multiselect');
  const chipFields = customFields.filter((f) => f.field_type === 'multiselect');
  const searchQuery = buildQuery({
    brand: form.brand,
    name: form.name,
    type: form.item_type,
    colour: form.colour,
    category: form.category,
  });

  return (
    <div className="screen screen-form">
      <NavBar
        title={existing ? 'Edit piece' : 'New piece'}
        left={
          <button type="button" className="nav-button" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        }
        right={
          <button type="button" className="nav-button nav-button-strong" onClick={submit} disabled={busy}>
            {busy ? (newCount ? 'Uploading…' : 'Saving…') : 'Save'}
          </button>
        }
      />

      <form
        className="page stack"
        style={{ paddingTop: 12, maxWidth: 720 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}

        <Group
          header="Photos"
          footer={photos.length > 1 ? 'The first photo is the cover. Tap a photo to reorder or remove it.' : `Add up to ${MAX_PHOTOS} photos.`}
        >
          <PhotoStrip
            photos={photos}
            onChange={(next) => {
              setPhotos(next);
              setDirty(true);
            }}
            onFindOnline={() => setSearchOpen(true)}
          />
        </Group>

        <Group header="Category" pad>
          <Chips
            label="Category"
            options={lookups('category').map((l) => ({ value: l.value }))}
            value={form.category ? [form.category] : []}
            onChange={(v) => update('category', v[0] ?? '')}
          />
        </Group>

        <Group header="Basics">
          <label className="row-input" htmlFor="name">
            <span className="row-label">Name</span>
            <input id="name" placeholder="Navy oxford shirt" value={form.name ?? ''} onChange={(e) => update('name', text(e.target.value))} />
          </label>
          <label className="row-input" htmlFor="type">
            <span className="row-label">Type</span>
            <input id="type" list="type-suggestions" placeholder="Shirt, jeans, loafers" value={form.item_type ?? ''} onChange={(e) => update('item_type', text(e.target.value))} />
          </label>
          <label className="row-input" htmlFor="brand">
            <span className="row-label">Brand</span>
            <input id="brand" list="brand-suggestions" placeholder="Optional" value={form.brand ?? ''} onChange={(e) => update('brand', text(e.target.value))} />
          </label>
          <label className="row-input" htmlFor="size">
            <span className="row-label">Size</span>
            <input id="size" list="size-suggestions" placeholder="M, 32, 42" value={form.size ?? ''} onChange={(e) => update('size', text(e.target.value))} />
          </label>
          <datalist id="type-suggestions">
            {suggestions.types.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <datalist id="brand-suggestions">
            {suggestions.brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <datalist id="size-suggestions">
            {suggestions.sizes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Group>

        <Group header="Colour">
          <div className="group-pad">
            <Chips
              label="Main colour"
              options={colourOptions.map((l) => ({
                value: l.value,
                label: (
                  <>
                    <Swatch hex={l.meta.hex ?? null} size={12} />
                    {l.value}
                  </>
                ),
              }))}
              value={form.colour ? [form.colour] : []}
              onChange={(v) => update('colour', v[0] ?? null)}
            />
          </div>
          <label className="row-input" htmlFor="secondary-colour" style={{ boxShadow: 'inset 0 0.5px 0 var(--separator)' }}>
            <span className="row-label">Second</span>
            <select id="secondary-colour" value={form.secondary_colour ?? ''} onChange={(e) => update('secondary_colour', e.target.value || null)}>
              <option value="">None</option>
              {colourOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.value}
                </option>
              ))}
            </select>
          </label>
        </Group>

        <Group header="Season" pad>
          <Chips multiple label="Season" options={lookups('season').map((l) => ({ value: l.value }))} value={form.seasons} onChange={(v) => update('seasons', v)} />
        </Group>

        <Group header="Occasion" pad>
          <Chips multiple label="Occasion" options={lookups('occasion').map((l) => ({ value: l.value }))} value={form.occasions} onChange={(v) => update('occasions', v)} />
        </Group>

        <Group header="Purchase">
          <label className="row-input" htmlFor="purchase-date">
            <span className="row-label">Bought</span>
            <input id="purchase-date" type="date" value={form.purchase_date ?? ''} onChange={(e) => update('purchase_date', e.target.value || null)} />
          </label>
          <label className="row-input" htmlFor="price">
            <span className="row-label">Price</span>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={priceText}
              onChange={(e) => {
                setPriceText(e.target.value);
                setDirty(true);
              }}
            />
          </label>
        </Group>

        <Group header="Condition" pad>
          <Chips label="Condition" options={lookups('condition').map((l) => ({ value: l.value }))} value={form.condition ? [form.condition] : []} onChange={(v) => update('condition', v[0] ?? null)} />
        </Group>

        {rowFields.length > 0 && (
          <Group header="More details">
            {rowFields.map((def) => (
              <CustomFieldRow key={def.id} def={def} value={form.attributes[def.key]} onChange={(v) => updateAttribute(def.key, v)} />
            ))}
          </Group>
        )}

        {chipFields.map((def) => (
          <Group key={def.id} header={def.label} pad>
            <CustomMultiselect def={def} value={form.attributes[def.key]} onChange={(v) => updateAttribute(def.key, v)} />
          </Group>
        ))}

        <Group header="Notes">
          <textarea
            className="textarea"
            rows={4}
            placeholder="Fit, care, what it goes well with"
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value === '' ? null : e.target.value)}
          />
        </Group>

        <button type="submit" className="button button-primary button-block" disabled={busy}>
          {busy ? (newCount ? 'Uploading photos…' : 'Saving…') : existing ? 'Save changes' : 'Add to wardrobe'}
        </button>
      </form>

      <WebImageSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={searchQuery}
        room={MAX_PHOTOS - photos.length}
        onAdd={(images) => {
          setPhotos((prev) => [
            ...prev,
            ...images.map((img) => ({ kind: 'new' as const, key: newId(), blob: img.blob, source: 'web' as const, source_url: img.sourceUrl })),
          ]);
          setDirty(true);
          toast(`${images.length} ${images.length === 1 ? 'photo' : 'photos'} added. Save to keep them.`);
        }}
      />
    </div>
  );
}
