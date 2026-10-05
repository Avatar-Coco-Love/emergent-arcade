# Murmuration: design notes

**v6** (2026-10-05, accessibility: keys, live region, readable count, reduced motion; v5 canvas label) · playtest: https://claude.ai/artifact/WM5YoxYKzykKTMw9nFuLQm · balance: `node scripts/balance-murmuration.mjs 300`
**Lure** (hold) and **startle** (tap), sharing **fear per bird**. v4 = v3 gameplay
(PR #10) plus `arcade:result` telemetry.

## How it works

Win: 15+ birds through each of 5 gates, in order, within `GATE_WINDOW` s of each
other, before night (`DUSK`). Lose: night falls, or the flock drops below 15.
7 achievements (in `games/games.json`); Swift = finish with `SPARE` s of light left.

## Accessibility (v6, `node scripts/a11y-audit.mjs murmuration`: 5 pass, motion partial by design, 3/3 runs)

- Gate count `n/15` from `fs(12)` (≥ 12.5 CSS px; 15 sky units at 360 px
  wide, was 10.2 px) on a dark backing (`rgba(13,11,22,0.85)`): lowest
  text 7.5:1 (was 3.5:1, white on the sunset sky). `#msg` on the same
  backing. Colour passes early and at dusk (51 s), cursor and lure showing.
- Keys (`// § keys`): arrows move a cursor while held (110 → 260 sky
  units/s over 0.6 s: slow to aim a startle, faster than a calm bird's 100
  to get ahead of the flock), hold Space lures toward it (key up = finger
  up), Enter or X startles at it, Enter after a round flies again. Same
  `lure` / `startle()` as the pointer. The cursor (dashed ring = startle
  reach) starts at 170, 430, clear of the flock: on the flock's edge,
  Space at once spooked it. Tab free; Space/Enter on a focused button
  press the button. A pointer press hides the cursor.
- Live region `#say` (hidden; `#msg` is `aria-hidden`, its text goes
  through `say()`): gate cleared with how many birds and gates left, flock
  size once a loss has held 1 s (adds "a gate needs 15" under 20), 30/15/5
  s of light, the result. Written once a frame from state, not from
  `step()` (one capture: `lastClear`).
- Reduced motion: read; the lure stops pulsing, the startle ring shows its
  reach and fades without spreading. Motion stays **partial**: with birds
  hidden the idle diff is 0.00%, so all of it (~0.9%) is the flock, which
  is the game (findings, "When the simulation is the motion…").
- Balance bots reproduce v5 exactly (no render `Math.random`); keys-only
  bot (cursor + Space, one X) cleared 1–2 gates in 4/4 runs.

## Key constants (`games/murmuration.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_BIRDS | 40 | GATE_NEED / GATE_WINDOW / GATE_HALF | 15 / 4 s / 55 |
| DUSK | 60 s | SPARE | 15 s |
| FEAR_DECAY | 0.12/s | CONTAGION / CONTAGION_KEEP | 4.0 / 0.85 |
| PANIC / SCARED | 0.75 / 0.25 | CROWD_R / CROWD_N / CROWD_FEAR | 12 / 5 / 0.1 |
| LURE_ACCEL / LURE_R / LURE_FULL | 160 / 150 / 90 | LURE_SPOOK_R / LURE_SPOOK | 30 / 0.9 |
| STARTLE_R / _FEAR / _PUSH | 70 / 0.6 / 330 | MIN_SPEED / CALM_MAX / PANIC_EXTRA | 45 / 100 / 140 |

Grep `const [A-Z_]* = ` for the rest (flocking, edges, input timing).

## Gates (400×600 sky; angle of the line between the posts)

| # | x, y | angle |
|---|---|---|
| 1 | 95, 400 | 60° |
| 2 | 300, 280 | 60° |
| 3 | 120, 170 | 0° |
| 4 | 230, 440 | 0° |
| 5 | 290, 110 | 30° |

## Balance (v3 gameplay, 300 seeds, ±3 pts)

| Bot | win @50 s | @60 s | @70 s |
|---|---|---|---|
| lure60 (brief's close leader) | – | 47% | 60% |
| lure80 (best lure-only) | 66% | 79% | 86% |
| rear100 (naive rear taps) | – | 84% | 88% |
| smart90 (smart startle, ~4 taps) | 81% | 89% | 94% |

Compare humans with `node scripts/fetch-telemetry.mjs --game murmuration`
(`docs/telemetry.md`).

## Player data (`fetch-telemetry.mjs`)

2026-10-05: v4 7 players, 14 rounds, 36% won (win median 33 s); v5 3
players, 4 rounds, 25%. Bots at 60 s: 47–89%. Still below every bot.

2026-09-28 (one tester, touch):

v4: 2 rounds (two sessions), **both lost at 60 s** (nightfall). Bots at
60 s: lure80 79%, smart90 89%, even lure60 47%. So the tester was slower
than the weakest bot twice, and 2 achievements so far. The second
biggest gap after Hot Iron. No feedback text, so we don't know whether it
was steering or the gate order. Candidate for a later revision: a longer
dusk for the first round, or check what share of gates the tester reached
(needs a `gates` field in `arcade:result`, not recorded now).

## Open ideas / known limits

- Accessibility: done in v6 except motion (the flock). A keyboard player
  can't see where the next gate is relative to the cursor by ear; a
  "next gate up and left" line on demand (e.g. G) would help.
- Skilled startle play finishes only ~4–5 s sooner than skilled lure play.
  Tapping nearer gates, tapping more often, or leading further after a tap
  all tied or lost. Gate 3 gains nothing from startle.
- The lever: after a tap, scared birds ignore the lure for several seconds
  while fear decays (`FEAR_DECAY`, the lure/fear cutoff). Next revision
  should try letting mildly scared birds still follow the lure.
- Not yet hand-played on a phone (only rendered headlessly at 390×760).

History (older versions, balance tables, playtests): `docs/history/murmuration.md`
