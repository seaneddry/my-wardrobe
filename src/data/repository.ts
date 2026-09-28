import type { FieldDefinition, Item, ItemFields, Lookup, LookupList } from './types';

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

  listFieldDefinitions(): Promise<FieldDefinition[]>;
  schemaVersion(): Promise<string | null>;
}

export interface SaveItemInput {
  /** Existing item when editing; omit when adding. */
  existing?: Item;
  fields: ItemFields;
  /** New photo chosen by the user, if any. */
  photo?: File | null;
  /** True when the user removed the current photo without choosing a new one. */
  removePhoto?: boolean;
}
