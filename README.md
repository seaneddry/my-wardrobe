# My Wardrobe

A personal app for cataloguing clothes and deciding what to wear. Mobile-first, installable on iPhone and Android, running entirely on free tiers.

**Setting it up for the first time?** Follow [`docs/SETUP.md`](docs/SETUP.md).

## What it does (v1.3)

- A native-feeling iPhone app: large titles, frosted bars, sheets, light and dark mode
- Several photos per piece in a swipeable carousel, from the camera, your library, or **found online** (you approve each one)
- Details for each piece: category, type, colours, size, brand, seasons, occasions, date bought, price, condition, notes, plus any custom fields you define
- Browse, search, filter and sort your wardrobe
- Archive pieces you no longer wear without losing their record
- Build outfits on a swipeable canvas, shuffle with locks, and save looks with occasion and mood
- An AI stylist (Google Gemini) that suggests 3 outfits from your own pieces for an occasion, mood and weather
- Manage your lists (categories, colours, sizes and more) and custom fields from Settings, on a computer or phone
- Export a backup of all your data

See [`docs/BACKLOG.md`](docs/BACKLOG.md) for what's coming: wear log and stats.

**Upgrading from an earlier version?** Follow [`docs/UPGRADING.md`](docs/UPGRADING.md).

## How it fits together

```
 iPhone / Android                     GitHub                      Supabase (free tier)
┌──────────────────┐   loads app   ┌──────────────┐           ┌───────────────────────┐
│ Home-screen app  │ ◀──────────── │ GitHub Pages │           │ Postgres database     │
│ (PWA)            │               │ (static site)│           │ Photo storage         │
│                  │ ─────────── data, photos, login ───────▶ │ Auth (email/password) │
└──────────────────┘               └──────▲───────┘           └───────────────────────┘
                                          │ builds on every push to main
                                   ┌──────┴───────┐
                                   │ GitHub Actions│
                                   └──────────────┘
```

**Stack:** React, TypeScript, Vite, vite-plugin-pwa, React Router (data router with view transitions), Supabase (`@supabase/supabase-js`), two Supabase Edge Functions: `image-search` (SerpApi, online photo search) and `stylist` (Google Gemini, outfit suggestions).

**Security:** sign-ups are disabled, so only your account exists. Row-level security restricts every table and the photo bucket to the signed-in owner. The key embedded in the app is Supabase's publishable key, which is designed to be public.

## Running it on your computer

Needs Node.js 24.

```bash
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm install
npm run dev                  # opens a local dev server
npm run build                # type-check and production build
```

## Managing it

[`docs/MAINTAINING.md`](docs/MAINTAINING.md) covers the change process, editing lists and custom fields, database migrations, versioning, free-tier limits and backups.
