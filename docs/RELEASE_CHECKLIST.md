# BrainStreak — Production Release Checklist

This is the **definitive ship list**. Work top-to-bottom. Don't skip.

---

## 0. Prerequisites (one-time)

- [ ] Google Play Console developer account (US$25 one-time fee).
- [ ] An Android device (physical preferred) for smoke-test.
- [ ] Node 20+ installed locally.
- [ ] `eas` CLI logged in: `eas login`.
- [ ] Expo account linked to the project: `eas init --id <expo-project-id>` (or `eas build:configure`).
- [ ] (Optional, for sign-in feature) Supabase project + SQL ran from `supabase_setup.sql`.
- [ ] (Optional) Sentry account if you want crash reporting beyond the built-in ErrorBoundary.

---

## 1. Brand assets

- [x] `assets/icon.png` (1024², ~40 KB) — branded BrainStreak "B" mark.
- [x] `assets/adaptive-icon.png` (1080², transparent-safe) — Android foreground.
- [x] `assets/splash-icon.png` (2048², light bg) — launcher splash.
- [x] `assets/favicon.png` (64²) — web favicon.
- [x] SVG sources in `assets/brand/` — regenerate with `npm run icons`.
- [ ] Feature graphic 1024×500 for Play Store listing (create separately).
- [ ] At least 2 screenshots per supported device class (phone 1080×1920 min).

> The PNGs were generated from `assets/brand/*.svg` via `scripts/generate-icons.js` using `sharp`. To update the look, edit the SVGs and re-run `npm run icons`.

---

## 2. Configuration

- [x] `app.json` `userInterfaceStyle: "light"` matches the in-app theme.
- [x] `app.json` splash & adaptive icon bg `#F6F7F9` (matches `Colors.bg`).
- [x] `app.json` notification accent color `#2F6FED` (matches `Colors.primary`).
- [x] `app.json` Android package `com.brainstreak.app`, versionCode 1.
- [x] `app.json` `scheme: "brainstreak"` for deep linking.
- [x] `eas.json` production profile produces `app-bundle` with `autoIncrement: true`.
- [x] `eas.json` submit track set to `internal` with `releaseStatus: "draft"`.
- [ ] (If cloud sync) Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS secrets:
  - `eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xyz.supabase.co" --type sensitive`
  - `eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --type sensitive`

> Without those env vars the app still works fine — `isSupabaseConfigured()` returns false and the sign-in path short-circuits safely. Anonymous mode is the default.

---

## 3. Legal / Play Store metadata

- [x] Privacy Policy at `docs/privacy-policy.html` + `.md`.
- [x] Terms of Use at `docs/terms.html` + `.md`.
- [x] Landing page at `docs/index.html` linking both.
- [x] `docs/_config.yml` configured for GitHub Pages.
- [ ] Push `docs/` to a public GitHub repo and enable Pages (Settings → Pages → Source: `main` / folder: `/docs`).
- [ ] Privacy URL submitted in Play Console → App content → Privacy policy.
- [ ] Content rating questionnaire completed (BrainStreak = "Everyone" / IARC).
- [ ] Data safety form filled in Play Console (Email, no advertising, no sharing, encrypted in transit).
- [ ] Target audience: 13+.
- [ ] Store listing copy from `docs/STORE_LISTING.md`.

---

## 4. Code quality gates (must be green)

Run from project root:

```bash
npx tsc --noEmit                       # ✅ must exit 0
npm test                               # ✅ must show "Tests: 73 passed"
npx expo export --platform web         # ✅ must complete; dist/ generated
npm run icons                          # ✅ must regenerate all 4 icons
```

If any of the above fails — stop and fix before continuing.

---

## 5. Device smoke test (physical Android, ~10 min)

Build a preview APK and sideload:

```bash
npm run build:android:preview          # eas build --platform android --profile preview
# Wait for build to complete (~10 min). EAS gives you a QR + APK URL.
# Install on device via the URL or `adb install <apk>`.
```

Test these flows in order:

- [ ] **Cold start** — splash shows light blue gradient, then onboarding "Welcome" screen.
- [ ] **Onboarding** — Get started → enter username → Continue → reach Home.
- [ ] **Home tab** — greeting + StreakPill + hero card render. No "?" emojis. No console errors visible to user.
- [ ] **Play tab** — categories render with colored markers (no emoji). Tap "Play" → game launches instantly.
- [ ] **Game session** — 5 questions appear, tap an answer, see correct/wrong feedback, progress to next.
- [ ] **Quit confirmation** — press Android back during a round → confirmation dialog → "Quit" exits.
- [ ] **Finish round** — final screen shows XP earned, streak update, level-up confetti when applicable.
- [ ] **Back to Home** — streak number increased, "Recent activity" card shows the round.
- [ ] **Profile tab** — username, stats, sign-in CTA (if not signed in), app info row reads "Math, English, GK + Open Trivia DB".
- [ ] **Settings → Reminder** — pick a time, grant notification permission, save. Wait the time → notification arrives.
- [ ] **Offline test** — toggle airplane mode → reopen app → game still plays via local generators. OfflineBanner appears only for authenticated users.
- [ ] **Sign in / out** (only if cloud is configured) — sign up, verify email if required, sign in, sign out, sign back in on a fresh install → streak / XP restored.
- [ ] **Force-crash test** — temporarily throw in a screen, rebuild — ErrorBoundary shows "Something went wrong" with "Try again" instead of a white screen.

---

## 6. Production build & submit

```bash
# 1. Bump version in app.json (e.g. "1.0.0" stays for first release).
# 2. Build the production AAB.
npm run build:android:production       # eas build --platform android --profile production

# 3. (Optional) Submit straight to Play Console internal testing track.
npm run submit:android                 # eas submit --platform android --profile production
```

If you'd rather submit manually:
1. Download the `.aab` from the EAS dashboard.
2. Play Console → Internal testing → Create new release → upload `.aab`.
3. Add release notes (from `docs/RELEASE_NOTES.md`).
4. Review & save (don't roll out yet).

---

## 7. Internal testing → Closed → Production

Play Store requires you walk through tracks:

1. **Internal testing** — Add 1–5 tester emails. Install via opt-in URL. ~24h propagation.
2. **Closed testing** — Add 12+ testers, run for **at least 14 days** (mandatory for new accounts as of 2024).
3. **Production** — Once closed testing passes, promote to production. Review takes 1–7 days.

---

## 8. Post-launch

- [ ] Monitor Play Console "Vitals" for crash rate (< 1%) and ANR rate (< 0.5%).
- [ ] Read user reviews and respond in-console.
- [ ] Set up a v1.1 cadence: bump question bank, add 2–3 categories, ship update.
- [ ] (Recommended) Wire Sentry into `components/ErrorBoundary.tsx` `componentDidCatch` for prod crash visibility.

---

## Quick command reference

| Command | What it does |
|---|---|
| `npm test` | Run Jest suite (73 tests) |
| `npx tsc --noEmit` | Typecheck |
| `npx expo export --platform web` | Build static web bundle |
| `npm run icons` | Regenerate brand PNGs from SVG |
| `npm run build:android:preview` | Build a sideloadable APK |
| `npm run build:android:production` | Build a production AAB |
| `npm run submit:android` | Submit AAB to Play Console |
