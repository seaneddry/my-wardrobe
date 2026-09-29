# Backlog

Ordered by priority. Link each line to its GitHub Issue once created (e.g. `#12`).
Move finished items into `CHANGELOG.md`.

## Done in v1.1

- [x] Manage section with a desktop layout, same login
- [x] Manage lists in the app: add, rename (updating pieces), reorder, remove
- [x] Manage custom fields in the app: add, edit label and options, reorder, hide, delete

## Done in v1.2

- [x] Native-app redesign
- [x] Several photos per piece with a carousel
- [x] Find photos online with approval before saving

## Next: v1.3 — Outfit builder

- [ ] Canvas with slots (outerwear, top, bottom, shoes, accessory); pick a piece per slot from a filtered strip
- [ ] Shuffle: random pick per slot, respecting current filters (season, occasion) and letting you lock slots
- [ ] Save outfits with a name and tags; list and open saved outfits
- [ ] Database: `outfits` and `outfit_items` tables (migration 004)

## v1.4 — Wear log and stats

- [ ] "Wore this today" on a piece and on a saved outfit
- [ ] Stats: most worn, least worn, not worn in 90+ days, cost per wear
- [ ] Database: `wear_log` table (migration 005)

## CMS extras (unscheduled)

- [ ] Table view of all pieces with inline editing of core fields
- [ ] Bulk photo upload: drop many photos, create one draft piece per photo
- [ ] CSV import and export alongside the existing JSON export
- [ ] Rename an option of a custom field and update pieces that use it

## Photo ideas (unscheduled)

- [ ] AI check of search results: a vision model (e.g. Gemini's free tier) ranks results by how well they match the piece's details, and flags likely mismatches
- [ ] Full-screen photo viewer with pinch to zoom
- [ ] Remove backgrounds from photos, on the device

## Later

- [ ] Weather-aware suggestions using a free weather API
- [ ] Packing lists for trips
- [ ] Offline editing with sync when back online
