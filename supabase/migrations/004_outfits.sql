-- =============================================================================
-- My Wardrobe — migration 004: outfits, moods, and the AI stylist
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Run it BEFORE deploying app version 1.3.0. Safe to re-run.
-- =============================================================================

-- Saved outfits. "pieces" is an ordered list of { "slot": "...", "item_id": "..." }.
create table if not exists public.outfits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  pieces     jsonb not null default '[]'::jsonb,
  occasion   text,
  mood       text,
  notes      text,
  source     text not null default 'manual' check (source in ('manual', 'shuffle', 'ai')),
  ai_reason  text,
  favourite  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outfits_user_idx on public.outfits (user_id, created_at desc);

drop trigger if exists outfits_set_updated_at on public.outfits;
create trigger outfits_set_updated_at
  before update on public.outfits
  for each row execute function public.set_updated_at();

alter table public.outfits enable row level security;

drop policy if exists "Own outfits" on public.outfits;
create policy "Own outfits" on public.outfits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Starter list of moods for the stylist, for every existing account.
insert into public.lookups (user_id, list, value, sort_order)
select u.id, 'mood', m.value, m.ord - 1
from auth.users u
cross join unnest(array['Relaxed', 'Confident', 'Polished', 'Cozy', 'Bold', 'Minimal', 'Playful', 'Low-key'])
  with ordinality as m (value, ord)
on conflict (user_id, list, value) do nothing;

-- Renaming an occasion or mood now also updates saved outfits.
create or replace function public.rename_lookup(p_list text, p_old text, p_new text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You need to be signed in.';
  end if;

  p_new := btrim(p_new);
  if p_new = '' then
    raise exception 'The name can''t be empty.';
  end if;
  if p_new = p_old then
    return;
  end if;
  if exists (select 1 from public.lookups where user_id = v_uid and list = p_list and value = p_new) then
    raise exception '"%" is already in this list.', p_new;
  end if;

  update public.lookups set value = p_new
  where user_id = v_uid and list = p_list and value = p_old;
  if not found then
    raise exception '"%" wasn''t found. Refresh and try again.', p_old;
  end if;

  case p_list
    when 'category' then
      update public.items set category = p_new where user_id = v_uid and category = p_old;
    when 'colour' then
      update public.items set colour = p_new where user_id = v_uid and colour = p_old;
      update public.items set secondary_colour = p_new where user_id = v_uid and secondary_colour = p_old;
    when 'size' then
      update public.items set size = p_new where user_id = v_uid and size = p_old;
    when 'condition' then
      update public.items set condition = p_new where user_id = v_uid and condition = p_old;
    when 'season' then
      update public.items set seasons = array_replace(seasons, p_old, p_new)
      where user_id = v_uid and p_old = any (seasons);
    when 'occasion' then
      update public.items set occasions = array_replace(occasions, p_old, p_new)
      where user_id = v_uid and p_old = any (occasions);
      update public.outfits set occasion = p_new where user_id = v_uid and occasion = p_old;
    when 'mood' then
      update public.outfits set mood = p_new where user_id = v_uid and mood = p_old;
    else
      null;
  end case;
end;
$$;

revoke execute on function public.rename_lookup(text, text, text) from public, anon;
grant execute on function public.rename_lookup(text, text, text) to authenticated;

insert into public.schema_migrations (version) values ('004') on conflict (version) do nothing;
