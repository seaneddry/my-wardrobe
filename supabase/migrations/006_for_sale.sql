-- =============================================================================
-- My Wardrobe — migration 006: selling pieces (For Sale section)
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Run it BEFORE deploying app version 1.6.0. Safe to re-run.
--
-- A piece's status now has four values:
--   active    In your wardrobe
--   archived  Hidden from the wardrobe, kept on record (unchanged)
--   for_sale  Listed for sale. Still yours, so it shows in the wardrobe with a badge
--   sold      Sold. Shows in the wardrobe with a Sold badge
-- Only "active" pieces are used by the outfit builder, Shuffle and the AI stylist.
-- Existing pieces keep their current status; nothing is changed.
-- =============================================================================

-- Allow the two new statuses. The old check only allowed active/archived.
alter table public.items drop constraint if exists items_status_check;
alter table public.items
  add constraint items_status_check check (status in ('active', 'archived', 'for_sale', 'sold'));

-- Asking price, and when the piece was listed and sold. Purchase price stays in "price".
alter table public.items add column if not exists sale_price numeric(10, 2);
alter table public.items add column if not exists listed_at  date;
alter table public.items add column if not exists sold_at    date;

alter table public.items drop constraint if exists items_sale_price_check;
alter table public.items
  add constraint items_sale_price_check check (sale_price is null or sale_price >= 0);

create index if not exists items_user_status_idx on public.items (user_id, status);

insert into public.schema_migrations (version) values ('006') on conflict (version) do nothing;
