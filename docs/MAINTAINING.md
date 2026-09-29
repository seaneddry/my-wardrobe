# Maintaining the app

This is how to run the app as a small product: capturing ideas, changing it safely, and keeping the database and app in step.

## The change process

```
Idea ─▶ GitHub Issue ─▶ BACKLOG.md priority ─▶ Build and test ─▶ Push to main ─▶ Auto-deploy ─▶ CHANGELOG.md
```

1. **Capture.** Open a GitHub Issue using the *Feature / change* or *Bug* template. The template asks what "done" looks like and whether a database change is needed.
2. **Prioritise.** Keep `docs/BACKLOG.md` as the ordered list of what's next. Link each line to its issue number.
3. **Build.** Use Claude Code on your local copy of the repo, or edit the code yourself. Point it at the issue and at this guide.
4. **Test locally (optional but recommended).** Install Node.js 24, copy `.env.example` to `.env.local` with your two Supabase values, then run `npm install` and `npm run dev`. Open the address it prints. Run `npm run build` before pushing to catch type errors.
5. **Release.** Bump `version` in `package.json`, add an entry to `CHANGELOG.md`, commit, and push to `main`. GitHub Actions deploys within a couple of minutes, and your phone picks it up on the next launch.

### Version numbers

Use `MAJOR.MINOR.PATCH`:

- **Patch** (1.0.**1**): fixes that change nothing visible about how the app works.
- **Minor** (1.**1**.0): new features. Existing data keeps working.
- **Major** (**2**.0.0): changes that need you to do something, such as reshaping existing data.

---

## Everyday changes: lists and custom fields

Use **Settings → Manage lists and fields** in the app. It works best on a computer, and fine on a phone.

- **Lists** (categories, colours, sizes, seasons, occasions, conditions): add, rename, reorder with the arrows, or remove. Colours also have a swatch colour.
  - **Renaming** updates every piece that uses the value, in one step.
  - **Removing** only takes the value off the list. Pieces that already use it keep it.
  - You can't remove the last category, since every piece needs one.
- **Custom fields**: add a field, choose its type (text, number, date, pick one, pick several, yes or no), edit its name and options, reorder, hide or delete.
  - **Hide** takes it off the item form but keeps the values on your pieces. Show it again at any time.
  - **Delete** removes the field and its values from every piece. It can't be undone.
  - A field's type can't be changed after it's created, so saved values stay valid. To change type, create a new field.

---

## Database changes (migrations)

When a feature needs a new table or column:

1. Add a new file in `supabase/migrations/`, numbered in order: `003_outfits.sql`, `004_…`. **Never edit a migration that has already been run**; fix it with a new one instead.
2. Write it so it can safely run twice (`create table if not exists`, `add column if not exists`, `drop policy if exists` before `create policy`).
3. Enable row-level security and add an "own rows" policy on any new table. Copy the pattern from `001`.
4. End the file with: `insert into public.schema_migrations (version) values ('003') on conflict do nothing;`
5. In `src/config.ts`, set `requiredSchema` to the new number.
6. **Run the migration in the SQL Editor first, then push the app.** If the app goes out first, Settings shows a warning that the database is behind.
7. Add a section to `docs/UPGRADING.md` describing the upgrade.

---

## How the code is organised

```
src/
  config.ts                 App settings: Supabase connection, required database version
  data/
    types.ts                The shape of an item, list value and custom field
    repository.ts           The interface every read/write goes through
    supabaseRepository.ts   The Supabase implementation of that interface
    photos.ts               Photo compression, upload and cached viewing links
    functions.ts            Calls this project's Edge Functions as the signed-in user
    webImages.ts            Online photo search (image-search function)
    stylist.ts              AI stylist (stylist function); checks answers against real pieces
    defaults.ts             Starter lists added on first sign-in
  state/                    Login state and the shared data store
  pages/                    One file per screen
    manage/                 The Manage section (lists and custom fields)
    outfits/                Outfits list, outfit page, and the builder canvas
  components/               Reusable pieces (nav bar, tab bar, sheets, carousel, photo strip, online search)
  lib/                      Small helpers (filters, outfits and shuffle, formatting, image resizing)
supabase/migrations/        Database scripts, run in order
supabase/functions/         Edge Functions, deployed from the Supabase dashboard
docs/                       Setup, upgrading, maintenance, backlog
```

The screens never call Supabase directly. They go through `repository.ts`. To change where data lives, such as adding offline sync later, write a new implementation of that interface and switch to it in `state/data.tsx`. The screens don't need to change.

---

## Updating an Edge Function

There are two: `image-search` and `stylist`. If a new version changes `supabase/functions/<name>/index.ts`, open https://supabase.com/dashboard/project/_/functions, click the function, open the **Code** tab, replace the code with the new file's contents, and click **Deploy**. Its secrets and settings stay as they are.

---

## Free-tier limits to keep an eye on

| Limit | What it means for you |
|---|---|
| 500 MB database | Item details are tiny. Tens of thousands of pieces fit. |
| 1 GB photo storage | Roughly 3,000+ pieces at typical phone-photo sizes after compression. |
| 5 GB bandwidth a month | Photos are cached on your phone, so normal daily use stays well under this. |
| SerpApi: 250 searches a month | Only the **Search** button uses one. Check usage at https://serpapi.com/dashboard. When it runs out, search stops until the next month; nothing is charged. |
| Gemini free tier | Per-minute and per-day request limits; one tap on **Suggest** is one request. Plenty for personal use. |
| Pauses after 7 days idle | Using the app counts as activity. If it pauses, restore it from the Supabase dashboard; nothing is lost. |

Check usage any time under **Supabase → Project Settings → Usage**.

## Backups

- **Details:** Settings → **Export backup** saves a JSON file of every piece, list and custom field. Do this monthly, or before any big change.
- **Photos:** download the `wardrobe` bucket from Supabase Storage if you want a full copy.
