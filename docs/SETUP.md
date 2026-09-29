# Setup guide

This takes about 45 minutes, once. You need a computer, your phone, and two free accounts: **Supabase** (database, photos, login) and **GitHub** (code and hosting). No credit card is needed for either.

Everything happens in the browser, except one small free app (GitHub Desktop) used to upload the code.

---

## Part A — Supabase (database and login)

### 1. Create the project

1. Go to **supabase.com** and select **Start your project**. Signing up with your GitHub account is quickest, so you may want to do step 5 first.
2. Select **New project** and fill in:
   - **Name:** `my-wardrobe`
   - **Database password:** select *Generate a password* and save it in your password manager. The app doesn't use it, but you'll want it if you ever need direct database access.
   - **Region:** the one closest to you (from Malaysia, choose **Southeast Asia (Singapore)**).
3. Select **Create new project** and wait a minute or two while it sets up.

### 2. Create the tables and photo storage

1. In the left sidebar, open **SQL Editor** and select **New query**.
2. Open `supabase/migrations/001_initial_schema.sql` from the project folder in any text editor, copy everything, and paste it into the query window.
3. Select **Run**. You should see *Success. No rows returned*.
4. Select **New query** again and do the same with `002_manage_functions.sql`, then `003_multiple_photos.sql`. Every file in `supabase/migrations/` must be run once, in number order.
4. Check it worked:
   - **Table Editor** lists `items`, `lookups`, `field_definitions` and `schema_migrations`.
   - **Storage** shows a bucket named `wardrobe`.

The script is safe to run again if something went wrong partway.

### 3. Create your login, then close sign-ups

1. Open **Authentication → Users** and select **Add user → Create new user**.
2. Enter your email and a strong password, and tick **Auto Confirm User**. Select **Create user**.
3. Open **Authentication → Sign In / Providers** (on some dashboards this is under **Authentication → Settings**) and turn **off** *Allow new users to sign up*. Leave the **Email** provider itself enabled.

Now only the account you just made can sign in. Your data is also protected by row-level security, so even a signed-in account can only see its own pieces.

### 4. Copy two values for later

Keep these in a note for Part B:

- **Project URL:** under **Project Settings → Data API** (or **API** on older dashboards). It looks like `https://abcdefghijk.supabase.co`.
- **Publishable key:** under **Project Settings → API Keys**. It starts with `sb_publishable_`. Older projects show an **anon public** key instead; that works too.

> Never use the **secret** or **service_role** key in the app. It bypasses all security.

---

## Part B — GitHub (code and hosting)

### 5. Create the repository

1. Sign up at **github.com** if you don't have an account.
2. Select **+ → New repository**:
   - **Repository name:** `my-wardrobe`
   - **Visibility:** **Public**. Free GitHub accounts can only host Pages sites from public repositories. Only the code is public; your clothes, photos and login stay in Supabase.
   - Leave *Add a README* unticked.
3. Select **Create repository**.

### 6. Add the Supabase values as secrets

1. In the new repository, open **Settings → Secrets and variables → Actions**.
2. Select **New repository secret** and add these two, exactly as named:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL from step 4 |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | your Publishable key from step 4 |

### 7. Turn on GitHub Pages

1. Still in **Settings**, open **Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

### 8. Upload the code

1. Install **GitHub Desktop** (desktop.github.com) and sign in with your GitHub account.
2. Select **File → Clone repository**, pick `my-wardrobe`, choose where to keep it on your computer, and select **Clone**.
3. Unzip `my-wardrobe.zip`. Copy **everything inside** the unzipped folder into the cloned `my-wardrobe` folder.
   - Include the hidden `.github` folder and `.gitignore` file, or deployment won't run. To see hidden files: on Mac, press **Cmd + Shift + .** in Finder; on Windows, choose **View → Show → Hidden items** in File Explorer.
4. Back in GitHub Desktop, the files appear under *Changes*. Type `v1.0.0` in the summary box, select **Commit to main**, then **Push origin**.

### 9. Watch it deploy

1. On github.com, open your repository's **Actions** tab. A run called *Deploy to GitHub Pages* starts automatically.
2. After about two minutes it shows a green tick. Your app is live at:

   ```
   https://<your-github-username>.github.io/my-wardrobe/
   ```

3. Open that link on your computer and sign in with the email and password from step 3 to check everything works.

---

## Part C — Install on your phone

### iPhone (Safari)

1. Open **Safari** and go to your app link.
2. Tap the **Share** button, then **Add to Home Screen**. If you see an *Open as Web App* switch, leave it on.
3. Tap **Add**. The Wardrobe icon appears on your home screen.
4. Open the app **from the icon** and sign in. The home-screen app keeps its own login, separate from Safari, so you need to sign in once here even if you already did in Safari.
5. The first time you tap **Take photo**, iOS asks for camera access. Tap **Allow**.

### Android (Chrome)

1. Open **Chrome** and go to your app link.
2. Tap the **⋮** menu, then **Install app** (or **Add to Home screen**), and confirm.
3. Open the app from the icon and sign in.

---

## Optional — online photo search

To find product photos online instead of taking your own, follow **Part D** of `docs/UPGRADING.md`. It needs a free SerpApi key (no card) and one small Supabase function, about 15 minutes.

---

## Tips for photos

- Use a plain wall, bed sheet or floor as the background, in daylight.
- Hang the piece or lay it flat, and shoot in portrait orientation. The wardrobe grid is portrait-shaped.
- Add several angles: front, back, a close-up of the fabric or label. Swipe through them on the piece's page. The first photo is the cover.
- Photos are shrunk on your phone before upload (about 200–400 KB each), so the free 1 GB of storage holds a few thousand pieces.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| **"Almost there"** screen | The secrets are missing or misnamed. Fix them (step 6), then go to **Actions → Deploy to GitHub Pages → Run workflow**. |
| **404** or a blank page | Check Pages **Source** is set to **GitHub Actions** (step 7), and that the link ends with `/my-wardrobe/`. |
| **Email or password is incorrect** | Check the user exists under **Authentication → Users** and shows as confirmed. If not, delete it and recreate with **Auto Confirm User** ticked. |
| **Couldn't load your wardrobe** mentioning a missing table or relation | The SQL script didn't run. Repeat step 2. |
| **Photo upload failed** | Check the `wardrobe` bucket exists under **Storage**. If not, rerun the script from step 2. |
| Everything fails after a week or more without opening the app | Free Supabase projects pause after 7 days of inactivity. Open the Supabase dashboard and select **Restore project**. Your data is kept. |
| A new version isn't showing on your phone | Close the app completely (swipe it away) and reopen it. Updates install in the background and apply on the next launch. |
| Deploy run fails with a red cross | Open the failed run to read the error. The most common cause is the `.github` folder or `package-lock.json` missing from the upload. |
