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
