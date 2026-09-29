# Changelog

All notable changes to My Wardrobe. Versions follow `MAJOR.MINOR.PATCH` (see `docs/MAINTAINING.md`).

## 1.3.0 — 2026-09-29

Outfits and an AI stylist.

- New **Outfits** tab: saved looks shown as photo collages, with favourites and occasion filters
- **Outfit builder** canvas: one swipeable row per slot (outerwear, top or dress, bottom, shoes, accessory); the centred pieces form the outfit
- **Shuffle** with per-row locks and an occasion filter; rows glide into place one after another
- Dresses and one-pieces fill both top and bottom
- Save an outfit with a name, occasion, mood and notes; edit, favourite or delete it later
- New **Stylist** tab: choose occasion, mood and weather, add notes, and get 3 outfits built only from your pieces, each with why it works and a tip; save one or open it in the builder
- The app checks every AI suggestion against your real pieces and slot rules before showing it
- Each category now has a place in outfits, editable in Manage; new **Moods** list
- Renaming an occasion or mood also updates saved outfits
- Five-tab bar: Wardrobe, Outfits, Add, Stylist, Settings
- Database migration 004 and Edge Function `stylist` (see `docs/UPGRADING.md`)

## 1.2.0 — 2026-09-29

New design, several photos per piece, and online photo search.

- Redesigned to look and feel like an iPhone app: system font, large titles that collapse into a frosted bar, frosted tab bar, inset grouped lists, bottom sheets you can drag down, action sheets, toasts, and light and dark modes
- The photo animates from the wardrobe grid into the piece's page (on browsers that support it)
- Up to 10 photos per piece, shown in a swipeable carousel with dots (arrows on desktop)
- In the form: add from camera, library (several at once) or online; tap a photo to make it the cover, move it or remove it
- **Find photos online**: searches Google Images (through SerpApi's free plan) using the brand, name and colour. Each result must be opened at full size and approved before it's added, and nothing is attached until the piece is saved
- Removed photos are deleted from storage when you save
- Monochrome app icon
- Database migration 003 and Edge Function `image-search` (see `docs/UPGRADING.md`)

## 1.1.0 — 2026-09-28

Manage section, so lists and custom fields no longer need the Supabase dashboard.

- New **Settings → Manage lists and fields**: two-panel layout on a computer, one screen at a time on a phone
- Lists: add, rename, reorder, remove; colour swatches with a colour picker and a multicolour option
- Renaming a value updates every piece that uses it, all-or-nothing
- Shows how many pieces use each value and each field before you change it
- Custom fields: add (text, number, date, pick one, pick several, yes or no), edit name and options, reorder, hide or show, delete
- Deleting a field also removes its values from every piece; hiding keeps them
- Database migration 002 (run before deploying; see `docs/UPGRADING.md`)

## 1.0.0 — 2026-09-28

First release.

- Sign in with email and password; sign-ups closed to everyone else
- Add pieces with a photo from the camera or library; photos are resized on the phone before upload
- Details: category, name, type, main and second colour, size, brand, seasons, occasions, date bought, price, condition, notes
- Custom fields defined in the database appear on the form automatically
- Wardrobe grid with search, category rail, and filters for colour, size, season and occasion; four sort orders
- Piece page with all details; archive, restore and delete
- Starter lists created on first sign-in, editable in Supabase
- JSON backup export from Settings
- Installable on iPhone and Android home screens; light and dark appearance
- Database migration 001
