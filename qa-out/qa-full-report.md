# BrainStreak QA Report — 2026-05-15

## Flows tested
- ✅ 1. Welcome → Username → Home — username displayed on Home after onboarding
- ❌ 2. Brain Rush — play through to game-over — XP did not increase (before=0, after=0)
- ✅ 3. Word Sprint — play to time-out — game-over shown, XP 0 → 0
- ✅ 4. Number Sense — tap choices through timer — game-over shown, XP 0 → 0
- ✅ 5. Memory Match — tap a wrong tile to end — Game Over shown, XP 0 → 0
- ✅ 6. Reaction Tap — tap dot, wait timer — game-over shown, XP 0 → 12
- ✅ 7. Road Rush — tap start, wait for crash/timeout — game-over shown, XP 0 → 11
- ❌ 8. Profile reflects XP + Recent Activity after a game — recent_games has data but home still shows "No rounds yet"
- ❌ 9. First Round badge unlocks after one game — achievements unlocked in storage (first-round) but no "Unlocked" rendered
- ❌ 10. Offline navigation — every screen renders — 0/9 screens rendered offline
- ✅ 11. Mobile viewport — iphone-se (375x667) — screenshots captured for iphone-se
- ✅ 11. Mobile viewport — ipad (810x1080) — screenshots captured for ipad
- ✅ 12. Rapid-click "Start today's game" 5 times — rapid clicks landed cleanly on /play
- ✅ 13. Hard refresh during Brain Rush — lands sensibly — landed at http://127.0.0.1:8090/play with content
- ✅ 14. Browser back during countdown — back returned to /play

## Screenshots
### 1. Welcome → Username → Home
- `01-welcome.png` — Welcome screen after clearing localStorage
- `02-username-empty.png` — Username screen
- `03-username-typed.png` — Username typed
- `04-home-after-onboarding.png` — URL: http://127.0.0.1:8090/
### 2. Brain Rush — play through to game-over
- `br-01-play.png` — Play tab
- `br-02-countdown.png` — Countdown after Start game
- `br-03-playing-q1.png` — Brain Rush playing Q1
- `br-04-gameover.png` — Brain Rush game-over recap
### 3. Word Sprint — play to time-out
- `ws-01-start.png` — Word Sprint initial render
- `ws-02-mid.png` — After some submissions
- `ws-03-gameover.png` — Word Sprint game-over
### 4. Number Sense — tap choices through timer
- `ns-01-start.png` — Number Sense start
- `ns-02-mid.png` — Mid-play
- `ns-03-gameover.png` — Number Sense game-over
### 5. Memory Match — tap a wrong tile to end
- `mm-01-start.png` — Memory Match start (showing sequence)
- `mm-02-input.png` — Memory Match input phase
- `mm-03-gameover.png` — Memory Match game-over
### 6. Reaction Tap — tap dot, wait timer
- `rt-01-start.png` — Reaction Tap field
- `rt-02-mid.png` — After tapping
- `rt-03-gameover.png` — Reaction Tap game-over
### 7. Road Rush — tap start, wait for crash/timeout
- `rr-01-idle.png` — Road Rush idle overlay
- `rr-02-playing.png` — Road Rush playing
- `rr-03-gameover.png` — Road Rush game-over (saw=1)
### 8. Profile reflects XP + Recent Activity after a game
- `pe-01-after-game.png` — Number Sense game-over
- `pe-02-profile.png` — Profile after first game
- `pe-03-home.png` — Home after first game
### 9. First Round badge unlocks after one game
- `ach-01-profile.png` — Profile badges after first game
### 10. Offline navigation — every screen renders
- `off-home.png` — Offline /
- `off-play.png` — Offline /play
- `off-profile.png` — Offline /profile
- `off-word-sprint.png` — Offline /game/word-sprint
- `off-number-sense.png` — Offline /game/number-sense
- `off-memory-match.png` — Offline /game/memory-match
- `off-reaction-tap.png` — Offline /game/reaction-tap
- `off-road-rush.png` — Offline /game/road-rush
- `off-settings-reminder.png` — Offline /settings/reminder
### 11. Mobile viewport — iphone-se (375x667)
- `vp-iphone-se-home.png` — iphone-se /
- `vp-iphone-se-play.png` — iphone-se /play
- `vp-iphone-se-profile.png` — iphone-se /profile
- `vp-iphone-se-word-sprint.png` — iphone-se /game/word-sprint
- `vp-iphone-se-road-rush.png` — iphone-se /game/road-rush
### 11. Mobile viewport — ipad (810x1080)
- `vp-ipad-home.png` — ipad /
- `vp-ipad-play.png` — ipad /play
- `vp-ipad-profile.png` — ipad /profile
- `vp-ipad-word-sprint.png` — ipad /game/word-sprint
- `vp-ipad-road-rush.png` — ipad /game/road-rush
### 12. Rapid-click "Start today's game" 5 times
- `rc-01-home.png` — Home
- `rc-02-after.png` — After rapid clicks
### 13. Hard refresh during Brain Rush — lands sensibly
- `rf-01-countdown.png` — Countdown
- `rf-02-q2.png` — At Q2
- `rf-03-after-reload.png` — After reload
### 14. Browser back during countdown
- `bk-01-countdown.png` — Countdown
- `bk-02-after-back.png` — After back
- `bk-03-settled.png` — Settled

## Console errors observed (excluding known Reanimated #418)
_(none beyond the known Reanimated #418)_

## Bugs found (severity-ordered)
### Critical / Important
- **2. Brain Rush — play through to game-over** — XP did not increase (before=0, after=0)
- **8. Profile reflects XP + Recent Activity after a game** — recent_games has data but home still shows "No rounds yet"
- **9. First Round badge unlocks after one game** — achievements unlocked in storage (first-round) but no "Unlocked" rendered
- **10. Offline navigation — every screen renders** — 0/9 screens rendered offline

## Mobile viewport issues
_(no overflow issues detected at 375 or 810 widths)_

## Verdict
**NOT READY** — 4 flows failed; significant breakage.