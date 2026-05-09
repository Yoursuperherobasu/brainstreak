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
