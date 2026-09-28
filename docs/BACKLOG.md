# Backlog

Ordered by priority. Link each line to its GitHub Issue once created (e.g. `#12`).
Move finished items into `CHANGELOG.md`.

## Next: v1.1 — Web CMS (desktop)

- [ ] `/admin` section with a desktop layout, same login
- [ ] Table view of all pieces with inline editing of core fields
- [ ] Bulk photo upload: drop many photos, create one draft piece per photo
- [ ] Manage lists in the app: add, rename (updating pieces that use the old value), reorder, remove
- [ ] Manage custom fields in the app: add, edit label and options, hide
- [ ] CSV import and export alongside the existing JSON export

## v1.2 — Outfit builder

- [ ] Canvas with slots (outerwear, top, bottom, shoes, accessory); pick a piece per slot from a filtered strip
- [ ] Shuffle: random pick per slot, respecting current filters (season, occasion) and letting you lock slots
- [ ] Save outfits with a name and tags; list and open saved outfits
- [ ] Database: `outfits` and `outfit_items` tables (migration 002)

## v1.3 — Wear log and stats

- [ ] "Wore this today" on a piece and on a saved outfit
- [ ] Stats: most worn, least worn, not worn in 90+ days, cost per wear
- [ ] Database: `wear_log` table (migration 003)

## Later

- [ ] Background removal for photos, running on the device (no paid service)
- [ ] Weather-aware suggestions using a free weather API
- [ ] Packing lists for trips
- [ ] Offline editing with sync when back online
