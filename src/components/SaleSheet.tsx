import { useEffect, useState } from 'react';
import { itemTitle, type Item } from '../data/types';
import { errorMessage } from '../lib/format';
import { SALE_LABELS, isSaleStatus, parsePrice, today, type SaleStatus } from '../lib/sale';
import { useData } from '../state/data';
import { Photo } from './Photo';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

/**
 * Puts a piece up for sale, or edits its sale: asking price and On sale / Sold.
 * Used from a piece's page and from the For Sale screen ("From my wardrobe").
 */
export function SaleSheet({ item, open, onClose, onDone }: {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onDone?: (saved: Item) => void;
}) {
  const { updateSale } = useData();
  const toast = useToast();
  const listing = item ? !isSaleStatus(item.status) : true;
  const [priceText, setPriceText] = useState('');
  const [status, setStatus] = useState<SaleStatus>('for_sale');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setPriceText(item.sale_price != null ? String(item.sale_price) : '');
    setStatus(isSaleStatus(item.status) ? item.status : 'for_sale');
    setError(null);
    setBusy(false);
  }, [open, item]);

  if (!item) return null;
  const current = item;

  async function save() {
    const price = parsePrice(priceText);
    if (price === undefined) return setError('Price must be a number, for example 45 or 45.50.');
    setBusy(true);
    setError(null);
    try {
      const saved = await updateSale(current, {
        status,
        sale_price: price,
        listed_at: current.listed_at ?? today(),
        sold_at: status === 'sold' ? (current.sold_at ?? today()) : null,
      });
      toast(listing ? 'Listed for sale' : status === 'sold' && current.status !== 'sold' ? 'Marked as sold' : 'Sale updated');
      onDone?.(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={listing ? 'Sell this piece' : 'Sale details'}
      footer={
        <button type="button" className="button button-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : listing ? 'List for sale' : 'Save'}
        </button>
      }
    >
      <div className="sale-sheet-piece">
        <span className="piece-thumb">
          <Photo path={current.photos[0]?.thumb ?? current.thumb_path} alt="" />
        </span>
        <span>
          <span className="piece-title">{itemTitle(current)}</span>
          <span className="piece-sub">{[current.size && `Size ${current.size}`, current.condition].filter(Boolean).join(' · ') || current.category}</span>
        </span>
      </div>

      <label className="sale-price-field" htmlFor="sale-price">
        <span className="sale-price-currency">RM</span>
        <input
          id="sale-price"
          type="text"
          inputMode="decimal"
          placeholder="0"
          autoComplete="off"
          aria-label="Asking price in ringgit"
          value={priceText}
          onChange={(e) => setPriceText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </label>
      <p className="sale-hint">Asking price. Leave it empty if you haven't decided.</p>

      {!listing && (
        <div className="segmented" role="group" aria-label="Status">
          {(Object.keys(SALE_LABELS) as SaleStatus[]).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {SALE_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="notice notice-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}
    </Sheet>
  );
}
