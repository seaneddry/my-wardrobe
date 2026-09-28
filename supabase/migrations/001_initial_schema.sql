-- =============================================================================
-- My Wardrobe — migration 001: initial schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement checks whether its object already exists.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema version tracking. Each migration adds its own row, and the app reads
-- the highest version to warn you if the database is behind the app.
-- -----------------------------------------------------------------------------
create table if not exists public.schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Lookup lists: categories, colours, sizes, seasons, occasions, conditions.
-- Editable without code changes. "meta" holds extras such as a colour's hex.
-- -----------------------------------------------------------------------------
create table if not exists public.lookups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list       text not null,
  value      text not null,
  sort_order integer not null default 0,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, list, value)
);

-- -----------------------------------------------------------------------------
-- Custom fields: add a row here and the field appears on the item form.
-- Values are stored in items.attributes under the field's "key".
-- -----------------------------------------------------------------------------
create table if not exists public.field_definitions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key        text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label      text not null,
  field_type text not null default 'text'
             check (field_type in ('text', 'number', 'date', 'select', 'multiselect', 'boolean')),
  options    text[] not null default '{}',
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- -----------------------------------------------------------------------------
-- Items: one row per piece of clothing.
-- -----------------------------------------------------------------------------
create table if not exists public.items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text,
  category         text not null,
  item_type        text,
  colour           text,
  secondary_colour text,
  size             text,
  brand            text,
  seasons          text[] not null default '{}',
  occasions        text[] not null default '{}',
  purchase_date    date,
  price            numeric(10, 2) check (price is null or price >= 0),
  condition        text,
  notes            text,
  photo_path       text,
  thumb_path       text,
  attributes       jsonb not null default '{}'::jsonb,
  status           text not null default 'active' check (status in ('active', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists items_user_category_idx on public.items (user_id, category);
create index if not exists lookups_user_list_idx on public.lookups (user_id, list);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security: a signed-in user can only see and change their own rows.
-- -----------------------------------------------------------------------------
alter table public.items             enable row level security;
alter table public.lookups           enable row level security;
alter table public.field_definitions enable row level security;
alter table public.schema_migrations enable row level security;

drop policy if exists "Own items" on public.items;
create policy "Own items" on public.items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Own lookups" on public.lookups;
create policy "Own lookups" on public.lookups
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Own field definitions" on public.field_definitions;
create policy "Own field definitions" on public.field_definitions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Read schema version" on public.schema_migrations;
create policy "Read schema version" on public.schema_migrations
  for select to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Photo storage: a private bucket. Files live under "<user id>/..." and each
-- user can only reach their own folder.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Wardrobe photos: read own" on storage.objects;
create policy "Wardrobe photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Wardrobe photos: upload own" on storage.objects;
create policy "Wardrobe photos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Wardrobe photos: update own" on storage.objects;
create policy "Wardrobe photos: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Wardrobe photos: delete own" on storage.objects;
create policy "Wardrobe photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

insert into public.schema_migrations (version) values ('001') on conflict (version) do nothing;
