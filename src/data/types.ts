export const LOOKUP_LISTS = ['category', 'colour', 'size', 'season', 'occasion', 'condition', 'mood'] as const;
export type LookupList = (typeof LOOKUP_LISTS)[number];

export interface Lookup {
  id: string;
  list: LookupList;
  value: string;
  sort_order: number;
  meta: { hex?: string; slot?: SlotKey } & Record<string, unknown>;
}

/** Where a category's pieces go in an outfit. "full" covers top and bottom (dresses, jumpsuits). */
export type SlotKey = 'outer' | 'top' | 'bottom' | 'full' | 'shoes' | 'accessory' | 'none';

export interface OutfitPiece {
  slot: SlotKey;
  item_id: string;
}

export interface Outfit {
  id: string;
  name: string;
  pieces: OutfitPiece[];
  occasion: string | null;
  mood: string | null;
  notes: string | null;
  source: 'manual' | 'shuffle' | 'ai';
  ai_reason: string | null;
  favourite: boolean;
  created_at: string;
  updated_at: string;
}

export type OutfitFields = Omit<Outfit, 'id' | 'created_at' | 'updated_at'>;

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  field_type: FieldType;
  options: string[];
  sort_order: number;
  active: boolean;
}

export type AttributeValue = string | number | boolean | string[] | null;

export type ItemStatus = 'active' | 'archived';

export type PhotoSource = 'camera' | 'library' | 'web';

/** A photo saved in storage. The first photo of a piece is its cover. */
export interface StoredPhoto {
  path: string;
  thumb: string;
  source?: PhotoSource;
  source_url?: string | null;
}

export interface Item {
  id: string;
  name: string | null;
  category: string;
  item_type: string | null;
  colour: string | null;
  secondary_colour: string | null;
  size: string | null;
  brand: string | null;
  seasons: string[];
  occasions: string[];
  purchase_date: string | null;
  price: number | null;
  condition: string | null;
  notes: string | null;
  /** Cover photo (first of `photos`), kept for the grid and older backups. */
  photo_path: string | null;
  thumb_path: string | null;
  photos: StoredPhoto[];
  attributes: Record<string, AttributeValue>;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

/** The editable part of an item (everything except ids, photos and timestamps). */
export type ItemFields = Omit<Item, 'id' | 'photo_path' | 'thumb_path' | 'photos' | 'created_at' | 'updated_at'>;

export function emptyItemFields(): ItemFields {
  return {
    name: null,
    category: '',
    item_type: null,
    colour: null,
    secondary_colour: null,
    size: null,
    brand: null,
    seasons: [],
    occasions: [],
    purchase_date: null,
    price: null,
    condition: null,
    notes: null,
    attributes: {},
    status: 'active',
  };
}

/** Display title: the name if set, otherwise built from colour and type/category. */
export function itemTitle(item: Pick<Item, 'name' | 'colour' | 'item_type' | 'category'>): string {
  if (item.name?.trim()) return item.name.trim();
  const noun = item.item_type?.trim() || item.category;
  return [item.colour, noun].filter(Boolean).join(' ') || 'Untitled piece';
}
