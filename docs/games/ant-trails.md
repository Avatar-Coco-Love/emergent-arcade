# Ant Trails: design notes

Current: **v1**. Mechanics: **trail** (drag) and **wash** (hold), sharing
**scent per ground cell** (40×60 grid, 10 px cells, 0–1). Win: 60 crumbs home
before sundown (90 s). Lose: sundown, colony below 8 ants, or the spider made
carriers drop so many crumbs that 60 is out of reach. 7 achievements (in
`games/games.json`).

## How the scent loop works

- Drawn trails set scent to 0.7 (brush half-width 9 px), paid from a gland
  meter. Carriers add 0.7/s to their cell as they walk home. Scent
  evaporates and diffuses; rain wipes it fast.
- Searching ants steer toward the strongest of 3 feelers, weighted toward
  the way out of the nest (`OUT_BIAS`), and go straight for food within
  `SMELL_R`. Carriers walk straight home (dead reckoning), so each busy route
  straightens itself into a highway.
- The spider steers by scent the same way and gets faster on strong scent
  (`SP_BASE + SP_SCENT·scent`). Soldiers keep it `NEST_GUARD` px from the nest.
  After eating an ant it pauses for `EAT_PAUSE` seconds.
- Input: moving more than 10 px before 150 ms is a trail. Holding still for
  150 ms starts rain, and the cloud then follows the pointer.

## Key constants (`games/ant-trails.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_ANTS / MIN_ANTS | 22 / 8 | GOAL / SUNDOWN / SPARE | 60 / 90 s / 20 s |
| HATCH_EVERY | 10 crumbs | ANT_SPEED | 36 |
| EVAP / DIFFUSE | 0.08 / 0.5 | CARRY_LAY / DRAW_SCENT | 0.7 / 0.7 |
| GLAND_MAX / INK_PX / GLAND_REGEN | 100 / 6 px / 7 per s | RAIN_R0→R1 / RAIN_WIPE | 22→48 / 7 |
| SMELL_R / PILE_R | 22 / 10 | FEEL_D / FEEL_A / OUT_BIAS | 11 / 0.55 / 0.6 |
| SP_BASE / SP_SCENT | 20 / 55 | SP_CATCH / EAT_PAUSE / NEST_GUARD | 8 / 1.5 s / 80 |

## Layout (400×600)

Nest (200, 555). Piles: near (315, 420) ×15, middle (85, 270) ×25, far
(300, 85) ×40. Near + middle is 40 crumbs, so every win needs the far pile.
Spider starts at (40, 60).

## Balance (v1, `node scripts/balance-ant-trails.mjs 300`, ±3 pts)

| Bot | @75 s | @90 s | @105 s | ants lost (median) | colony died |
|---|---|---|---|---|---|
| idle (no input) | 2% | 16% | 32% | 16 | 118/300 |
| trail (redraw nearest faded trail) | 30% | 50% | 63% | 14 | 102/300 |
| wash (trail + rain on spider near ants) | 43% | 63% | 77% | 7 | 40/300 |
| far (wash, far pile first) | 7% | 46% | 85% | 7 | 6/300 |

Trail beats idle by 34 pts and wash beats trail by 13 pts at 90 s, so both
mechanics count. Far-first is slower but much safer, and it earns Long Haul
63% of the time. Tuning path: 25 ants / `SMELL_R` 35 / `EVAP` 0.05 was far
too easy (idle won 42% at 90 s); 20 ants was too hard (trail 34%).

## Open ideas / known limits

- Not hand-played on a real phone yet (only rendered headlessly at 390×760).
- Idle still wins 16% by 90 s, because the ants' own trails recruit. Fine
  as emergence, but if players say it plays itself, lower `CARRY_LAY`.
- Bots almost never earn Decoy (2–13%). It needs deliberate play: draw a
  side trail away from the ants, then wash the main one.
- Proposal alternatives not built: pebble (tap to block), decoy crumb, a
  second spider at 45 s.

## History

- v1: first version.
