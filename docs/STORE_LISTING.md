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
- Clean light UI with soft ambient animations.

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
