import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '../config';
import { DEFAULT_LOOKUPS } from '../data/defaults';
import type { SaveItemInput, WardrobeRepository } from '../data/repository';
import { createSupabaseRepository } from '../data/supabaseRepository';
import { LOOKUP_LISTS, type FieldDefinition, type Item, type Lookup, type LookupList } from '../data/types';
import { errorMessage } from '../lib/format';
import { CACHE_KEYS, readJSON, writeJSON } from '../lib/storage';

interface CachedData {
  userId: string;
  items: Item[];
  lookups: Lookup[];
  fields: FieldDefinition[];
}

interface DataState {
  items: Item[];
  fields: FieldDefinition[];
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
  const [allLookups, setAllLookups] = useState<Lookup[]>(cached?.lookups ?? []);
  const [fields, setFields] = useState<FieldDefinition[]>(cached?.fields ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      let [nextItems, nextLookups, nextFields, version] = await Promise.all([
        repo.listItems(),
        repo.listLookups(),
        repo.listFieldDefinitions(),
        repo.schemaVersion(),
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
      setAllLookups(nextLookups);
      setFields(nextFields);
      setSchemaVersion(version);
      setError(null);
      writeJSON(CACHE_KEYS.data, { userId, items: nextItems, lookups: nextLookups, fields: nextFields } satisfies CachedData);
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
    (nextItems: Item[]) => {
      setItems(nextItems);
      writeJSON(CACHE_KEYS.data, { userId, items: nextItems, lookups: allLookups, fields } satisfies CachedData);
    },
    [userId, allLookups, fields],
  );

  const value: DataState = {
    items,
    fields,
    loading,
    error,
    schemaVersion,
    schemaBehind: schemaVersion !== null && schemaVersion < config.requiredSchema,
    lookups: (list) => allLookups.filter((l) => l.list === list),
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
