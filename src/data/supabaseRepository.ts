import { newId } from '../lib/id';
import { supabase } from '../lib/supabase';
import { removePhotos, uploadItemPhoto } from './photos';
import type { SaveItemInput, WardrobeRepository } from './repository';
import type { FieldDefinition, Item, Lookup } from './types';

function normaliseItem(row: Record<string, unknown>): Item {
  const item = row as unknown as Item;
  return {
    ...item,
    seasons: item.seasons ?? [],
    occasions: item.occasions ?? [],
    attributes: item.attributes ?? {},
    price: item.price === null || item.price === undefined ? null : Number(item.price),
  };
}

function fail(action: string, error: { message: string }): never {
  throw new Error(`${action}: ${error.message}`);
}

export function createSupabaseRepository(userId: string): WardrobeRepository {
  return {
    async listItems() {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (error) fail("Couldn't load your wardrobe", error);
      return (data ?? []).map(normaliseItem);
    },

    async saveItem({ existing, fields, photo, removePhoto }: SaveItemInput) {
      const id = existing?.id ?? newId();
      let paths = { photo_path: existing?.photo_path ?? null, thumb_path: existing?.thumb_path ?? null };
      const oldPaths = [existing?.photo_path, existing?.thumb_path];
      let replacedPhoto = false;

      if (photo) {
        paths = await uploadItemPhoto(userId, id, photo);
        replacedPhoto = true;
      } else if (removePhoto) {
        paths = { photo_path: null, thumb_path: null };
        replacedPhoto = true;
      }

      const record = { ...fields, ...paths };
      const query = existing
        ? supabase.from('items').update(record).eq('id', id).select().single()
        : supabase.from('items').insert({ ...record, id }).select().single();
      const { data, error } = await query;

      if (error) {
        if (photo) await removePhotos([paths.photo_path, paths.thumb_path]);
        fail("Couldn't save this piece", error);
      }
      if (replacedPhoto && existing) {
        // Best effort: an orphaned old photo is harmless if this fails.
        removePhotos(oldPaths).catch(() => undefined);
      }
      return normaliseItem(data);
    },

    async deleteItem(item) {
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) fail("Couldn't delete this piece", error);
      removePhotos([item.photo_path, item.thumb_path]).catch(() => undefined);
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

    async listFieldDefinitions() {
      const { data, error } = await supabase
        .from('field_definitions')
        .select('id, key, label, field_type, options, sort_order, active')
        .eq('active', true)
        .order('sort_order')
        .order('label');
      if (error) fail("Couldn't load your custom fields", error);
      return ((data ?? []) as FieldDefinition[]).map((f) => ({ ...f, options: f.options ?? [] }));
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
