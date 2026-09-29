-- =============================================================================
-- My Wardrobe — migration 003: several photos per piece
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Run it BEFORE deploying app version 1.2.0. Safe to re-run.
-- =============================================================================

-- Ordered list of photos for each piece. The first one is the cover.
-- Each entry: { "path": "...", "thumb": "...", "source": "camera|library|web", "source_url": "..." }
alter table public.items add column if not exists photos jsonb not null default '[]'::jsonb;

-- Move each existing single photo into the new list.
update public.items
set photos = jsonb_build_array(
  jsonb_build_object('path', photo_path, 'thumb', coalesce(thumb_path, photo_path))
)
where photo_path is not null and photos = '[]'::jsonb;

-- photo_path and thumb_path stay, holding the cover photo, so the wardrobe grid
-- and older backups keep working.

insert into public.schema_migrations (version) values ('003') on conflict (version) do nothing;
