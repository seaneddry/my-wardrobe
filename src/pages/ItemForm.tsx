import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chips } from '../components/Chips';
import { CustomField } from '../components/CustomField';
import { Header } from '../components/Header';
import { PhotoPicker } from '../components/PhotoPicker';
import { Swatch } from '../components/Swatch';
import { emptyItemFields, type AttributeValue, type Item, type ItemFields } from '../data/types';
import { errorMessage } from '../lib/format';
import { useData } from '../state/data';

function fieldsFrom(item: Item): ItemFields {
  const { id: _id, photo_path: _p, thumb_path: _t, created_at: _c, updated_at: _u, ...fields } = item;
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
        <Header title={loading ? 'Loading…' : 'Piece not found'} />
        {!loading && (
          <div className="page">
            <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
              Back to wardrobe
            </button>
          </div>
        )}
      </div>
    );
  }
  // Keyed so the form starts fresh for each piece.
  return <ItemFormBody key={id ?? 'new'} existing={existing} />;
}

function ItemFormBody({ existing }: { existing?: Item }) {
  const navigate = useNavigate();
  const { items, fields: customFields, lookups, saveItem } = useData();

  const [form, setForm] = useState<ItemFields>(() => (existing ? fieldsFrom(existing) : emptyItemFields()));
  const [priceText, setPriceText] = useState(existing?.price != null ? String(existing.price) : '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.category) {
      setError('Choose a category before saving.');
      return;
    }
    const price = priceText.trim() === '' ? null : Number(priceText.replace(',', '.'));
    if (price !== null && (Number.isNaN(price) || price < 0)) {
      setError('Price must be a number, for example 49.90.');
      return;
    }
    const badNumber = customFields.find(
      (f) => f.field_type === 'number' && typeof form.attributes[f.key] === 'string',
    );
    if (badNumber) {
      setError(`${badNumber.label} must be a number.`);
      return;
    }

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
        photo,
        removePhoto: photoRemoved && !photo,
      });
      navigate(`/item/${saved.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const colourOptions = lookups('colour');

  return (
    <div className="screen screen-form">
      <Header
        title={existing ? 'Edit piece' : 'Add piece'}
        left={
          <button type="button" className="header-button" onClick={cancel}>
            Cancel
          </button>
        }
      />
      <form className="page stack" onSubmit={submit} noValidate>
        <PhotoPicker
          currentPath={existing?.photo_path ?? null}
          file={photo}
          removed={photoRemoved}
          onPick={(f) => {
            setPhoto(f);
            setPhotoRemoved(false);
            setDirty(true);
          }}
          onRemove={() => {
            setPhoto(null);
            setPhotoRemoved(true);
            setDirty(true);
          }}
        />

        <div className="field">
          <span className="field-label">
            Category <span className="required">required</span>
          </span>
          <Chips
            label="Category"
            options={lookups('category').map((l) => ({ value: l.value }))}
            value={form.category ? [form.category] : []}
            onChange={(v) => update('category', v[0] ?? '')}
          />
        </div>

        <label className="field" htmlFor="name">
          <span className="field-label">Name</span>
          <input
            id="name"
            className="input"
            placeholder="For example, navy oxford shirt"
            value={form.name ?? ''}
            onChange={(e) => update('name', text(e.target.value))}
          />
        </label>

        <label className="field" htmlFor="type">
          <span className="field-label">Type</span>
          <input
            id="type"
            className="input"
            list="type-suggestions"
            placeholder="For example, shirt, jeans, loafers"
            value={form.item_type ?? ''}
            onChange={(e) => update('item_type', text(e.target.value))}
          />
          <datalist id="type-suggestions">
            {suggestions.types.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <div className="field">
          <span className="field-label">Main colour</span>
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

        <label className="field" htmlFor="secondary-colour">
          <span className="field-label">Second colour</span>
          <select
            id="secondary-colour"
            className="input"
            value={form.secondary_colour ?? ''}
            onChange={(e) => update('secondary_colour', e.target.value || null)}
          >
            <option value="">None</option>
            {colourOptions.map((l) => (
              <option key={l.value} value={l.value}>
                {l.value}
              </option>
            ))}
          </select>
        </label>

        <div className="field-pair">
          <label className="field" htmlFor="size">
            <span className="field-label">Size</span>
            <input
              id="size"
              className="input"
              list="size-suggestions"
              value={form.size ?? ''}
              onChange={(e) => update('size', text(e.target.value))}
            />
            <datalist id="size-suggestions">
              {suggestions.sizes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="field" htmlFor="brand">
            <span className="field-label">Brand</span>
            <input
              id="brand"
              className="input"
              list="brand-suggestions"
              value={form.brand ?? ''}
              onChange={(e) => update('brand', text(e.target.value))}
            />
            <datalist id="brand-suggestions">
              {suggestions.brands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="field">
          <span className="field-label">Season</span>
          <Chips
            multiple
            label="Season"
            options={lookups('season').map((l) => ({ value: l.value }))}
            value={form.seasons}
            onChange={(v) => update('seasons', v)}
          />
        </div>

        <div className="field">
          <span className="field-label">Occasion</span>
          <Chips
            multiple
            label="Occasion"
            options={lookups('occasion').map((l) => ({ value: l.value }))}
            value={form.occasions}
            onChange={(v) => update('occasions', v)}
          />
        </div>

        <div className="field-pair">
          <label className="field" htmlFor="purchase-date">
            <span className="field-label">Date bought</span>
            <input
              id="purchase-date"
              className="input"
              type="date"
              value={form.purchase_date ?? ''}
              onChange={(e) => update('purchase_date', e.target.value || null)}
            />
          </label>
          <label className="field" htmlFor="price">
            <span className="field-label">Price</span>
            <input
              id="price"
              className="input"
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
        </div>

        <div className="field">
          <span className="field-label">Condition</span>
          <Chips
            label="Condition"
            options={lookups('condition').map((l) => ({ value: l.value }))}
            value={form.condition ? [form.condition] : []}
            onChange={(v) => update('condition', v[0] ?? null)}
          />
        </div>

        {customFields.map((def) => (
          <CustomField
            key={def.id}
            def={def}
            value={form.attributes[def.key]}
            onChange={(v) => updateAttribute(def.key, v)}
          />
        ))}

        <label className="field" htmlFor="notes">
          <span className="field-label">Notes</span>
          <textarea
            id="notes"
            className="input textarea"
            rows={3}
            placeholder="Fit, care instructions, what it goes well with"
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value === '' ? null : e.target.value)}
          />
        </label>

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-footer">
          <button type="submit" className="button button-primary button-block" disabled={busy}>
            {busy ? (photo ? 'Uploading photo…' : 'Saving…') : 'Save piece'}
          </button>
        </div>
      </form>
    </div>
  );
}
