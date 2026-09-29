import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '../config';
import { DEFAULT_LOOKUPS } from '../data/defaults';
import type { NewField, SaveItemInput, WardrobeRepository } from '../data/repository';
import { createSupabaseRepository } from '../data/supabaseRepository';
import { LOOKUP_LISTS, type FieldDefinition, type Item, type Lookup, type LookupList, type Outfit, type OutfitFields } from '../data/types';
import { errorMessage } from '../lib/format';
import { CACHE_KEYS, readJSON, writeJSON } from '../lib/storage';

interface CachedData {
  userId: string;
  items: Item[];
  outfits?: Outfit[];
  lookups: Lookup[];
  fields: FieldDefinition[];
}

/** Actions used by the Manage section. Each one refreshes the data afterwards. */
export interface ManageActions {
  addLookup(list: LookupList, value: string, meta?: Lookup['meta']): Promise<void>;
  renameLookup(list: LookupList, oldValue: string, newValue: string): Promise<void>;
  updateLookupMeta(id: string, meta: Lookup['meta']): Promise<void>;
  deleteLookup(id: string): Promise<void>;
  reorderLookups(list: LookupList, orderedIds: string[]): Promise<void>;
  addField(input: Omit<NewField, 'sort_order'>): Promise<void>;
  updateField(id: string, patch: Partial<Pick<FieldDefinition, 'label' | 'options' | 'active'>>): Promise<void>;
  deleteField(id: string): Promise<void>;
  reorderFields(orderedIds: string[]): Promise<void>;
}

interface DataState {
  items: Item[];
  /** Custom fields shown on the item form (hidden ones excluded). */
  fields: FieldDefinition[];
  /** Every custom field, including hidden ones. */
  allFields: FieldDefinition[];
  outfits: Outfit[];
  saveOutfit(fields: OutfitFields, id?: string): Promise<Outfit>;
  deleteOutfit(id: string): Promise<void>;
  manage: ManageActions;
  loading: boolean;
  error: string | null;
  schemaVersion: string | null;
  schemaBehind: boolean;
  lookups(list: LookupList): Lookup[];
  colourHex(value: string | null): string | null;
  refresh(): Promise<void>;
  saveItem(input: SaveItemInput): Promise<Item>;
  deleteItem(item: Item): Promise<void>;
  setItemStatus(item: Item, status: Item['status']): Promise<Item>;
  clearError(): void;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const repo: WardrobeRepository = useMemo(() => createSupabaseRepository(userId), [userId]);

  // Show the last known data instantly, then refresh from the server.
  const cached = useMemo(() => {
    const c = readJSON<CachedData>(CACHE_KEYS.data);
    return c && c.userId === userId ? c : null;
  }, [userId]);

  const [items, setItems] = useState<Item[]>(cached?.items ?? []);
  const [outfits, setOutfits] = useState<Outfit[]>(cached?.outfits ?? []);
  const [allLookups, setAllLookups] = useState<Lookup[]>(cached?.lookups ?? []);
  const [fields, setFields] = useState<FieldDefinition[]>(cached?.fields ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      let [nextItems, nextLookups, nextFields, version, nextOutfits] = await Promise.all([
        repo.listItems(),
        repo.listLookups(),
        repo.listFieldDefinitions(),
        repo.schemaVersion(),
        repo.listOutfits(),
      ]);
      if (nextLookups.length === 0) {
        const rows = LOOKUP_LISTS.flatMap((list) =>
          DEFAULT_LOOKUPS[list].map((entry, i) =>
            typeof entry === 'string'
              ? { list, value: entry, sort_order: i, meta: {} }
              : { list, value: entry.value, sort_order: i, meta: { hex: entry.hex } },
          ),
        );
        await repo.seedLookups(rows);
        nextLookups = await repo.listLookups();
      }
      setItems(nextItems);
      setOutfits(nextOutfits);
      setAllLookups(nextLookups);
      setFields(nextFields);
      setSchemaVersion(version);
      setError(null);
      writeJSON(CACHE_KEYS.data, { userId, items: nextItems, outfits: nextOutfits, lookups: nextLookups, fields: nextFields } satisfies CachedData);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [repo, userId]);

  useEffect(() => {
    refresh();
    // Refresh when the app comes back to the foreground (e.g. after editing in the dashboard).
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const persist = useCallback(
    (nextItems: Item[], nextOutfits: Outfit[] = outfits) => {
      setItems(nextItems);
      setOutfits(nextOutfits);
      writeJSON(CACHE_KEYS.data, { userId, items: nextItems, outfits: nextOutfits, lookups: allLookups, fields } satisfies CachedData);
    },
    [userId, allLookups, fields, outfits],
  );

  const manage: ManageActions = {
    async addLookup(list, value, meta = {}) {
      const current = allLookups.filter((l) => l.list === list);
      const next = current.reduce((max, l) => Math.max(max, l.sort_order), -1) + 1;
      await repo.addLookup(list, value, next, meta);
      await refresh();
    },
    async renameLookup(list, oldValue, newValue) {
      await repo.renameLookup(list, oldValue, newValue);
      await refresh();
    },
    async updateLookupMeta(id, meta) {
      await repo.updateLookupMeta(id, meta);
      await refresh();
    },
    async deleteLookup(id) {
      await repo.deleteLookup(id);
      await refresh();
    },
    async reorderLookups(list, orderedIds) {
      // Show the new order immediately, then confirm with the server.
      setAllLookups((prev) =>
        prev.map((l) => (l.list === list && orderedIds.includes(l.id) ? { ...l, sort_order: orderedIds.indexOf(l.id) } : l)),
      );
      await repo.reorderLookups(list, orderedIds);
      await refresh();
    },
    async addField(input) {
      const next = fields.reduce((max, f) => Math.max(max, f.sort_order), -1) + 1;
      await repo.addField({ ...input, sort_order: next });
      await refresh();
    },
    async updateField(id, patch) {
      await repo.updateField(id, patch);
      await refresh();
    },
    async deleteField(id) {
      await repo.deleteField(id);
      await refresh();
    },
    async reorderFields(orderedIds) {
      setFields((prev) => prev.map((f) => (orderedIds.includes(f.id) ? { ...f, sort_order: orderedIds.indexOf(f.id) } : f)));
      await repo.reorderFields(orderedIds);
      await refresh();
    },
  };

  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  const sortedLookups = [...allLookups].sort((a, b) => a.sort_order - b.sort_order || a.value.localeCompare(b.value));

  const value: DataState = {
    items,
    fields: sortedFields.filter((f) => f.active),
    allFields: sortedFields,
    outfits,
    async saveOutfit(fields, id) {
      const saved = await repo.saveOutfit(fields, id);
      const exists = outfits.some((o) => o.id === saved.id);
      persist(items, exists ? outfits.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...outfits]);
      return saved;
    },
    async deleteOutfit(id) {
      await repo.deleteOutfit(id);
      persist(items, outfits.filter((o) => o.id !== id));
    },
    manage,
    loading,
    error,
    schemaVersion,
    schemaBehind: schemaVersion !== null && schemaVersion < config.requiredSchema,
    lookups: (list) => sortedLookups.filter((l) => l.list === list),
    colourHex: (v) => (v ? (allLookups.find((l) => l.list === 'colour' && l.value === v)?.meta.hex ?? null) : null),
    refresh,
    async saveItem(input) {
      const saved = await repo.saveItem(input);
      const exists = items.some((i) => i.id === saved.id);
      persist(exists ? items.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...items]);
      return saved;
    },
    async deleteItem(item) {
      await repo.deleteItem(item);
      persist(items.filter((i) => i.id !== item.id));
    },
    async setItemStatus(item, status) {
      const saved = await repo.setItemStatus(item, status);
      persist(items.map((i) => (i.id === saved.id ? saved : i)));
      return saved;
    },
    clearError: () => setError(null),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
