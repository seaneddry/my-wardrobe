# Upgrading an installed app

Use this whenever you receive a new version of the code. Two rules:

1. **Database first, then app.** If a version includes a new file in `supabase/migrations/`, run it in Supabase *before* pushing the code.
2. **Run each migration once, in number order.** Never edit or re-order ones you've already run.

---

## 1.1.0 → 1.2.0 (new design, several photos per piece, online photo search)

This version adds `supabase/migrations/003_multiple_photos.sql` and a small server function for online search. Do the parts in order. Parts A–C take about 10 minutes; Part D (online search) about 15 minutes and is optional, since the rest of the app works without it.

### Part A — Update the database (1 minute)

1. Go to https://supabase.com/dashboard/project/_/sql/new
2. Open `supabase/migrations/003_multiple_photos.sql` from the new zip in TextEdit or Notepad, copy everything, paste it in, and click **Run**. You should see *Success. No rows returned*.

Your existing photos move into the new photo list automatically. Nothing is deleted.

### Part B — Update the code

Same as before:

1. Unzip the new `my-wardrobe.zip`.
2. In GitHub Desktop, click **Repository → Show in Finder / Show in Explorer** and turn on hidden files (**Cmd + Shift + .** or **View → Show → Hidden items**).
3. Copy everything from the new unzipped folder (the one containing `package.json`, `src`, `docs`) into your project folder and choose **Replace**.
4. **Also delete these two old files** from your project folder, since they no longer exist in the new version: `src/components/Header.tsx` and `src/components/PhotoPicker.tsx`. (If you skip this, the deploy fails with an error mentioning one of them.)
5. In GitHub Desktop, type `v1.2.0` in **Summary**, click **Commit to main**, then **Push origin**.

### Part C — Check it

1. Wait for the green tick at https://github.com/YOUR-USERNAME/my-wardrobe/actions
2. On your computer, hard-refresh with **Cmd+Shift+R** / **Ctrl+Shift+R**. **Settings → About** should show **1.2.0** and database **003**.
3. On your iPhone, close the app fully (swipe it away) and open it twice. The status bar is now light instead of dark blue. If it still looks old, delete the home-screen icon and add it again from Safari (you'll need to sign in once more).

### Part D — Set up online photo search

The search uses Google Images through **SerpApi**. Its free plan gives 250 searches a month, needs no credit card, and simply stops when the month's searches are used up, so it can never charge you. Checking and saving photos you've found doesn't use searches; only pressing **Search** does, and repeating a search in the same session reuses the earlier results.

**D1. Get a free SerpApi key**

1. Go to https://serpapi.com/users/sign_up and create an account. It may ask you to confirm your email and phone number.
2. Stay on the **Free** plan. Don't enter card details.
3. Open https://serpapi.com/manage-api-key and copy your **API key**.

**D2. Add the key to Supabase**

1. Go to https://supabase.com/dashboard/project/_/functions/secrets
2. Under **Add new secret**, enter:
   - **Name:** `SERPAPI_KEY`
   - **Value:** the key from D1
3. Click **Save**.

**D3. Create the search function**

1. Go to https://supabase.com/dashboard/project/_/functions
2. Click **Deploy a new function**, then **Via Editor**.
3. Name the function exactly `image-search`.
4. Delete the sample code in the editor. Open `supabase/functions/image-search/index.ts` from the zip, copy everything, and paste it in.
5. Click **Deploy function** and wait for it to finish.
6. Open the function's **Details** (or **Settings**) tab. Find **Verify JWT** (sometimes labelled **Enforce JWT verification**) and turn it **off**, then **Save**. The function checks that you're signed in by itself; leaving this on can block sign-ins made with the newer Supabase keys.

**D4. Try it**

1. In the app, open a piece, tap **Edit**, then **Find photos online**.
2. The search box is filled in from the brand, name and colour. Edit it if you like, then tap **Search**.
3. Tap a result to see it full size. If it's the right piece, tap **Use this photo**. Repeat for others, then tap **Add N photos**.
4. Tap **Save**. Photos are only attached to the piece once you save.

| If you see | What to do |
|---|---|
| "Online search isn't set up yet" | Check the function is named exactly `image-search` (D3) and the secret is named exactly `SERPAPI_KEY` (D2). |
| "Please sign in again" or "Invalid JWT" | Turn off **Verify JWT** on the function (D3 step 6). |
| "Your account has run out of searches" | The month's 250 free searches are used up. They reset on your SerpApi renewal date. |
| "This website doesn't allow its photo to be downloaded" | Some shops block downloads. Pick another result. |

A note on photos found online: they belong to the shops or photographers who took them. Using them privately to catalogue clothes you own is the intended use here; don't publish or share them.

---

## 1.0.0 → 1.1.0 (Manage section for lists and custom fields)

This version adds `supabase/migrations/002_manage_functions.sql`.

### Step 1 — Update the database (about 1 minute)

1. Go to https://supabase.com/dashboard/project/_/sql/new
2. Open `supabase/migrations/002_manage_functions.sql` from the new zip in TextEdit (Mac) or Notepad (Windows). Copy everything.
3. Paste it into the Supabase query box and click **Run**. You should see *Success. No rows returned*.

This adds four small database functions so renames and deletions update your pieces all-or-nothing. It doesn't change or remove any of your existing data.

### Step 2 — Update the code

1. Unzip the new `my-wardrobe.zip`.
2. In GitHub Desktop, click **Repository → Show in Finder** (Mac) or **Show in Explorer** (Windows) to open your existing project folder.
3. Show hidden files: **Cmd + Shift + .** in Finder, or **View → Show → Hidden items** in File Explorer.
4. Open the new unzipped folder (the one that directly contains `package.json`, `src`, `docs`), select everything, and copy it into your project folder.
5. When asked, choose **Replace** (Mac) or **Replace the files in the destination** (Windows).
6. Back in GitHub Desktop, the changed files appear under **Changes**. Type `v1.1.0` in the **Summary** box, click **Commit to main**, then **Push origin**.

### Step 3 — Check it

1. Wait for the green tick at https://github.com/YOUR-USERNAME/my-wardrobe/actions (about 2 minutes).
2. Open the app on your computer and press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows) to load the new version.
3. Go to **Settings**. **About** should show app version **1.1.0** and database version **002**.
4. Click **Manage lists and fields**.
5. On your iPhone, close the app fully (swipe it away) and open it again, twice, to pick up the new version.

If Manage shows a red message saying the database needs updating, Step 1 didn't complete. Run it again; it's safe to repeat.
