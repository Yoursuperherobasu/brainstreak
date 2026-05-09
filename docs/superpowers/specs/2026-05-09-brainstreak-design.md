# BrainStreak — Production Design Spec

**Date:** 2026-05-09
**Owner:** Yoursuperherobasu
**Target:** Google Play Store (Android), production v1.0.0

## 1. Vision

A polished daily trivia and streak game shipped to the Google Play Store. Five-question rounds at 15 seconds each with speed bonuses, a streak system, XP and levels. The app plays fully offline. Optional email sign-in mirrors the player's profile across devices.

## 2. Scope

### In v1
- Three tabs: Home, Play, Profile.
- Full game loop: countdown → 5 questions → recap.
- Six categories (Mixed, Science, History, Tech, Sports, Pop Culture) sourced from Open Trivia DB.
- Local-first XP, streak, level tracking.
- Optional Supabase email/password sign-in for cross-device profile sync.
- Daily reminder notification (user-configurable time).
- 3-screen onboarding on first launch.
- Sound effects and haptics, both toggleable.
- Production-grade animations and polish.

### Out of v1 (deferred to v2)
- Habits tab
- Leaderboard tab
- Daily challenge
- Power-ups (50/50, freeze-time, etc.)
- Social sharing
- Question history view
- Multi-language support
- Light theme

## 3. Architecture Approach

**Local-first with optional Supabase sync.** AsyncStorage is the source of truth for game data. When the user signs in, profile fields (XP, streak, level, games played, username) mirror to a Supabase `profiles` row. Anonymous play is fully supported and never touches the network for game data.

Rejected alternatives:
- *Supabase-first with anonymous auth* — requires network on first launch; pollutes auth.users with anon rows.
- *Hybrid double-write with full game history* — over-engineered for v1 without a leaderboard.

## 4. Information Architecture

```
(tabs)
├── Home              streak ring, today's status, "New game" CTA, recent activity
├── Play              6 category cards + difficulty toggle (any/easy/medium/hard)
└── Profile           username, level/XP bar, streaks, games played, sign-in, settings

Modal / full-screen
├── game/session      countdown → 5 questions → recap
├── auth/sign-in      email + password (sign-in or sign-up)
└── onboarding/*      welcome, pick username, optional sign-in (skippable)
```

## 5. Game Loop

1. User taps a category on Play tab.
2. App fetches 5 questions from Open Trivia DB (with offline fallback).
3. Full-screen game session opens with 3-2-1 countdown.
4. For each question:
   - 15-second timer with visual ring.
   - User taps an answer (or time expires).
   - Correct/wrong animation, points pop, 1.5s pause.
   - Background prefetch of next category's questions begins.
5. Recap screen: total score, XP earned, streak status, level-up confetti if applicable.
6. Local profile updated. If signed in, push to Supabase.

### Scoring (existing, unchanged)
- Easy: 100 base, Medium: 150, Hard: 250.
- Speed bonus: up to 50% extra based on time remaining.
- XP per game: `floor(score × min(1 + 0.1 × streak, 2.0) × 0.1)`.
- Level: `floor(sqrt(xp / 50)) + 1`.

## 6. File Layout

```
app/
├── _layout.tsx                  Root stack + fonts + splash (existing — polish)
├── (tabs)/
│   ├── _layout.tsx              Tab bar (REMOVE habits.tsx, leaderboard.tsx)
│   ├── index.tsx                Home screen
│   ├── play.tsx                 Category + difficulty picker
│   └── profile.tsx              Stats + settings + sign-in entry
├── game/
│   └── session.tsx              Existing — refactor to use new components
├── auth/
│   └── sign-in.tsx              NEW — email/password modal
└── onboarding/
    ├── _layout.tsx              NEW
    ├── welcome.tsx              NEW
    ├── username.tsx             NEW
    └── sign-in-prompt.tsx       NEW (skippable)

components/
├── Button.tsx                   Existing — refine
├── Card.tsx                     Existing — refine
├── Timer.tsx                    Existing — replace with TimerRing
├── StreakBadge.tsx              Existing — refine animation
├── QuestionCard.tsx             NEW — question text + 4 answer buttons
├── AnswerButton.tsx             NEW — animated states (idle / selected / correct / wrong)
├── XPBar.tsx                    NEW — level + progress bar
├── ConfettiBurst.tsx            NEW — game-over celebration
├── EmptyState.tsx               NEW — generic empty/error UI
├── OfflineBanner.tsx            NEW — top banner when offline + signed in
└── SettingsRow.tsx              NEW — toggleable row primitive

lib/
├── supabase.ts                  Existing — refine, add typed helpers
├── trivia.ts                    Existing — keep
├── storage.ts                   Existing — refine (add settings, recent games)
├── auth.ts                      NEW — sign-in, sign-up, sign-out, password-reset
├── sync.ts                      NEW — pull, push, merge profile
├── audio.ts                     NEW — sfx loader / player
├── haptics.ts                   NEW — thin wrapper around expo-haptics
└── notifications.ts             NEW — daily reminder scheduling

store/
├── useGameStore.ts              Existing
├── useUserStore.ts              NEW — profile, streak, XP, auth state
└── useSettingsStore.ts          NEW — sound on/off, haptics on/off, reminder time

constants/
├── theme.ts                     Existing
└── config.ts                    NEW — feature flags, timing constants

assets/
├── sounds/                      NEW — tick.mp3, correct.mp3, wrong.mp3, fanfare.mp3
└── (existing icons)

docs/
├── superpowers/specs/           This spec lives here
└── privacy-policy.md            NEW — required for Play Store

eas.json                         NEW — EAS Build configuration
```

Files to delete:
- `App.tsx` — boilerplate left over from `expo init`. Real entry is `index.ts` → `expo-router/entry`.
- `app/(tabs)/habits.tsx` — out of scope.
- `app/(tabs)/leaderboard.tsx` — out of scope.

## 7. Data Model

### Local (AsyncStorage)
- `@brainstreak/profile` — `{ username, totalXP, level, gamesPlayed }`
- `@brainstreak/streak` — `{ current, longest, lastPlayedDate }` (`YYYY-MM-DD`)
- `@brainstreak/settings` — `{ soundOn, hapticsOn, dailyReminderTime: 'HH:MM' | null }`
- `@brainstreak/recent_games` — last 20 sessions: `[{ category, score, xp, correct, total, at }]`
- `@brainstreak/onboarded` — boolean

### Supabase
Single table for v1. Keep `scores` table and leaderboard RPC commented out in `supabase_setup.sql` for v2 reference.

```sql
profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text NOT NULL,
  total_xp        integer NOT NULL DEFAULT 0,
  level           integer NOT NULL DEFAULT 1,
  current_streak  integer NOT NULL DEFAULT 0,
  longest_streak  integer NOT NULL DEFAULT 0,
  games_played    integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```

RLS policies:
- `select`: only `auth.uid() = id`
- `insert`: only `auth.uid() = id`
- `update`: only `auth.uid() = id`

A trigger creates the `profiles` row automatically on `auth.users` insert.

## 8. Sync Rules

Sync only runs when the user is signed in.

- **On sign-in:**
  1. Pull the user's `profiles` row.
  2. If it doesn't exist (first sign-in on this device), push local values up.
  3. If it exists, merge: `total_xp = max(local, cloud)`, same for `level`, `current_streak`, `longest_streak`, `games_played`. Username: cloud wins unless local was the default `BrainPlayer`.
  4. Save merged values to local. Push merged values to cloud.

- **After every completed game:** push the updated profile to cloud. Failures are silent and queued for retry on next foreground.

- **Never sync if anonymous.** All game data stays on-device.

- **Conflict policy:** numeric `max()` is intentional. It rewards the user across devices and never punishes offline play.

## 9. Auth Flow

- Anonymous by default. Sign-in is reachable from Profile and from the third onboarding screen (skippable).
- Sign-up creates `auth.users` row → trigger creates `profiles` row → app pulls and merges.
- Sign-out clears Supabase session. Local data remains; the user can keep playing.
- Password reset uses Supabase email link.
- We do not store passwords. We do not send analytics events tied to identity in v1.

## 10. Notifications

- `expo-notifications` schedules a daily local notification at the user's chosen time.
- On launch, check `lastPlayedDate` — if today, cancel today's notification.
- Default reminder time: 19:00 in the device's local timezone. User can disable in Profile → Settings.
- Permission requested with rationale on first reminder enable, not at app launch.

## 11. Production Polish Items

This list separates "scaffolded" from "ready to ship":

- Strip `App.tsx` to no-op or delete. Confirm `index.ts → expo-router/entry` is the only entry.
- Reanimated answer-tap (scale 0.95 + color shift), countdown rings, streak flame loop, XP-bar fill, confetti on level-up.
- Haptics: light on tap, medium on correct, heavy on streak milestone (every 5 streak).
- Audio: countdown tick on final 3s, ding on correct, low buzz on wrong, fanfare on game end. All gated by Settings toggle.
- Empty/error states: API failure → fallback questions silently; sync failure → small offline banner.
- Splash → home transition with brand mark.
- Pre-game asset prefetch: next round of questions fetched 1s after the current round starts.
- Status bar handled correctly behind safe-area on Android.
- Back-button behavior: in-game back press shows "Quit game?" confirm.

## 12. Frontend Design Treatment

The **frontend-design** skill will be invoked during Phase 3 to produce mockups for: Home, Play category grid, Question card (4 states), Recap, Profile. Direction:

- Editorial typography — Outfit Black for hero numbers, Outfit Bold for headings, Inter for body.
- Gradient surfaces over flat fills (the theme already defines them).
- Streak flame as recurring metaphor: lit when on streak, ember-state when at risk (last played > 20 hours ago).
- Motion as feedback, not decoration: every interactive element has a tactile micro-animation.
- Avoid the generic "Duolingo trivia" template aesthetic.

## 13. Testing Strategy

- Add `jest-expo` and `@testing-library/react-native` to devDependencies. Add `npm test` script.
- **Unit tests:**
  - `lib/trivia.ts`: scoring math across difficulties and times, XP curve, level math.
  - `lib/storage.ts`: streak rollover (consecutive day, gap day, future-clock), reminder scheduling math.
  - `lib/sync.ts`: merge rules across all numeric fields, username precedence.
- **Component tests:**
  - `AnswerButton` — idle/selected/correct/wrong visual states.
  - `QuestionCard` — answer selection callback, disabled state after answer.
- **Manual smoke matrix** before each release tag:
  1. Cold launch → onboarding → first game.
  2. Play game online (network-backed questions).
  3. Play game offline (fallback questions).
  4. Sign up new account, sign out, sign back in (data persists).
  5. Kill app mid-round, relaunch (no crash, game resets cleanly).
  6. Set device clock +1 day, play (streak +1).
  7. Set device clock +2 days, play (streak resets to 1).
  8. Toggle each Settings option and verify behavior.
  9. Schedule reminder, advance clock, verify notification fires.

## 14. Play Store Release Checklist

- **Build:** EAS Build (`eas init`, `eas build --platform android --profile production`) producing a signed `.aab` (App Bundle is required by Play Store).
- **Target:** API level 34 (Android 14), Play Store's current minimum target.
- **Versioning:** `versionCode` auto-bumped by EAS, `version` in `app.json` follows semver (start at 1.0.0).
- **Privacy policy:** hosted at a public URL (GitHub Pages from this repo's `docs/privacy-policy.md`).
- **Listing assets:** existing icon ✓, feature graphic 1024×500 (frontend-design generates), 4-8 phone screenshots at minimum 1080px on the long edge.
- **Data Safety form:** discloses optional email collection (auth) and that data is encrypted in transit and not shared with third parties.
- **Content rating:** Everyone (trivia is safe).
- **Listing copy:** short description ≤ 80 chars, full description ≤ 4000 chars, both written during Phase 6.
- **Closed/internal testing:** required by Play Store before production rollout — minimum 12 testers for 14 days as of recent policy. We'll plan internal testing in Phase 6.
- **Play Console paperwork:** owner creates the listing under their $25 Google Play developer account; agent produces all artifacts.

## 15. Phased Execution

Each phase is its own writing-plans plan, executed via executing-plans, isolated in a git worktree.

1. **Foundation** — Strip `App.tsx`, refine root layout and primitives, add `useUserStore` + `useSettingsStore`, finalize theme and typography. Add `jest-expo`.
2. **Game loop polish** — Build `QuestionCard`, `AnswerButton`, `TimerRing`, `XPBar`, `ConfettiBurst`. Wire animations, audio, haptics. Implement question prefetch.
3. **Home + Play + Profile screens** — Generate frontend-design mockups, then implement screens. Replace placeholder tabs.
4. **Auth + sync** — Wire Supabase auth (sign-up, sign-in, sign-out, reset). Implement `lib/sync.ts` with merge rules. Add OfflineBanner.
5. **Notifications + onboarding + tests** — `expo-notifications` daily reminder, 3-screen onboarding, full unit and component test suite.
6. **Play Store release** — EAS Build setup, privacy policy page, listing assets via frontend-design, internal testing track, AAB upload.

Skills used across phases:
- `superpowers:writing-plans` — to plan each phase.
- `superpowers:executing-plans` — to execute plans.
- `superpowers:using-git-worktrees` — to isolate phase work.
- `superpowers:test-driven-development` — for `lib/` modules with deterministic logic.
- `superpowers:systematic-debugging` — when bugs surface.
- `superpowers:verification-before-completion` — before each phase wrap-up.
- `frontend-design:frontend-design` — for screen mockups in Phase 3 and store assets in Phase 6.

## 16. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Supabase project not set up yet | Phase 4 includes step-by-step setup instructions for the user; agent verifies via test sign-in. |
| Open Trivia DB API rate limits or downtime | Existing fallback questions in `lib/trivia.ts` handle this; we expand the fallback bank to 30+ questions in Phase 2. |
| Play Store rejection (privacy policy, data safety) | Privacy policy drafted in Phase 6; data safety form completed before submission; closed testing track first. |
| Reanimated version compatibility on Android | `~3.16.1` is paired with Expo SDK 54; we'll lock and not upgrade mid-build. |
| AAB signing key loss | EAS managed credentials — Expo holds the keystore. We document the recovery path in Phase 6. |

## 17. Open Questions Resolved

- Backend: Supabase will be set up by user, guided by agent in Phase 4.
- Auth: optional email/password.
- Scope: trivia loop only, no leaderboard, no Habits, no in-app purchases in v1.
- Distribution: full Play Store submission.
