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
