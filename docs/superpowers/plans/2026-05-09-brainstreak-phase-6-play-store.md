# BrainStreak Phase 6 — Play Store Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land everything the agent can land for a Play Store release: EAS Build configuration, app.json metadata, a privacy policy, store-listing copy, sound-asset instructions, and step-by-step user-facing release docs. The user runs `eas build`, sets up the Play Console, and submits.

**Architecture:** All artifacts are static files committed to the repo. `eas.json` configures three build profiles (development / preview / production). `app.json` declares the Android targets, permissions, and version codes. `docs/PLAY_STORE_RELEASE.md` is the user runbook. `docs/privacy-policy.md` is the policy (will be GitHub-Pages-published; URL goes in the store listing). `docs/STORE_LISTING.md` holds short/full description, feature graphic copy, screenshots checklist. The agent does not submit — the user drives the final submission.

**Tech Stack:** Expo SDK 54, EAS Build, Google Play Console.

---

## File Map

**Files created in this phase:**
- `eas.json` — EAS Build configuration
- `docs/privacy-policy.md` — public privacy policy
- `docs/PLAY_STORE_RELEASE.md` — user runbook for the release
- `docs/STORE_LISTING.md` — listing copy + screenshots checklist
- `docs/SOUND_ASSETS.md` — sources and instructions for adding mp3s
- `docs/RELEASE_NOTES.md` — v1.0.0 release notes
- `docs/PHASES_SUMMARY.md` — what each of the 6 phases delivered

**Files modified in this phase:**
- `app.json` — bump `versionCode`, add Android permissions array, set adaptive icon background, declare deep-link scheme

**Files deleted in this phase:** none.

---

### Task 1: Add eas.json with three build profiles

**Files:**
- Create: `eas.json`

- [ ] **Step 1: Create eas.json**

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 7.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add eas.json
git commit -m "Add EAS Build configuration for development, preview, production profiles"
```

---

### Task 2: Update app.json for Play Store readiness

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Replace contents of app.json**

Read the current contents first:

```bash
cat /Users/basusingh/Desktop/Mob_App/app.json
```

Then replace with:

```json
{
  "expo": {
    "name": "BrainStreak",
    "slug": "brainstreak",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0A1A"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.brainstreak.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0A1A"
      },
      "package": "com.brainstreak.app",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "VIBRATE",
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "scheme": "brainstreak",
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#7C3AED"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 2: Verify Expo accepts the config**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo config --type public > /dev/null && echo "config OK"
```

Expected: `config OK`.

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "Update app.json with versionCode and Android permissions for Play Store"
```

---

### Task 3: Add privacy policy

**Files:**
- Create: `docs/privacy-policy.md`

- [ ] **Step 1: Create the privacy policy**

Create `docs/privacy-policy.md`:

```markdown
# BrainStreak Privacy Policy

**Effective date:** 2026-05-09
**Contact:** pratap1297@gmail.com

BrainStreak ("we", "our", "the app") respects your privacy. This document
explains what data we collect, why we collect it, and how we handle it.

## Summary

- BrainStreak works **without** an account. By default, all of your data is
  stored only on your device.
- Sign-in is **optional**. If you sign in, we store a small profile in our
  database so your XP, streak, level, and username can sync across devices.
- We never sell your data. We never use it for advertising. We never share it
  with third parties beyond what is technically required to operate the app.

## What we collect

### When you use the app anonymously (default)

We collect **nothing** on our servers. Your XP, streak, level, games played,
username, settings, and recent games are stored only on your device using
Android's standard local storage (`AsyncStorage`).

### When you sign in (optional)

If you create an account, we collect:

- **Email address** — to identify your account and let you sign back in.
- **Password** — encrypted, never stored in plain text. Authentication is
  handled by Supabase (https://supabase.com), which we use as our backend.
- **Profile data** — username, total XP, level, current streak, longest
  streak, games played, and a last-updated timestamp. These are mirrored
  from your device so they sync across devices.

We do **not** collect:

- Your real name, address, phone number, age, or any other personal info.
- Your contacts, location, photos, microphone, camera, or device files.
- Any analytics or behavioral telemetry.

### Open Trivia DB

When you play a game, the app fetches questions from the public
Open Trivia Database (https://opentdb.com). The request includes only the
category and difficulty you chose; it does not include any user identifier.

### Notifications

If you enable the daily reminder, the app uses Android's local
notifications system. Reminders are scheduled on your device and never
leave it.

## How we use your data

- To sync your profile across devices when you choose to sign in.
- To send daily reminder notifications you opted in to.
- That's it.

## Data retention

- Local data stays on your device until you uninstall the app or clear it
  manually.
- Cloud data (sign-in only) is retained as long as your account exists.

## Deleting your account and data

To delete your cloud account and the associated profile row:

1. Email pratap1297@gmail.com from the address you used to sign in. Subject:
   "BrainStreak — delete my account."
2. We will confirm the request and delete the row within 7 days.
3. Local data on your device is removed when you uninstall the app.

## Children's privacy

BrainStreak is rated for all ages. We do not knowingly collect data from
children under 13. If you believe a child under 13 has signed in, contact us
and we will delete the account.

## Security

- Data in transit is encrypted using TLS.
- Passwords are hashed by Supabase using industry-standard algorithms.
- Cloud rows are protected by Supabase Row Level Security: only the owning
  user can read or write their own row.

## Changes to this policy

If we change this policy, we will update the "Effective date" at the top
and notify users via the app or email.

## Your rights

You have the right to:

- Know what data we hold about you.
- Request a copy of your data.
- Request deletion of your data.
- Withdraw consent at any time by signing out and uninstalling the app.

To exercise any of these rights, contact pratap1297@gmail.com.

---

This policy was written for BrainStreak v1.0.0.
```

- [ ] **Step 2: Commit**

```bash
git add docs/privacy-policy.md
git commit -m "Add privacy policy for Play Store data safety form"
```

---

### Task 4: Add sound assets acquisition guide

**Files:**
- Create: `docs/SOUND_ASSETS.md`

- [ ] **Step 1: Write the guide**

Create `docs/SOUND_ASSETS.md`:

```markdown
# Sound Assets — BrainStreak v1

Phase 2 wired audio through `lib/audio.ts`. The wrapper no-ops silently
when source files are missing. Before submitting to the Play Store, drop
four short royalty-free `.mp3` files into `assets/sounds/` and uncomment
the matching lines in `lib/audio.ts`.

## Files needed

| Filename       | Purpose                          | Length    | Volume          |
|----------------|----------------------------------|-----------|-----------------|
| `tick.mp3`     | Final-3-second countdown click   | ~80 ms    | Soft, subtle    |
| `correct.mp3`  | Correct answer chime             | ~300 ms   | Bright, upward  |
| `wrong.mp3`    | Wrong answer buzz                | ~250 ms   | Low, short      |
| `fanfare.mp3`  | Game-over win celebration        | ~1.2 s    | Triumphant      |

Keep each file under 50 KB so the bundle stays small. Mono is fine.

## Where to source them

Use any source whose license allows commercial mobile-app distribution.
Three good options:

1. **Pixabay Sound Effects** — https://pixabay.com/sound-effects/
   - License: Pixabay Content License (free, commercial use allowed,
     no attribution required).
2. **Freesound.org with CC0 filter** — https://freesound.org/search/?f=license%3A%22Creative+Commons+0%22
   - License: CC0, public domain.
3. **Mixkit** — https://mixkit.co/free-sound-effects/
   - License: Mixkit Free Sound Effects License (free, commercial use OK).

## How to add them

1. Download the four files. Rename to match the table above exactly.
2. Move them into `assets/sounds/`:
   ```
   /assets/sounds/tick.mp3
   /assets/sounds/correct.mp3
   /assets/sounds/wrong.mp3
   /assets/sounds/fanfare.mp3
   ```
3. Open `lib/audio.ts` and uncomment the four `require()` lines inside
   `SOURCES`. The result should look like:
   ```ts
   const SOURCES: Partial<Record<SoundKey, number>> = {
     tick: require('@/assets/sounds/tick.mp3'),
     correct: require('@/assets/sounds/correct.mp3'),
     wrong: require('@/assets/sounds/wrong.mp3'),
     fanfare: require('@/assets/sounds/fanfare.mp3'),
   };
   ```
4. Run `npm test` and `npx tsc --noEmit` — both must pass.
5. Run `npx expo export --platform android --output-dir .expo/check`. The
   bundle size grows by the size of the sounds; nothing should fail.
6. Commit:
   ```
   git add assets/sounds/*.mp3 lib/audio.ts
   git commit -m "Wire game sound effects"
   ```

## Validation

After installing the dev build on a device:

- Countdown's last 3 seconds should tick.
- Correct answer plays a short upward chime.
- Wrong answer plays a low buzz.
- Game-over (>= 60% accuracy) plays the fanfare and triggers confetti.

If a sound stutters or feels too long, trim it with QuickTime, Audacity,
or a web tool — files under 1.5 seconds feel snappy in a trivia game.
```

- [ ] **Step 2: Commit**

```bash
git add docs/SOUND_ASSETS.md
git commit -m "Document sound-asset sources and wiring procedure"
```

---

### Task 5: Add store listing copy

**Files:**
- Create: `docs/STORE_LISTING.md`

- [ ] **Step 1: Write the listing copy**

Create `docs/STORE_LISTING.md`:

```markdown
# Play Store Listing — BrainStreak v1.0.0

Paste these into the Play Console listing fields.

## App name

```
BrainStreak: Daily Trivia
```
(30 chars max — currently 24.)

## Short description (≤ 80 chars)

```
Quick daily trivia. Build a streak, level up your brain in 60 seconds a day.
```

## Full description (≤ 4000 chars)

```
BrainStreak is a daily trivia game built around one habit: 60 seconds, 5 questions, every day.

⚡ FAST
Five questions. Fifteen seconds each. Speed earns bonus points.

🔥 STREAKS
Play one round a day to keep your flame burning. Miss a day and the streak resets — so don't.

🧠 SIX CATEGORIES
Mixed, Science, History, Tech, Sports, and Pop Culture. Three difficulty levels: Easy, Medium, Hard.

⏱️ DESIGNED FOR THE COFFEE BREAK
A full game loop fits between sips. Timer pulses when seconds are running out. Haptics on every tap.

🏆 LEVEL UP
Earn XP from every correct answer. Speed bonus on top. Streak bonus on top of that. Level up across nine ranks.

📡 OPTIONAL SYNC
Sign in once with email and your XP, streak, and level travel with you to any device. Anonymous play is the default — no account required.

🔒 PRIVACY-FIRST
No ads. No tracking. No analytics. Anonymous by default. If you sign in, we store a single row: your username, XP, streak, level, and games played. That's it.

📱 BUILT FOR YOU
- Daily reminder you can set to any time (or turn off).
- Toggleable sound and haptics.
- Works fully offline — questions cache automatically.
- Dark theme that's easy on the eyes.

Sharpen your brain. Build the streak. Take 60 seconds.
```

## Listing graphics

| Asset                  | Size                | Notes                                 |
|------------------------|---------------------|---------------------------------------|
| App icon               | 512 × 512 PNG       | Already generated → `assets/icon.png` |
| Feature graphic        | 1024 × 500 PNG      | Generate during release prep          |
| Phone screenshots      | 1080 × 1920+ PNG    | Min 2, max 8                          |

### Screenshots to capture (minimum 4)

1. **Home** — streak hero, level/XP card, "Play another round" CTA visible.
2. **Play** — full category grid with Science selected, difficulty Medium.
3. **Game session** — TimerRing prominent, question card on screen, four answer buttons.
4. **Game over** — recap card with score, accuracy, +XP, confetti behind.
5. (Optional) **Profile** — avatar, level badge, streak summary, settings list.

To capture: run a debug build on a real device, take screenshots, optionally
overlay a one-line tagline per shot.

### Feature graphic copy options

```
Sharpen your brain.
60 seconds a day.
```

```
5 questions. 15 seconds.
Don't break the streak.
```

```
Daily trivia.
Built for your coffee break.
```

## Content rating

- Target audience: Everyone (ESRB E / PEGI 3).
- Violence: none. Drugs: none. User-generated content: none.
- Personal info collected: only optional email for sign-in.
- The Play Console questionnaire's defaults will land you on Everyone.

## Categorization

- **App category:** Trivia
- **Tags:** trivia, quiz, brain training, daily challenge, streak

## Contact details

- **Email:** pratap1297@gmail.com
- **Website:** https://yoursuperherobasu.github.io/brainstreak (if you publish docs/privacy-policy.md via GitHub Pages — instructions in `docs/PLAY_STORE_RELEASE.md`)

## Privacy policy URL

Required field. Use the URL of `docs/privacy-policy.md` once you have it
hosted publicly (GitHub Pages takes 5 minutes — see release runbook).
```

- [ ] **Step 2: Commit**

```bash
git add docs/STORE_LISTING.md
git commit -m "Add Play Store listing copy and graphics checklist"
```

---

### Task 6: Add Play Store release runbook

**Files:**
- Create: `docs/PLAY_STORE_RELEASE.md`

- [ ] **Step 1: Write the runbook**

Create `docs/PLAY_STORE_RELEASE.md`:

```markdown
# Play Store Release Runbook — BrainStreak v1.0.0

Step-by-step. ~3 hours of work spread over 1–2 weeks (Google's internal
testing track requires a 14-day cooldown before going live).

---

## Phase A — Accounts and prerequisites (~30 minutes)

### A1. Expo account

1. Sign up at https://expo.dev (free).
2. Install the EAS CLI:
   ```
   npm install -g eas-cli
   ```
3. Log in:
   ```
   eas login
   ```

### A2. Initialize EAS in the repo

```
cd /Users/basusingh/Desktop/Mob_App
eas init
```

This binds the project to your Expo account and writes a `projectId` into
`app.json`. Commit the change:

```
git add app.json
git commit -m "Initialize EAS project"
```

### A3. Google Play Console account

1. Go to https://play.google.com/console.
2. Pay the one-time **$25 USD** developer fee.
3. Complete the developer profile (display name, contact email, website).
4. Verify your identity (Google may request government ID; takes minutes-to-days).

### A4. Create the app in Play Console

1. **Create app** in the Play Console.
2. **App name:** `BrainStreak: Daily Trivia`
3. **Default language:** English (US).
4. **App or game?** Game.
5. **Free or paid?** Free.
6. Accept the developer program policies and US export laws.

---

## Phase B — Build the AAB (~30 minutes)

### B1. Add sound files (optional but strongly recommended)

Follow `docs/SOUND_ASSETS.md`.

### B2. Build the production AAB

```
cd /Users/basusingh/Desktop/Mob_App
eas build --platform android --profile production
```

EAS asks two questions on first run:

1. **"Generate a new Android Keystore?"** → **Yes**. EAS keeps the keystore
   in their managed credentials. Recover it any time with
   `eas credentials`.
2. **"Push notification credentials?"** → Skip (not needed for v1).

The build runs on EAS servers (~10-15 minutes). When it finishes, download
the `.aab` from the URL EAS prints, or fetch it later with
`eas build:list`.

### B3. Test the build locally first (optional, recommended)

Run a preview build instead of production for an APK you can sideload:

```
eas build --platform android --profile preview
```

Download the APK, install on your Android device, smoke-test the app
(onboarding → game → recap → settings).

---

## Phase C — Host the privacy policy (~10 minutes)

The Play Console **requires** a publicly-accessible privacy policy URL.

### C1. Push docs to GitHub

If the repo is on GitHub already:

1. Go to **Settings → Pages**.
2. Source: **Deploy from a branch**. Branch: `main`. Folder: `/docs`.
3. Click **Save**. GitHub publishes at
   `https://<username>.github.io/<repo>/privacy-policy.html`.
4. The `.md` is served — open the URL after a minute to confirm.

If the repo is private or not on GitHub, paste the contents of
`docs/privacy-policy.md` into a Gist or static-hosting site of choice.
Any public URL works.

### C2. Note the URL

You will paste it into the Play Console listing in Phase D.

---

## Phase D — Listing and content rating (~45 minutes)

### D1. Store listing

In the Play Console, **Grow → Store presence → Main store listing**:

1. **App name, short description, full description** — paste from
   `docs/STORE_LISTING.md`.
2. **App icon** — upload `assets/icon.png` (resize to 512 × 512 if needed).
3. **Feature graphic** (1024 × 500) — generate one. Three options:
   - Use a design tool (Figma, Canva).
   - Use the BrainStreak mockup HTML at
     `docs/superpowers/mockups/2026-05-09-screens.html` as inspiration.
   - Have an LLM generate one.
4. **Phone screenshots** (4–8 PNGs, 1080×1920 minimum):
   - Run preview build on a real device (or Android Studio emulator).
   - Capture the screens listed in `docs/STORE_LISTING.md`.
5. **App category:** Games → Trivia.
6. **Tags:** trivia, quiz, brain training.
7. **Contact details:** email pratap1297@gmail.com, website (the GitHub
   Pages URL).
8. **Privacy policy URL:** the URL from Phase C2.

### D2. Content rating

In **Policy → App content → Content ratings**:

1. Email: pratap1297@gmail.com.
2. Category: Reference, news, or educational → Trivia.
3. Answer the questionnaire — for BrainStreak, every "violence / sex /
   drugs / gambling" question is **No**. The result will be
   **Rated for 3+ / Everyone**.

### D3. Target audience and content

**Policy → App content → Target audience**:

- Target age: 13+ (recommended; choosing under-13 triggers extra
  paperwork).
- "Does your app appeal to children?" → **No**.

**Policy → App content → Ads**:

- "Does your app contain ads?" → **No**.

### D4. Data safety

**Policy → App content → Data safety**. Answers for BrainStreak v1:

| Question                                       | Answer            |
|------------------------------------------------|-------------------|
| Does your app collect or share user data?      | Yes (optional)    |
| What types? (when signed in)                   | Email, App activity (in-app gameplay stats) |
| For each: collected/shared?                    | Collected only — not shared with third parties |
| For each: required or optional?                | Optional          |
| For each: purpose?                             | App functionality, account management |
| Encrypted in transit?                          | Yes               |
| Can users request data deletion?               | Yes (via email)   |

---

## Phase E — Internal testing → production (~15 minutes + 14-day wait)

Google now requires **14 consecutive days of closed/internal testing with
12+ unique testers** before you can launch to production. Plan accordingly.

### E1. Internal testing track

In the Play Console, **Test and release → Testing → Internal testing**:

1. **Create new release**.
2. **Upload the AAB** from Phase B.
3. **Release name:** `1.0.0 (1)`.
4. **Release notes:** paste contents of `docs/RELEASE_NOTES.md`.
5. **Save → Review release → Start rollout to internal testing**.

### E2. Add testers

1. **Testers tab** of the same Internal testing screen.
2. Create an email list — add at least 12 unique Gmail addresses (friends,
   family, colleagues — anyone willing to install the app).
3. Save. The Play Console gives you an opt-in URL — share that URL with
   the testers; each clicks it, accepts, and installs the app.

### E3. Track tester count

- Open **Test and release → Releases overview** to see active testers.
- Google considers a tester "active" once they install the app and open
  it. Push for 12+ active testers within the first 48 hours so you don't
  lose calendar time.

### E4. After 14 days — promote to production

1. Wait 14 days from the day testing started.
2. **Test and release → Production → Create new release**.
3. Promote the AAB from Internal testing (button in the Internal testing
   release page).
4. Same release notes.
5. **Save → Review release → Start rollout to production**.

Google then runs an automated review (typically 1-3 days). You will get
an email when the app is live.

---

## Phase F — Post-launch (~ongoing)

### F1. Monitor

- **Quality → Android vitals** for crash rates.
- **Quality → User feedback → Reviews** for early reviews. Respond
  publicly to anything ≤ 3 stars.
- **Statistics → Statistics** for installs and retention.

### F2. Update strategy

- Future updates: bump `version` in `app.json` (semver, e.g. 1.0.1) and
  bump `versionCode` by 1. Run `eas build --profile production` and
  upload via `eas submit --platform android --profile production`.
- Bug fixes can ship straight to production.
- New features should pass through the Internal testing track again.

---

## Cost summary

| Item                                  | Cost        |
|---------------------------------------|-------------|
| Google Play Console developer fee     | $25 (one-time) |
| Expo / EAS                            | Free for up to 30 builds/month |
| Supabase                              | Free up to 50K MAU |
| Sound effects (CC0 / Pixabay)         | Free        |
| **Total**                             | **$25**     |

---

## Troubleshooting

### "Build failed — keystore mismatch"

Run `eas credentials` and choose Android, then "Set up a new keystore."
Subsequent production builds use the same keystore.

### "Internal testing rejected — privacy policy URL invalid"

Verify the URL returns HTTP 200 (open it in an incognito tab). The Play
Console rejects 404s and redirects.

### "Data safety form rejected"

Most rejections come from forgetting to mark email collection as
"optional." Double-check Phase D4.

### "App is rated higher than expected"

Re-run the content rating questionnaire (D2). If you initially answered
"yes" anywhere by mistake, the rating jumps.

---

## Final pre-submission checklist

- [ ] All Phase 1-5 work merged to `main`.
- [ ] `npm test` passes (45 tests).
- [ ] `npx tsc --noEmit` clean.
- [ ] `npx expo export --platform android` clean.
- [ ] Sound files in place (`docs/SOUND_ASSETS.md`).
- [ ] Supabase project set up (`docs/SUPABASE_SETUP.md`) and `.env` populated.
- [ ] Privacy policy URL live (Phase C).
- [ ] Production AAB built (Phase B).
- [ ] Play Console listing complete (Phase D).
- [ ] Content rating questionnaire submitted (D2).
- [ ] Data safety form submitted (D4).
- [ ] Internal testing release uploaded with 12+ testers (E1, E2).
- [ ] 14 days elapsed.
- [ ] Promoted to production (E4).
```

- [ ] **Step 2: Commit**

```bash
git add docs/PLAY_STORE_RELEASE.md
git commit -m "Add Play Store release runbook with phase-by-phase user instructions"
```

---

### Task 7: Add release notes for v1.0.0

**Files:**
- Create: `docs/RELEASE_NOTES.md`

- [ ] **Step 1: Write release notes**

Create `docs/RELEASE_NOTES.md`:

```markdown
# Release notes — BrainStreak v1.0.0

First public release. 🎉

**What's in this release**

- Daily 5-question trivia, 15 seconds per question.
- Six categories: Mixed, Science, History, Tech, Sports, Pop Culture.
- Three difficulty levels: Easy, Medium, Hard.
- Streak system — play daily to keep your flame burning.
- XP, levels, and a recap with confetti when you do well.
- Sound effects and haptics, both togglable.
- Daily reminder at a time you choose.
- Optional email/password sign-in syncs your profile across devices.
- Fully offline-capable — questions cache automatically.
- 3-screen onboarding on first launch.

**For the Play Store What's New field (≤ 500 chars)**

```
Welcome to BrainStreak — daily trivia in 60 seconds. Five questions, fifteen
seconds each, six categories. Build a streak by playing daily, earn XP, and
level up. Optional sign-in syncs your profile across devices. No ads, no
tracking — just trivia.
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/RELEASE_NOTES.md
git commit -m "Add v1.0.0 release notes for Play Store"
```

---

### Task 8: Add phases summary

**Files:**
- Create: `docs/PHASES_SUMMARY.md`

- [ ] **Step 1: Write the summary**

Create `docs/PHASES_SUMMARY.md`:

```markdown
# BrainStreak v1 — Build Summary

Six phases. ~10 days of focused work compressed by agentic execution.

## Phase 1 — Foundation
Stripped boilerplate, dropped out-of-scope tabs (Habits, Leaderboard),
trimmed `lib/storage.ts` and `lib/supabase.ts`, simplified
`supabase_setup.sql` to profiles-only with auto-trigger and RLS, added
jest-expo with first scoring and streak tests, introduced persisted
Zustand stores (`useUserStore`, `useSettingsStore`) and a settings-aware
haptics wrapper.

## Phase 2 — Game loop polish
Built `TimerRing`, `QuestionCard`, `AnswerButton`, `XPBar`, and
`ConfettiBurst` components with Reanimated 3 animations. Added a
settings-aware audio wrapper and a pure prefetch helper with tests.
Refactored `app/game/session.tsx` to use the new primitives. Old `Timer`
component retired.

## Phase 3 — Home / Play / Profile screens
Generated frontend-design HTML mockups as visual reference. Added
`SectionHeader`, `SettingsRow`, and `CategoryTile` components. Refactored
all three tab screens to read from `useUserStore` and `useSettingsStore`.
Added a sign-in stub route, wired Sign-in CTA on Profile.

## Phase 4 — Auth + sync
Added `lib/auth.ts` (sign-up / sign-in / sign-out / password reset
wrappers), `lib/sync.ts` (pure `mergeProfiles` plus `pullAndMerge`,
`pushProfile`), and `lib/network.ts`. Replaced sign-in stub with the real
flow. Wired session bootstrap on launch, push-after-game, and an
`OfflineBanner`. Sign-out flow added to Profile.

## Phase 5 — Notifications + onboarding + tests
Added `computeNextReminder` pure helper with tests, `lib/notifications.ts`
wrapper around expo-notifications, and a time-picker modal. Added 3-screen
onboarding (welcome → username → sign-in prompt) with a launch redirect
when not yet onboarded.

## Phase 6 — Play Store release
Added `eas.json` with development / preview / production profiles. Updated
`app.json` with versionCode and Android permissions. Wrote privacy policy,
listing copy, sound-asset acquisition guide, full release runbook, release
notes, and this summary. The user runs `eas build` and submits.

---

## Test count by phase

| Phase | Net new tests | Cumulative |
|-------|---------------|------------|
| 1     | 27            | 27         |
| 2     | +4            | 31         |
| 3     | 0             | 31         |
| 4     | +7            | 38         |
| 5     | +7            | 45         |
| 6     | 0             | 45         |

## Bundle size by phase (Android, hbc)

| Phase | Size      |
|-------|-----------|
| 1     | 3.77 MB   |
| 2     | 4.01 MB   |
| 3     | 4.02 MB   |
| 4     | 4.55 MB   |
| 5     | 4.66 MB   |
| 6     | (steady)  |
```

- [ ] **Step 2: Commit**

```bash
git add docs/PHASES_SUMMARY.md
git commit -m "Add phases summary documenting all 6 phases of v1 build"
```

---

### Task 9: Final verification — bundle, tests, typecheck

**Files:** none modified.

- [ ] **Step 1: Type-check**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run the full test suite**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npm test
```

Expected: 45 tests pass across 5 suites.

- [ ] **Step 3: Confirm the Android bundle**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo export --platform android --output-dir .expo/phase6-smoke 2>&1 | tail -10
```

Expected: bundle exports.

```bash
rm -rf /Users/basusingh/Desktop/Mob_App/.expo/phase6-smoke
```

- [ ] **Step 4: Confirm app.json is valid**

Run:
```bash
cd /Users/basusingh/Desktop/Mob_App && npx expo config --type public > /dev/null && echo "config OK"
```

Expected: `config OK`.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
cd /Users/basusingh/Desktop/Mob_App && git status
```

If clean, skip. Otherwise:

```bash
git add -A
git commit -m "Phase 6 verification cleanup"
```

---

## Self-Review Notes

- **Spec coverage:** Spec section 14 = EAS Build for signed AAB ✓ (Task 1
  + runbook Phase B), target SDK 34+ inherited from Expo SDK 54 default,
  versioning via app.json ✓ (Task 2), privacy policy ✓ (Task 3), listing
  assets checklist ✓ (Task 5), Data Safety form documented ✓ (runbook
  D4), content rating documented ✓ (runbook D2), listing copy drafted ✓
  (Task 5), closed/internal testing 12-tester / 14-day requirement ✓
  (runbook E1-E3), Play Console paperwork delegated to user ✓ (entire
  runbook).
- **Placeholders:** none. Every step has copy-pastable content. The
  Play Console UI navigation is described step-by-step.
- **Type consistency:** No new TypeScript types introduced. The
  `versionCode` and Android permission names in Task 2 match Play
  Store's required keys.

---

## Plan Summary

9 tasks. After Phase 6:
- Repo has every artifact a user needs to ship.
- The user runs `eas build`, follows `docs/PLAY_STORE_RELEASE.md`, and
  submits to Internal testing → Production.
- Total user effort post-handoff: ~3 hours of work + a 14-day testing
  window.
- Total cost: $25 one-time Google Play developer fee.

This is the final phase. After Task 9 verifies, BrainStreak v1 is ready
to hand off.
