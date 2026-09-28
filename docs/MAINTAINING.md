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

## Everyday changes without code

Until the web CMS arrives (v1.1), use the Supabase **SQL Editor** for these. Replace `you@example.com` with your login email. SQL is used here because the tables need your user id, and these snippets look it up for you.

### Add a value to a list

Lists are `category`, `colour`, `size`, `season`, `occasion` and `condition`.

```sql
insert into public.lookups (user_id, list, value, sort_order)
select id, 'category', 'Swimwear', 20 from auth.users where email = 'you@example.com';

-- Colours can carry a swatch colour:
insert into public.lookups (user_id, list, value, sort_order, meta)
select id, 'colour', 'Teal', 20, '{"hex": "#2A7F7F"}' from auth.users where email = 'you@example.com';
```

### Rename a list value

Pieces store the value as text, so rename it in both places:

```sql
update public.lookups set value = 'Jackets' where list = 'category' and value = 'Outerwear';
update public.items   set category = 'Jackets' where category = 'Outerwear';
```

For colours, update `colour` and `secondary_colour` on items. For seasons and occasions (which are lists), use:

```sql
update public.items set seasons = array_replace(seasons, 'Autumn', 'Fall');
```

### Remove a list value

```sql
delete from public.lookups where list = 'size' and value = 'XXL';
```

Pieces that already use the value keep it. It just stops being offered as an option.

### Change the order of a list

Lower `sort_order` comes first:

```sql
update public.lookups set sort_order = 0 where list = 'category' and value = 'Shirts';
```

### Add a custom field to the item form

```sql
insert into public.field_definitions (user_id, key, label, field_type, options, sort_order)
select id, 'fabric', 'Fabric', 'select', array['Cotton', 'Linen', 'Wool', 'Denim', 'Silk'], 1
from auth.users where email = 'you@example.com';
```

- `key`: lowercase letters, numbers and underscores. Never change it once used, because values are stored under it.
- `field_type`: `text`, `number`, `date`, `select` (pick one), `multiselect` (pick several) or `boolean` (yes/no).
- `options`: only needed for `select` and `multiselect`.

To hide a field without losing its data:

```sql
update public.field_definitions set active = false where key = 'fabric';
```

Close and reopen the app to see list and field changes.

---

## Database changes (migrations)

When a feature needs a new table or column:

1. Add a new file in `supabase/migrations/`, numbered in order: `002_wear_log.sql`, `003_…`. **Never edit a migration that has already been run**; fix it with a new one instead.
2. Write it so it can safely run twice (`create table if not exists`, `add column if not exists`, `drop policy if exists` before `create policy`).
3. Enable row-level security and add an "own rows" policy on any new table. Copy the pattern from `001`.
4. End the file with: `insert into public.schema_migrations (version) values ('002') on conflict do nothing;`
5. In `src/config.ts`, set `requiredSchema` to the new number.
6. **Run the migration in the SQL Editor first, then push the app.** If the app goes out first, Settings shows a warning that the database is behind.

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
    defaults.ts             Starter lists added on first sign-in
  state/                    Login state and the shared data store
  pages/                    One file per screen
  components/               Reusable pieces (header, chips, photo, filter sheet)
  lib/                      Small helpers (filters, formatting, image resizing)
supabase/migrations/        Database scripts, run in order
docs/                       Setup, maintenance, backlog
```

The screens never call Supabase directly. They go through `repository.ts`. To change where data lives, such as adding offline sync later, write a new implementation of that interface and switch to it in `state/data.tsx`. The screens don't need to change.

---

## Free-tier limits to keep an eye on

| Limit | What it means for you |
|---|---|
| 500 MB database | Item details are tiny. Tens of thousands of pieces fit. |
| 1 GB photo storage | Roughly 3,000+ pieces at typical phone-photo sizes after compression. |
| 5 GB bandwidth a month | Photos are cached on your phone, so normal daily use stays well under this. |
| Pauses after 7 days idle | Using the app counts as activity. If it pauses, restore it from the Supabase dashboard; nothing is lost. |

Check usage any time under **Supabase → Project Settings → Usage**.

## Backups

- **Details:** Settings → **Export backup** saves a JSON file of every piece, list and custom field. Do this monthly, or before any big change.
- **Photos:** download the `wardrobe` bucket from Supabase Storage if you want a full copy.
