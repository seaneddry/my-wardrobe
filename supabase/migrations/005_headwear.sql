-- =============================================================================
-- My Wardrobe — migration 005: headwear in outfits
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
-- Adds a "Hats" category (placed in the Headwear row of outfits) for every account
-- that doesn't already have a headwear category.
-- =============================================================================

insert into public.lookups (user_id, list, value, sort_order, meta)
select
  u.id,
  'category',
  'Hats',
  coalesce((select max(l.sort_order) + 1 from public.lookups l where l.user_id = u.id and l.list = 'category'), 0),
  '{"slot": "head"}'::jsonb
from auth.users u
where not exists (
  select 1
  from public.lookups l
  where l.user_id = u.id
    and l.list = 'category'
    and (l.meta ->> 'slot' = 'head' or l.value ~* '\m(hats?|caps?|beanies?|berets?|headwear)\M')
)
on conflict (user_id, list, value) do nothing;

insert into public.schema_migrations (version) values ('005') on conflict (version) do nothing;
