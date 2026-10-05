# Murmuration: design notes

**v4** (2026-09-27) · playtest: none · balance: `node scripts/balance-murmuration.mjs 300`
**Lure** (hold) and **startle** (tap), sharing **fear per bird**. v4 = v3 gameplay
(PR #10) plus `arcade:result` telemetry.

## How it works

Win: 15+ birds through each of 5 gates, in order, within `GATE_WINDOW` s of each
other, before night (`DUSK`). Lose: night falls, or the flock drops below 15.
7 achievements (in `games/games.json`); Swift = finish with `SPARE` s of light left.

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

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v4: 2 rounds (two sessions), **both lost at 60 s** (nightfall). Bots at
60 s: lure80 79%, smart90 89%, even lure60 47%. So the tester was slower
than the weakest bot twice, and 2 achievements so far. The second
biggest gap after Hot Iron. No feedback text, so we don't know whether it
was steering or the gate order. Candidate for a later revision: a longer
dusk for the first round, or check what share of gates the tester reached
(needs a `gates` field in `arcade:result`, not recorded now).

## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): no keyboard play; ignores reduced motion; level counter 10 px at 3.5:1; canvas `role="img"`.
- Skilled startle play finishes only ~4–5 s sooner than skilled lure play.
  Tapping nearer gates, tapping more often, or leading further after a tap
  all tied or lost. Gate 3 gains nothing from startle.
- The lever: after a tap, scared birds ignore the lure for several seconds
  while fear decays (`FEAR_DECAY`, the lure/fear cutoff). Next revision
  should try letting mildly scared birds still follow the lure.
- Not yet hand-played on a phone (only rendered headlessly at 390×760).

History (older versions, balance tables, playtests): `docs/history/murmuration.md`
