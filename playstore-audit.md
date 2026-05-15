# Play Store Readiness Audit — 2026-05-15

## Verdict

**🔴 BLOCKED — must fix 3 items before submission can proceed**

---

## Blockers (must fix before submit)

### 1. Privacy Policy URL not publicly hosted
`docs/privacy-policy.html` exists locally and is git-tracked, but GitHub Pages has **not been published**.
The Play Console requires a live public HTTPS URL in the "App content → Privacy policy" field.
Planned URL: `https://yoursuperherobasu.github.io/brainstreak/privacy-policy.html` — returns **404**.

**Fix:** Push `docs/` to the public repo (or a dedicated one), then go to the repo's Settings → Pages → Source: `main` / folder: `/docs`. Takes ~5 min.

---

### 2. `expo-audio` plugin injects `RECORD_AUDIO` (dangerous permission) with no justification
`expo-audio`'s `AndroidManifest.xml` auto-declares:
```
android.permission.RECORD_AUDIO
android.permission.FOREGROUND_SERVICE
android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK
```
BrainStreak **never records audio**. All native sound `SOURCES` entries are commented out (`lib/audio.ts:119–129`). On Android the audio layer is a no-op; Web Audio API handles all sounds. `RECORD_AUDIO` is a runtime dangerous permission; Play Store policy flags it as unjustified and it triggers manual review / rejection.

**Fix (choose one):**
- Remove `"expo-audio"` from `app.json` `plugins` array until mp3 sound assets are actually bundled.
- Add a config plugin that strips `RECORD_AUDIO` from the merged manifest.
- Switch to `expo-av` for playback-only (its manifest does not declare `RECORD_AUDIO`).

---

### 3. EAS project not linked — `app.json` missing `extra.eas.projectId`
`eas build:configure` has never been run. `app.json` has no `extra.eas.projectId` field. Running `eas build` without it will prompt interactively; non-interactive CI builds will fail outright.

**Fix:** Run `eas build:configure` once (logs into Expo, links the project, writes the `projectId` to `app.json`, commits the change).

---

## Should-fix (won't block, but lazy / risky)

### 1. Store listing claims "Dark theme that's easy on the eyes" — app is light-only
`app.json` sets `userInterfaceStyle: "light"`. No dark palette exists in `constants/theme.ts`. The bullet in `docs/STORE_LISTING.md:48` is false advertising. Play Store can reject an update if the listing is materially inaccurate.

**Fix:** Delete that bullet from `docs/STORE_LISTING.md`. Replace with something true, e.g. "Clean light interface designed to reduce eye strain."

---

### 2. Sign-in error message leaks internal debug detail to production users
`app/auth/sign-in.tsx:43`: when Supabase is not configured, the error shown is:
> "Supabase isn't configured yet. See docs/SUPABASE_SETUP.md."

This is a developer-facing message with an internal file path. Production users who tap "Sign in" on an anonymous-only build will see it.

**Fix:** Change the string to "Sign-in is coming soon. Play anonymously for now." and hide the Sign In CTA when `!isSupabaseConfigured()`.

---

### 3. `SCHEDULE_EXACT_ALARM` requires a Play Console declaration
Play Store requires apps that use `SCHEDULE_EXACT_ALARM` to fill out a "Permissions declaration" form in the Play Console under "App content". The permission IS justified (user-set daily reminder), but you must state the use case explicitly or the app will be rejected at review.

**Evidence that the permission is needed:** `expo-notifications`'s `ExpoSchedulingDelegate.kt:106–119` calls `setExactAndAllowWhileIdle` on Android 12+ when `canScheduleExactAlarms()` returns true; falls back to inexact otherwise. The permission is optional for functionality but grants better accuracy.

**Fix:** In Play Console → App content → Sensitive permissions → fill in "Used for user-scheduled daily study reminders."

---

### 4. `RELEASE_CHECKLIST.md` test count is stale
`docs/RELEASE_CHECKLIST.md:71` says "must show 'Tests: 73 passed'" but the suite now passes 106 tests.

**Fix:** Update to 106. (Confirmed: `npm test` → 106 passed, 16 suites.)

---

### 5. Unguarded `console.warn` in production paths
Two `console.warn` calls are not behind `__DEV__`:
- `components/ErrorBoundary.tsx:31` — fires on any React render crash in production.
- `store/useUserStore.ts:113` — fires when Supabase sync fails.

These are error-path only, so they won't spam logs in normal operation, but they do expose internal module paths in production crash logs.

**Fix (low priority):** Wrap both in `if (__DEV__)` or use a logger abstraction.

---

## Stuff you have to do in Play Console (not code)

These cannot be automated; you must do them manually in the Play Console before the app can be published.

1. **Feature graphic** — 1024×500 PNG or JPEG (required for store listing). Not in the repo. Create it separately (e.g., in Figma or Canva). Should show the app name + branding on the `#F6F7F9` or accent-blue background.

2. **Phone screenshots** — minimum 2, recommended 4–8. Minimum resolution: 1080×1920. Capture: Home tab (streak pill + hero card), Play tab (category grid), Game session (TimerRing + question card), Game over (score recap + confetti).

3. **Publish GitHub Pages** — push the `docs/` folder to the public repo and enable Pages (Settings → Pages → Source: `main` / `/docs`). Then paste `https://yoursuperherobasu.github.io/brainstreak/privacy-policy.html` into Play Console → App content → Privacy policy.

4. **Content rating questionnaire (IARC)** — Answer the Play Console questionnaire. Expected result: **Everyone** (no violence, no gambling, no sexual content, no user-generated content, no ads). Reference: `docs/STORE_LISTING.md:91`.

5. **Data safety form** — Declare the following:
   - Data collected: **Email address** (optional, only if user signs in via Supabase).
   - Data not collected: no device identifiers, no location, no crash logs, no analytics.
   - Data encrypted in transit: **Yes** (Supabase uses HTTPS).
   - Data can be deleted by user: **Yes** (account deletion or sign-out clears local data; server row can be deleted on request).

6. **Permissions declaration for `SCHEDULE_EXACT_ALARM`** — Play Console → App content → Sensitive permissions → state use case: "User-set daily study reminder."

7. **App category** — Select **Trivia** (per `docs/STORE_LISTING.md:98`). If Trivia is unavailable as a primary, use **Education**.

8. **Target audience** — Set to **Everyone** (the store listing and content rating both say ESRB E / PEGI 3). Note: `docs/RELEASE_CHECKLIST.md:59` says "13+" while `docs/STORE_LISTING.md:91` says "Everyone" — resolve this before submitting; pick **Everyone** since there is no age-restricted content.

9. **Store listing copy** — Paste from `docs/STORE_LISTING.md` (already drafted). Fix the "Dark theme" bullet (see Should-fix #1) before using it.

10. **14-day closed testing (mandatory for new accounts)** — Google requires new developer accounts to run at least 14 days of closed testing with 12+ testers before promoting to production. Plan for this lead time.

---

## What's solid

`app.json` and `eas.json` are cleanly configured: Android package `com.brainstreak.app`, `versionCode: 1`, production profile produces AAB with `autoIncrement: true`, submit track is `internal/draft`. All four icon assets are correctly sized and branded (not the Expo placeholder). TypeScript compiles with zero errors and all 106 tests pass. No analytics, Firebase, Sentry, or tracking imports exist anywhere. Auth, sync, and network code all short-circuit gracefully when Supabase is not configured, and `fetchTriviaQuestions` falls back to 30+ bundled questions when the OTDB API is unreachable — the app is fully functional offline on a cold start.

---

## Commands to run (in order)

```bash
# 1. Fix the expo-audio / RECORD_AUDIO blocker first
#    (Remove "expo-audio" from plugins in app.json, or add removal config plugin)

# 2. Fix the sign-in error message (app/auth/sign-in.tsx:43)

# 3. Fix the store listing "dark theme" bullet (docs/STORE_LISTING.md:48)

# 4. Link the EAS project (one-time, writes extra.eas.projectId to app.json)
eas build:configure

# 5. Confirm quality gates still pass after edits
npx tsc --noEmit
npm test

# 6. Publish docs to GitHub Pages (run once, then enable Pages in GitHub repo settings)
git add docs/
git commit -m "Publish docs for GitHub Pages privacy policy"
git push origin main
# Then: GitHub repo → Settings → Pages → Source: main / /docs

# 7. Build the preview APK for device smoke test
npm run build:android:preview
# Install on a physical Android device via the EAS QR/URL link

# 8. After smoke test passes, build the production AAB
npm run build:android:production

# 9. Submit to Play Console internal testing track
npm run submit:android
# OR: download the AAB from EAS dashboard and upload manually in Play Console

# 10. In Play Console: complete content rating, data safety form, permissions
#     declaration, upload feature graphic + screenshots, paste listing copy.

# 11. Promote through Closed Testing (≥14 days, ≥12 testers) → Production
```
