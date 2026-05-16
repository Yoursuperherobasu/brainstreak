# BrainStreak — Google Play Store Listing

Paste-ready copy for the Play Console. Field labels match what you'll see in the form.

---

## App name (max 30 chars)
```
BrainStreak
```

## Short description (max 80 chars)
```
Beat brain rot. Daily quizzes + 8 arcade brain games. Offline. No ads.
```

## Full description (max 4000 chars)
```
BrainStreak — beat brain rot. Five questions a day, eight arcade brain games, zero doomscroll.

A brain-training app that actually respects your time. No streaks-to-buy. No paywalls. No ads. No login. Open the app, play for 60 seconds, sharpen your focus, close the app, get on with your day.

★ BRAIN RUSH — your daily 5
A fast quiz mixing math, general knowledge, science, history, pop culture, and more. Five questions, 15 seconds each. Speed earns bonus points. Play daily to build your streak.

★ EIGHT ARCADE BRAIN GAMES
Each one is a quick hit, each one trains a different brain muscle:
• Word Sprint — unscramble or die trying
• Number Sense — math, but make it fast
• Memory Match — Simon says don't blink
• Reaction Tap — tap. faster. faster.
• Road Rush — dodge or eat curb
• Color Trap — your eyes will lie
• Odd One Out — spot the imposter
• Pattern Recall — memorize. repeat. flex.

★ STATS, NOT GUILT
Track your streak, total XP, level, personal bests, and per-category scores in a clean dashboard with charts. Watch yourself get sharper.

★ FULLY OFFLINE, FULLY PRIVATE
No account. No sign-in. No analytics. No tracking. We don't collect, store, or transmit any personal data. Everything lives on your device. Brain Rush mode and every mini-game work with zero internet connection.

★ DAILY REMINDER (OPTIONAL)
Pick a time in Settings and we'll tap your shoulder once a day. Turn it off anytime.

★ GEN-Z AESTHETIC
Warm cream paper, magenta-violet ink, tangerine accents. Smooth animations. Cartoon car for Road Rush — no boring boxes here.

Made for: students, knowledge workers, anyone who feels their attention span shrinking, anyone trying to swap five minutes of social media for five minutes of focus.

Free. No in-app purchases. No ads.

Privacy policy: <PASTE_PRIVACY_POLICY_URL_HERE>
Contact: flip2empower@gmail.com
```

---

## App category
- **Category:** Games
- **Sub-category:** Trivia (primary). Educational and Word are also acceptable secondary fits.

## Tags (search)
brain training, trivia, quiz, brain games, mental fitness, memory, focus, offline games, no ads

---

## Content rating questionnaire — paste-ready answers

When Play Console asks you these questions, answer:

| Question | Answer |
|---|---|
| Does your app contain violence? | **No** |
| Does your app contain sexual content or nudity? | **No** |
| Does your app contain profanity or crude humor? | **No** |
| Does your app contain drugs, alcohol, or tobacco references? | **No** |
| Does your app contain simulated gambling? | **No** |
| Does your app contain user-generated content or social features? | **No** |
| Does your app share user location? | **No** |
| Does your app allow users to interact or exchange content? | **No** |
| Does your app contain digital purchases? | **No** |
| Does your app target children? | **No** (general audience, suitable for all ages but not specifically directed at children) |

Expected rating: **IARC: 3+ (Everyone) / ESRB: Everyone / PEGI: 3**

---

## Data safety form — paste-ready answers

Play Console asks: "Does your app collect or share any of the required user data types?"

**Answer: No.**

If the form drills into specifics, all answers are **No / Not collected**:

| Data type | Collected? | Shared? |
|---|---|---|
| Name | No | No |
| Email | No | No |
| User ID | No | No |
| Address | No | No |
| Phone number | No | No |
| Race/ethnicity | No | No |
| Sexual orientation | No | No |
| Political/religious beliefs | No | No |
| App activity / interactions | **No** (stored locally only, never transmitted) | No |
| App performance / crash logs | No | No |
| Device or other IDs | No | No |
| Location (precise or coarse) | No | No |
| Financial info | No | No |
| Health and fitness | No | No |
| Messages | No | No |
| Photos or videos | No | No |
| Audio files | No | No |
| Files and docs | No | No |
| Calendar events | No | No |
| Contacts | No | No |
| Web browsing | No | No |

Also check:
- ✅ Data is encrypted in transit — **Yes** (only network calls are HTTPS to opentdb.com; no user data goes over the wire anyway).
- ✅ Users can request data deletion — **Yes** (in-app Settings → Reset progress, or uninstall).

---

## Target audience
- **Age groups:** 13+ (default for general-audience apps that aren't designed for children)
- **Reason:** App is suitable for all ages but is not specifically designed for children under 13. We do not collect data, so COPPA does not apply, but selecting 13+ avoids the children's section of Play and its extra disclosures.

---

## Ads
**Contains ads:** **No**

---

## In-app purchases
**Has in-app purchases:** **No**

---

## Government app
**No.**

---

## News app
**No.**

---

## Privacy policy URL
You need a public URL. Host `PRIVACY.md` from this repo on GitHub Pages:
1. Push this repo to GitHub.
2. In repo settings → Pages → Source: "Deploy from branch" → branch `main`, folder `/ (root)`.
3. Your privacy policy URL will be: `https://<your-github-username>.github.io/<repo-name>/PRIVACY`
   (GitHub renders `.md` as HTML automatically.)
4. Paste that URL in Play Console → App content → Privacy Policy.

---

## Required graphic assets

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit, no alpha | ✅ `assets/icon.png` (already at 1024×1024 — Play accepts and resizes) |
| Feature graphic | 1024×500 PNG, no transparency | ⚠️ **TO DO** — create at `assets/play-store/feature-graphic.png` |
| Phone screenshots | min 2, max 8 — 16:9 or 9:16, min 1080px on long side | ✅ Have 24 in `qa-out/v2-evidence/`; pick 4-6 best |
| 7-inch tablet screenshots | optional | Skip for now |
| 10-inch tablet screenshots | optional | Skip for now |
| Promo video | optional | Skip for v1 |

### Recommended phone screenshots (in order)
Use these specific files from `qa-out/v2-evidence/`:
1. Home with Brain Rush hero card
2. Brain Rush in-game (question with timer)
3. Stats page with charts
4. Road Rush gameplay (showing the car)
5. Memory Match grid
6. Odd One Out grid

---

## Pricing & distribution
- **Free:** Yes
- **Distribution:** Available in all countries (default)
- **Contains ads:** No
- **Content guidelines:** Acknowledged
- **US export laws:** Acknowledged

---

## Release notes (first release)
```
v1.0.0 — Hello world.
• Brain Rush daily quiz (math, GK, science, history, pop, more)
• 8 arcade brain games: Word Sprint, Number Sense, Memory Match,
  Reaction Tap, Road Rush, Color Trap, Odd One Out, Pattern Recall
• Streak tracking, XP, levels, personal bests
• Stats dashboard with charts
• Daily reminder (optional)
• Fully offline. No account. No ads.
```
