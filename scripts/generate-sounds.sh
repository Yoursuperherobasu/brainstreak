#!/usr/bin/env bash
# Generate the 7 BrainStreak sound effects via ffmpeg sine/sawtooth synthesis.
# Reproducible, CC0, license-clean. Run from the repo root: bash scripts/generate-sounds.sh
set -euo pipefail

OUT="assets/sounds"
mkdir -p "$OUT"

ENC="-ac 1 -ar 22050 -b:a 64k"

# tap.mp3 — quick 440Hz square pop, 60ms with fade in/out.
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=0.06" \
  -af "afade=t=in:d=0.003,afade=t=out:st=0.05:d=0.01,volume=0.35" \
  $ENC "$OUT/tap.mp3"

# select.mp3 — rising chirp 620→820Hz, ~180ms total.
ffmpeg -y -f lavfi -i "sine=frequency=620:duration=0.08" -f lavfi -i "sine=frequency=820:duration=0.1" \
  -filter_complex "[0:a]afade=t=out:st=0.07:d=0.01[a];[1:a]afade=t=in:d=0.005,afade=t=out:st=0.09:d=0.01[b];[a][b]concat=n=2:v=0:a=1,volume=0.35" \
  $ENC "$OUT/select.mp3"

# tick.mp3 — sharp 1100Hz click, 35ms.
ffmpeg -y -f lavfi -i "sine=frequency=1100:duration=0.035" \
  -af "afade=t=in:d=0.003,afade=t=out:st=0.025:d=0.01,volume=0.4" \
  $ENC "$OUT/tick.mp3"

# correct.mp3 — ascending C5(523)→E5(659)→G5(784) triad, 420ms.
ffmpeg -y \
  -f lavfi -i "sine=frequency=523:duration=0.12" \
  -f lavfi -i "sine=frequency=659:duration=0.12" \
  -f lavfi -i "sine=frequency=784:duration=0.18" \
  -filter_complex "[0:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[a]; \
                   [1:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[b]; \
                   [2:a]afade=t=in:d=0.005,afade=t=out:st=0.17:d=0.01[c]; \
                   [a][b][c]concat=n=3:v=0:a=1,volume=0.4" \
  $ENC "$OUT/correct.mp3"

# wrong.mp3 — descending sawtooth 320→180Hz, 330ms.
ffmpeg -y \
  -f lavfi -i "aevalsrc=0.4*sin(2*PI*320*t)*exp(-3*t):s=22050:d=0.11" \
  -f lavfi -i "aevalsrc=0.4*sin(2*PI*180*t)*exp(-3*t):s=22050:d=0.22" \
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,volume=0.5" \
  $ENC "$OUT/wrong.mp3"

# levelup.mp3 — triumphant ascending C5→E5→G5→C6, 700ms.
ffmpeg -y \
  -f lavfi -i "sine=frequency=523:duration=0.12" \
  -f lavfi -i "sine=frequency=659:duration=0.12" \
  -f lavfi -i "sine=frequency=784:duration=0.14" \
  -f lavfi -i "sine=frequency=1046:duration=0.32" \
  -filter_complex "[0:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[a]; \
                   [1:a]afade=t=in:d=0.005,afade=t=out:st=0.11:d=0.01[b]; \
                   [2:a]afade=t=in:d=0.005,afade=t=out:st=0.13:d=0.01[c]; \
                   [3:a]afade=t=in:d=0.005,afade=t=out:st=0.30:d=0.02[d]; \
                   [a][b][c][d]concat=n=4:v=0:a=1,volume=0.45" \
  $ENC "$OUT/levelup.mp3"

# crash.mp3 — low decaying sawtooth 180→90Hz, 340ms.
ffmpeg -y \
  -f lavfi -i "aevalsrc=0.5*sin(2*PI*180*t)*exp(-2.5*t):s=22050:d=0.12" \
  -f lavfi -i "aevalsrc=0.5*sin(2*PI*90*t)*exp(-2.5*t):s=22050:d=0.22" \
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,volume=0.5" \
  $ENC "$OUT/crash.mp3"

echo "Generated 7 sound files in $OUT"
ls -lh "$OUT"
