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
