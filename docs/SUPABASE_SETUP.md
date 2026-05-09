# Supabase Setup — BrainStreak v1

Five steps. ~10 minutes. Free tier is plenty.

## 1. Create the project

1. Go to https://app.supabase.com and sign in (GitHub login is fastest).
2. Click **New project**. Name it `brainstreak`. Pick the region closest to you.
3. Generate a strong database password and save it in your password manager.
4. Wait ~60s for the project to provision.

## 2. Run the SQL setup

1. In the project sidebar, open **SQL Editor → New query**.
2. Open `supabase_setup.sql` from this repo.
3. Paste its contents into the SQL editor. Click **Run**.
4. You should see `Success. No rows returned`. Verify the `profiles` table now exists under **Table Editor**.

## 3. Get your API credentials

1. In the sidebar, open **Project Settings → API**.
2. Copy the **Project URL** (looks like `https://abcdef.supabase.co`).
3. Copy the **anon public** key (the long JWT under "Project API keys").

## 4. Paste into .env

In the repo root, create a file named `.env` (it's gitignored — never commit it):

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdef.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

If `.env` already exists, replace the placeholder values. Restart any running `expo start` after editing.

## 5. Configure auth email templates (optional but recommended)

1. In the sidebar, open **Authentication → Email Templates**.
2. Edit the **Confirm signup** template — set the redirect URL to `brainstreak://auth/confirmed` so the deep link reopens the app after the user clicks the email.
3. Edit the **Reset password** template — set the redirect to `brainstreak://auth/reset`.

## 6. Verify

After the agent finishes Phase 4, run the app and:

1. Open Profile → Sign in.
2. Tap **Sign up** mode. Enter a test email and password (8+ chars).
3. You should see "Check your email to confirm." Open the email, click the link.
4. Return to the app — the Profile should now show "Sync: On".

## Cost

Free tier covers up to 50,000 monthly active users and 500 MB of database. BrainStreak's per-user write volume is tiny (one row per user, a few columns).
