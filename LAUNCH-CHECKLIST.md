# BrainStreak — Play Store Launch Checklist

End-to-end actions in the order you should do them.

---

## A. Tonight — 1 hour of work

### A1. Push the repo to GitHub
```bash
# from /Users/basusingh/Desktop/Mob_App
git remote -v   # check if you already have a remote
# if not:
gh repo create brainstreak --public --source=. --remote=origin --push
# or manually:
# git remote add origin git@github.com:<your-user>/brainstreak.git
# git push -u origin main
```

### A2. Enable GitHub Pages for the privacy policy
1. Open your repo on GitHub → **Settings** → **Pages**.
2. Under "Build and deployment", set:
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)**
3. Save. Wait 1-2 minutes.
4. Your privacy policy URL is: `https://<your-github-username>.github.io/brainstreak/PRIVACY`
5. Open it in a browser to confirm it loads.
6. Save this URL — you'll paste it into Play Console.

### A3. Build the production AAB
```bash
npx eas login        # sign in with your Expo account (free)
npx eas build:configure  # if not already configured; skip if it errors saying already done
npx eas build --platform android --profile production
```

- Takes 10-20 min on Expo's servers.
- First build asks if you want EAS to generate an Android Keystore — say **Yes**. EAS will manage it for you forever.
- When the build finishes, you'll get a download URL for `application-xxxx.aab`. Download it.

### A4. Create the feature graphic
You need a 1024×500 PNG. Quickest paths:
- Use Canva: search "Google Play Feature Graphic" template → swap in BrainStreak colors (`#FAF4E8` bg, `#7A3FF2` ink, "BrainStreak" in a chunky display font) → export as PNG.
- Or use Figma with the same dimensions.
- Save as `assets/play-store/feature-graphic.png`.

### A5. Pick 4-6 phone screenshots
From `qa-out/v2-evidence/`, pick the best mobile views. Recommended ordering (per `STORE-LISTING.md`):
1. Home with Brain Rush hero
2. Brain Rush in-game
3. Stats page
4. Road Rush gameplay
5. Memory Match
6. Odd One Out

Copy them to `assets/play-store/screenshots/`.

---

## B. Play Console — first creation (30 min)

After Google approves your $25 developer account:

### B1. Create the app
- All apps → Create app.
- App name: **BrainStreak**
- Default language: **English (United States)**
- App or game: **Game**
- Free or paid: **Free**
- Declarations: tick all three.
- → Create app.

### B2. Set up your app — fill these screens in order
Use `STORE-LISTING.md` as your source of truth for every text field.

1. **App access** → "All functionality is available without special access" (true — no login).
2. **Ads** → "No, my app does not contain ads".
3. **Content rating** → fill the questionnaire using the answers in `STORE-LISTING.md` § Content rating.
4. **Target audience** → 13+ (per `STORE-LISTING.md` § Target audience).
5. **News app** → No.
6. **COVID-19 contact tracing** → No.
7. **Data safety** → fill using the answers in `STORE-LISTING.md` § Data safety.
8. **Government app** → No.
9. **Financial features** → No.
10. **Health features** → No.

### B3. Main store listing
Paste from `STORE-LISTING.md`:
- App name
- Short description
- Full description
- App icon (upload `assets/icon.png`)
- Feature graphic (upload from A4)
- Phone screenshots (upload from A5)
- Privacy policy URL (from A2)
- Email: **flip2empower@gmail.com**
- Phone: (optional, leave blank)
- Website: (optional, your GitHub Pages root works)

### B4. App category & tags
- Category: **Trivia**
- Tags: paste from `STORE-LISTING.md` § Tags.

---

## C. Closed Testing (mandatory for personal accounts created after Nov 13, 2023)

You **cannot** go straight to Production. Google requires 12 testers × 14 consecutive days before granting production access.

### C1. Create a closed track
- Release → Testing → **Closed testing** → Create track.
- Track name: "Beta" or "Friends and family" — anything.
- → Create.

### C2. Upload your AAB
- In the new track → "Create new release" → upload the `application-xxxx.aab` from A3.
- Release name: `1.0.0` (auto-filled).
- Release notes: paste from `STORE-LISTING.md` § Release notes.
- Save → Review release → Start rollout to internal testing.

### C3. Add testers
- Track → Testers tab.
- Either:
  - Create an **email list** of 12+ tester emails (their Google Play account emails), OR
  - Create a **Google Group** and add it.
- Save.
- Share the opt-in URL (shown on the same screen) with your testers. They must click it on their Android phone and accept.

### C4. Wait 14 days
- The 14 days only start counting once you have **12 opted-in testers**.
- Encourage testers to actually open the app — Google scores "engaged testers", not just opt-ins.
- During this period: fix any bugs they find, push updates to the closed track (each update keeps the existing 14-day clock — it doesn't reset).

### C5. Apply for production access
- After 14 days with 12 active testers: Release → Testing → **Apply for production access**.
- Google reviews this in 1-7 days.

### C6. Promote to production
Once approved:
- Closed testing track → "Promote release" → Production.
- Or: Release → Production → Create new release → reuse the AAB.
- Submit for review. Google takes 1-7 days for a first review.

---

## D. After live

- **Monitor**: Play Console → Statistics → Installs, ratings, crashes.
- **Crash-free target**: > 99% in the first month.
- **Respond to reviews**: courteous, fast, honest. Don't ignore 1-stars.
- **First update**: aim for ~2 weeks after launch. Even small (typo fix, one new question) keeps the listing fresh in Play's ranking signals.

---

## E. Optional but recommended

- **Make the listing localized later**: even one extra language doubles your reach.
- **Add a short demo video**: a 30-second screen recording posted on YouTube and linked in the listing significantly lifts install rate.
- **Cross-post**: ProductHunt launch, an r/AndroidApps post, an Indie Hackers blurb. Free, takes an hour, surfaces 1k-5k installs in week 1 for a well-designed game.

---

## F. Things that might trip you up

- **Closed test "14 days" pause**: if you drop below 12 opted-in testers at any point, the clock pauses (does not reset). Stay above 12 the whole time.
- **`SCHEDULE_EXACT_ALARM` permission**: Google requires justification for this. In Play Console → App content → permissions justification, explain: "Used to schedule the user-configured daily reminder notification at the exact time the user selected. Used only if the user enables the reminder."
- **Target API level**: by Aug 31, 2026, all new apps must target Android 16 (API 36). Expo SDK 54 (your version) currently targets API 35. You're fine for now, but plan an Expo SDK bump before that date.
- **Version bumps**: every new build needs a new `versionCode` (integer). `eas.json` has `autoIncrement: true` for production, so EAS handles it.

---

## G. Quick reference paths

- Privacy policy: `/Users/basusingh/Desktop/Mob_App/PRIVACY.md`
- Store listing copy: `/Users/basusingh/Desktop/Mob_App/STORE-LISTING.md`
- Production QA report: `/Users/basusingh/Desktop/Mob_App/qa-out/PRODUCTION-VERDICT.md`
- Screenshots: `/Users/basusingh/Desktop/Mob_App/qa-out/v2-evidence/`
- EAS build config: `/Users/basusingh/Desktop/Mob_App/eas.json`
- Android config: `/Users/basusingh/Desktop/Mob_App/app.json` (android section)
