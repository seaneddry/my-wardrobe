import type { FieldDefinition, FieldType, Item, ItemFields, Lookup, LookupList, Outfit, OutfitFields, PhotoSource, StoredPhoto } from './types';

/**
 * Every read and write the app makes goes through this interface.
 * The UI never talks to Supabase directly, so the backend can be swapped
 * or extended (e.g. offline sync) by writing another implementation.
 */
export interface WardrobeRepository {
  listItems(): Promise<Item[]>;
  saveItem(input: SaveItemInput): Promise<Item>;
  deleteItem(item: Item): Promise<void>;
  setItemStatus(item: Item, status: Item['status']): Promise<Item>;

  listLookups(): Promise<Lookup[]>;
  seedLookups(rows: Array<{ list: LookupList; value: string; sort_order: number; meta: Record<string, unknown> }>): Promise<void>;

  addLookup(list: LookupList, value: string, sortOrder: number, meta?: Lookup['meta']): Promise<void>;
  /** Renames a value and updates every piece that uses it (all-or-nothing). */
  renameLookup(list: LookupList, oldValue: string, newValue: string): Promise<void>;
  updateLookupMeta(id: string, meta: Lookup['meta']): Promise<void>;
  deleteLookup(id: string): Promise<void>;
  reorderLookups(list: LookupList, orderedIds: string[]): Promise<void>;

  /** All custom fields, including hidden ones. */
  listFieldDefinitions(): Promise<FieldDefinition[]>;
  addField(input: NewField): Promise<void>;
  updateField(id: string, patch: Partial<Pick<FieldDefinition, 'label' | 'options' | 'active'>>): Promise<void>;
  /** Deletes the field and removes its values from every piece (all-or-nothing). */
  deleteField(id: string): Promise<void>;
  reorderFields(orderedIds: string[]): Promise<void>;

  /** Saved outfits. Returns an empty list if the outfits table doesn't exist yet. */
  listOutfits(): Promise<Outfit[]>;
  saveOutfit(fields: OutfitFields, id?: string): Promise<Outfit>;
  deleteOutfit(id: string): Promise<void>;

  schemaVersion(): Promise<string | null>;
}

export interface NewField {
  key: string;
  label: string;
  field_type: FieldType;
  options: string[];
  sort_order: number;
}

/** A photo in the item form: either already saved, or new and waiting to upload. */
export type PhotoDraft =
  | { kind: 'stored'; key: string; photo: StoredPhoto }
  | { kind: 'new'; key: string; blob: Blob; source: PhotoSource; source_url?: string | null };

export interface SaveItemInput {
  /** Existing item when editing; omit when adding. */
  existing?: Item;
  fields: ItemFields;
  /** All photos in their final order. The first is the cover. */
  photos: PhotoDraft[];
}
