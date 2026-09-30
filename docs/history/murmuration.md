# Murmuration: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/murmuration.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## Revision history

- v1 (PR #8): first version. v2 (PR #9): dusk timer, organic flocking,
  startle rebalance. v3 (PR #10): gate 4 into open sky, dusk 70 → 60 s.
- v4: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry. Bot numbers above still apply; compare humans with
  `node scripts/fetch-telemetry.mjs --game murmuration` (see `docs/telemetry.md`).

## Gate 4 (v3 change)

Gate 4 was 90, 390 at 90°, hugging the left edge; v3 moved it to 230, 440 at 0°.

Gate 4 spots tried (win @50 s, lure80 vs smart90): (200,420) flat 70/80;
(200,400) 90° 65/72–79; (180,380) 60° 68/77; (160,430) 20° 66/80;
(230,440) flat 66/81 (chosen).

## Balance notes (v3)

Startle edge over best lure-only: +10 pts at 60 s, +15 at 50 s (v2: +7 / +11).
Median s/gate, lure80 vs smart90: 3.9/3.6, 4.7/4.5, 6.0/6.1, 7.1/6.2, 6.8/6.5.
Almost every loss at 60 s is nightfall (scattered: 6/300 lure80, 1/300 smart90).

## Notes before the split (2026-09-30)

Original header: "Current: **v3** (PR #10). Mechanics: **lure** (hold) and
**startle** (tap), sharing **fear per bird**. Win: 15+ birds through each of 5
gates, in order, within `GATE_WINDOW` s of each other, before night (`DUSK`).
Lose: night falls, or the flock drops below 15. 7 achievements (in
`games/games.json`); Swift = finish with `SPARE` s of light left."
