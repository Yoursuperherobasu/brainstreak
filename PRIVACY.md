# Privacy Policy

**Last updated:** May 16, 2026
**App:** BrainStreak
**Developer:** BrainStreak
**Contact:** flip2empower@gmail.com

This privacy policy describes how BrainStreak ("the app", "we", "our") handles information when you use the BrainStreak mobile application on Android.

## TL;DR — what data we collect

**None.** BrainStreak does not collect, store, sell, share, or transmit any personal information about you. There is no account. There is no login. There is no analytics SDK. We do not know who you are and we do not want to.

## How the app works

BrainStreak is a brain-training game that runs entirely on your device. Everything you do in the app — your username, XP, level, streak, games played, recent activity, settings — is stored **locally on your device only**, using Android's standard on-device storage (AsyncStorage).

We do not have a server that holds your data. We do not have an account system. If you uninstall the app, your data is gone forever, because it only ever lived on your phone.

## What we do NOT do

- We do **not** collect your name, email, phone number, address, or any other personal identifier.
- We do **not** use Google Analytics, Firebase Analytics, Facebook SDK, Mixpanel, Amplitude, or any other analytics or advertising SDK.
- We do **not** show advertisements.
- We do **not** sell or share any data with any third party (because we don't have any to share).
- We do **not** track your location.
- We do **not** access your contacts, photos, microphone, or camera.
- We do **not** require you to create an account.

## Network usage

BrainStreak is designed to work fully offline. The "Brain Rush" mode and all eight mini-games run 100% on your device with zero network access.

The only network requests the app may make are:

- **Optional trivia fetches** to the public Open Trivia Database (`opentdb.com`) when you select a non-Brain-Rush trivia category (Mixed, Science, History, Tech, Pop, Geography). These requests fetch general-knowledge questions only. They contain **no personal data** — only the requested category, count, and difficulty. The questions you receive are not personalized. Open Trivia Database is a free public API; their policies are at https://opentdb.com.

If you never select a non-Brain-Rush category, the app never connects to the internet.

## Permissions the app requests

| Permission | Why we need it |
|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | To fetch trivia questions from Open Trivia Database when you select a non-Brain-Rush category. Used only when you initiate that action. |
| `VIBRATE` | To provide haptic feedback when you tap buttons in the game. |
| `POST_NOTIFICATIONS` | To send you an optional daily reminder to play (only if you turn the reminder on in Settings). Notifications are scheduled locally on your device. No notification is ever sent from a server. |
| `SCHEDULE_EXACT_ALARM` | To schedule the optional daily reminder at the exact time you choose. Used only if you enable the reminder. |

You can revoke any of these permissions at any time in your phone's Settings → Apps → BrainStreak → Permissions. The app will keep working; only the corresponding feature (haptics, daily reminder, online trivia fetch) will be disabled.

## Children's privacy

BrainStreak is suitable for general audiences and contains no objectionable content. It is not specifically directed at children under 13. Because we collect no personal information from anyone, we collect no personal information from children. We do not knowingly collect data from any user of any age, and we cannot — there is no mechanism in the app to send data off the device.

## Data deletion

Because all your data lives only on your device, you can delete all of it at any time by either:

1. Tapping "Reset progress" in the app's Settings screen, or
2. Uninstalling the app from your phone.

There is no server-side data to delete because there is no server.

## Changes to this policy

If we ever change how the app handles data (for example, if a future version adds an optional cloud sync feature), we will update this policy and the "Last updated" date at the top. Any new data-collection feature will be optional and clearly described to you before you opt in.

## Contact

Questions, concerns, or feedback about privacy:
**flip2empower@gmail.com**

## Jurisdiction

We aim to comply with the GDPR (EU), CCPA (California), and Google Play's User Data policy. Because we collect no personal data, most of these obligations do not apply in the first place — but we honor the spirit of them: data minimization, transparency, and user control.
