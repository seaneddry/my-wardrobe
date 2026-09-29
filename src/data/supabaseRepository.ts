import { newId } from '../lib/id';
import { supabase } from '../lib/supabase';
import { removePhotos, uploadItemPhoto } from './photos';
import type { SaveItemInput, WardrobeRepository } from './repository';
import type { FieldDefinition, Item, Lookup, Outfit, StoredPhoto } from './types';

function normaliseItem(row: Record<string, unknown>): Item {
  const item = row as unknown as Item;
  let photos: StoredPhoto[] = Array.isArray(item.photos) ? item.photos.filter((p) => p?.path) : [];
  // Pieces saved before migration 003 only have the single cover photo.
  if (photos.length === 0 && item.photo_path) photos = [{ path: item.photo_path, thumb: item.thumb_path ?? item.photo_path }];
  return {
    ...item,
    photos,
    seasons: item.seasons ?? [],
    occasions: item.occasions ?? [],
    attributes: item.attributes ?? {},
    price: item.price === null || item.price === undefined ? null : Number(item.price),
  };
}

function fail(action: string, error: { message: string; code?: string }): never {
  if (error.code === '23505') throw new Error(`${action}: that name is already in use.`);
  if (error.code === 'PGRST202' || error.code === 'PGRST204' || /could not find the (function|'photos' column)/i.test(error.message)) {
    throw new Error(`${action}: the database needs updating. Run the latest migration (see docs/UPGRADING.md).`);
  }
  throw new Error(`${action}: ${error.message}`);
}

export function createSupabaseRepository(userId: string): WardrobeRepository {
  return {
    async listItems() {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (error) fail("Couldn't load your wardrobe", error);
      return (data ?? []).map(normaliseItem);
    },

    async saveItem({ existing, fields, photos }: SaveItemInput) {
      const id = existing?.id ?? newId();

      // Upload new photos (a few at a time), keeping the chosen order.
      const uploaded: StoredPhoto[] = [];
      const final: StoredPhoto[] = [];
      try {
        for (const draft of photos) {
          if (draft.kind === 'stored') {
            final.push(draft.photo);
          } else {
            const { photo_path, thumb_path } = await uploadItemPhoto(userId, id, draft.blob);
            const stored: StoredPhoto = { path: photo_path, thumb: thumb_path, source: draft.source, source_url: draft.source_url ?? null };
            uploaded.push(stored);
            final.push(stored);
          }
        }
      } catch (err) {
        await removePhotos(uploaded.flatMap((p) => [p.path, p.thumb]));
        throw err;
      }

      const record = {
        ...fields,
        photos: final,
        photo_path: final[0]?.path ?? null,
        thumb_path: final[0]?.thumb ?? null,
      };
      const query = existing
        ? supabase.from('items').update(record).eq('id', id).select().single()
        : supabase.from('items').insert({ ...record, id }).select().single();
      const { data, error } = await query;

      if (error) {
        await removePhotos(uploaded.flatMap((p) => [p.path, p.thumb]));
        fail("Couldn't save this piece", error);
      }

      // Delete stored photos that were removed in the form (best effort).
      if (existing) {
        const kept = new Set(final.map((p) => p.path));
        const removed = normaliseItem(existing as unknown as Record<string, unknown>).photos.filter((p) => !kept.has(p.path));
        if (removed.length) removePhotos(removed.flatMap((p) => [p.path, p.thumb])).catch(() => undefined);
      }
      return normaliseItem(data);
    },

    async deleteItem(item) {
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) fail("Couldn't delete this piece", error);
      const paths = [item.photo_path, item.thumb_path, ...item.photos.flatMap((p) => [p.path, p.thumb])];
      removePhotos([...new Set(paths)]).catch(() => undefined);
    },

    async setItemStatus(item, status) {
      const { data, error } = await supabase.from('items').update({ status }).eq('id', item.id).select().single();
      if (error) fail("Couldn't update this piece", error);
      return normaliseItem(data);
    },

    async listLookups() {
      const { data, error } = await supabase
        .from('lookups')
        .select('id, list, value, sort_order, meta')
        .order('sort_order')
        .order('value');
      if (error) fail("Couldn't load your lists", error);
      return (data ?? []) as Lookup[];
    },

    async seedLookups(rows) {
      const { error } = await supabase
        .from('lookups')
        .upsert(rows, { onConflict: 'user_id,list,value', ignoreDuplicates: true });
      if (error) fail("Couldn't create the starter lists", error);
    },

    async addLookup(list, value, sortOrder, meta = {}) {
      const { error } = await supabase.from('lookups').insert({ list, value: value.trim(), sort_order: sortOrder, meta });
      if (error) fail(`Couldn't add "${value.trim()}"`, error);
    },

    async renameLookup(list, oldValue, newValue) {
      const { error } = await supabase.rpc('rename_lookup', { p_list: list, p_old: oldValue, p_new: newValue });
      if (error) fail(`Couldn't rename "${oldValue}"`, error);
    },

    async updateLookupMeta(id, meta) {
      const { error } = await supabase.from('lookups').update({ meta }).eq('id', id);
      if (error) fail("Couldn't save the colour", error);
    },

    async deleteLookup(id) {
      const { error } = await supabase.from('lookups').delete().eq('id', id);
      if (error) fail("Couldn't remove it", error);
    },

    async reorderLookups(list, orderedIds) {
      const { error } = await supabase.rpc('reorder_lookups', { p_list: list, p_ids: orderedIds });
      if (error) fail("Couldn't save the new order", error);
    },

    async addField(input) {
      const { error } = await supabase.from('field_definitions').insert(input);
      if (error) fail(`Couldn't add "${input.label}"`, error);
    },

    async updateField(id, patch) {
      const { error } = await supabase.from('field_definitions').update(patch).eq('id', id);
      if (error) fail("Couldn't save the field", error);
    },

    async deleteField(id) {
      const { error } = await supabase.rpc('delete_field', { p_id: id });
      if (error) fail("Couldn't delete the field", error);
    },

    async reorderFields(orderedIds) {
      const { error } = await supabase.rpc('reorder_fields', { p_ids: orderedIds });
      if (error) fail("Couldn't save the new order", error);
    },

    async listFieldDefinitions() {
      const { data, error } = await supabase
        .from('field_definitions')
        .select('id, key, label, field_type, options, sort_order, active')
        .order('sort_order')
        .order('label');
      if (error) fail("Couldn't load your custom fields", error);
      return ((data ?? []) as FieldDefinition[]).map((f) => ({ ...f, options: f.options ?? [] }));
    },

    async listOutfits() {
      const { data, error } = await supabase.from('outfits').select('*').order('created_at', { ascending: false });
      if (error) {
        // Table not created yet (migration 004 not run): treat as no outfits.
        if (error.code === 'PGRST205' || error.code === '42P01' || /could not find the table/i.test(error.message)) return [];
        fail("Couldn't load your outfits", error);
      }
      return ((data ?? []) as Outfit[]).map((o) => ({ ...o, pieces: Array.isArray(o.pieces) ? o.pieces : [] }));
    },

    async saveOutfit(fields, id) {
      const query = id
        ? supabase.from('outfits').update(fields).eq('id', id).select().single()
        : supabase.from('outfits').insert(fields).select().single();
      const { data, error } = await query;
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          throw new Error("Couldn't save the outfit: the database needs updating. Run migration 004 (see docs/UPGRADING.md).");
        }
        fail("Couldn't save the outfit", error);
      }
      return data as Outfit;
    },

    async deleteOutfit(id) {
      const { error } = await supabase.from('outfits').delete().eq('id', id);
      if (error) fail("Couldn't delete the outfit", error);
    },

    async schemaVersion() {
      const { data, error } = await supabase
        .from('schema_migrations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1);
      if (error) return null;
      return data?.[0]?.version ?? null;
    },
  };
}
