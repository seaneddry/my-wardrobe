-- =============================================================================
-- My Wardrobe — migration 002: functions for the in-app Manage section
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Run it BEFORE deploying app version 1.1.0. Safe to re-run.
--
-- Each function runs as the signed-in user (security invoker), so the
-- row-level security from migration 001 still applies: it can only ever
-- touch your own lists, fields and pieces.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rename a list value and update every piece that uses it, all-or-nothing.
-- -----------------------------------------------------------------------------
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
    else
      null;
  end case;
end;
$$;

-- -----------------------------------------------------------------------------
-- Save a new order for one list. p_ids is the list's ids in the new order.
-- -----------------------------------------------------------------------------
create or replace function public.reorder_lookups(p_list text, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.lookups l
  set sort_order = x.ord - 1
  from unnest(p_ids) with ordinality as x (id, ord)
  where l.id = x.id and l.list = p_list and l.user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Save a new order for custom fields.
-- -----------------------------------------------------------------------------
create or replace function public.reorder_fields(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.field_definitions f
  set sort_order = x.ord - 1
  from unnest(p_ids) with ordinality as x (id, ord)
  where f.id = x.id and f.user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Delete a custom field and remove its values from every piece, all-or-nothing.
-- -----------------------------------------------------------------------------
create or replace function public.delete_field(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
begin
  select key into v_key from public.field_definitions where id = p_id and user_id = v_uid;
  if v_key is null then
    raise exception 'That field wasn''t found. Refresh and try again.';
  end if;
  update public.items set attributes = attributes - v_key
  where user_id = v_uid and attributes ? v_key;
  delete from public.field_definitions where id = p_id and user_id = v_uid;
end;
$$;

-- Only signed-in users may call these.
revoke execute on function public.rename_lookup(text, text, text) from public, anon;
revoke execute on function public.reorder_lookups(text, uuid[]) from public, anon;
revoke execute on function public.reorder_fields(uuid[]) from public, anon;
revoke execute on function public.delete_field(uuid) from public, anon;
grant execute on function public.rename_lookup(text, text, text) to authenticated;
grant execute on function public.reorder_lookups(text, uuid[]) to authenticated;
grant execute on function public.reorder_fields(uuid[]) to authenticated;
grant execute on function public.delete_field(uuid) to authenticated;

insert into public.schema_migrations (version) values ('002') on conflict (version) do nothing;
