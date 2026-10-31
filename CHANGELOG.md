# Changelog

All notable changes to My Wardrobe. Versions follow `MAJOR.MINOR.PATCH` (see `docs/MAINTAINING.md`).

## 1.6.0 — 2026-10-31

Sell pieces you no longer want, and a new Liquid Glass look.

- **For Sale** tab: pieces On sale and Sold, each with an asking price, listed date and sold date
- **Add** (or the round + button while on For Sale) adds a piece straight to For Sale, with photos, online photo search and fill-in-from-photo as usual
- **Sell something from my wardrobe** picks a piece you already have; **Sell this piece** on any piece's page does the same
- On a piece's page: **Mark as sold**, **Put back on sale**, **Take off sale**, and **Edit** for the price
- On-sale and sold pieces stay in the wardrobe with an **On sale** / **Sold** badge, but are never used by the outfit builder, Shuffle or the AI stylist. Filter: **Show → On sale and sold**
- Sale statuses (On sale, Sold) are fixed, not a Manage list, because the app relies on what they mean
- **Liquid Glass "Smoke monochrome"** theme, the same as Garage: soft glow background, frosted glass panels, floating capsule tab bar with a round + button, rounder buttons. Lives in `src/glass.css`; remove its import in `src/main.tsx` to go back
- Database migration 006 (two new statuses, `sale_price`, `listed_at`, `sold_at`). Existing pieces are unchanged

## 1.5.0 — 2026-10-12

Search by photo and fill in details from a photo.

- **Find similar:** search online with a photo of your piece (Google Lens through SerpApi). Results favour shops in Malaysia and show prices when Google has them. Approve photos as before; nothing is attached until you save
- New photos are sent through a temporary file in your own storage folder that is deleted straight after the search; saved photos use a 5-minute private link
- **Fill in details:** Gemini reads a photo and fills in category, type, name, main and second colour, occasions, and the brand only when it's clearly readable. Answers are limited to your own lists
- Runs automatically for the first photo you take or pick for a new piece; only empty fields are filled, never anything you've typed
- Both actions are under the photo strip and in each photo's menu
- `image-search` function v1.5.0 (new `lens` action); `stylist` function v1.5.0 (new `describe` action, shared Gemini handling). No database change

## 1.4.0 — 2026-09-30

Hats in outfits, a bigger builder, and no seasons.

- **Headwear** row in the outfit builder (hats, caps); new **Hats** category; categories named cap, beanie, beret and similar go there automatically
- The stylist can add headwear, always includes shoes when you have them, and knows it's dressing someone in Malaysia (heat, humidity, rain, air-conditioning)
- Weather options: Hot and sunny, Humid, Rainy, Cool (air-con)
- Builder redesign: much larger photos, ‹ › buttons on every row, **See all** (or tap the centred piece) for a grid of options, a sticky strip showing the whole outfit (tap to jump to a row), and every row always visible with an "Add one" hint when empty
- Fixed: opening the builder before the wardrobe finished loading left Save disabled
- Outfit collages show up to 6 pieces
- **Seasons removed** from the form, piece page, filters, Manage and the stylist. Stored season data is kept but unused
- The stylist's instructions now live in the app, so they can change without redeploying the function
- Database migration 005; `stylist` function v1.4.0

## 1.3.3 — 2026-09-30

Stylist function only (redeploy `supabase/functions/stylist/index.ts`).

- Tries Flash-Lite first (largest free allowance), then Flash
- When one model is out of free requests or not in the free tier, moves on to the next instead of stopping
- One attempt per model, to avoid using up the daily allowance
- Error messages say which models were tried and why each failed, and when limits reset

## 1.3.2 — 2026-09-29

Stylist function only (redeploy `supabase/functions/stylist/index.ts`; no app or database change).

- Finds the Gemini models your key can use automatically, instead of relying on fixed model names
- Alternates between Flash and Flash-Lite models, and retries once when Google reports high demand
- Clear "Google's AI is busy" message instead of a technical error

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
