# Hourglass Delivery: design notes

Current: **v1**. Mechanics: **pour** (hold) and **knock** (flick), sharing
the **sand grid** (100×150 cells, 4 px each: empty, loose, packed, wall).
Win: 8 hourglasses cross the belt and at least 6 leave filled to their
line. Lose: the 3rd empty glass (the round ends at once). 6 achievements
(in `games/games.json`).

## How the sand works

- Falling sand: each step, from the bottom row up (alternating scan
  direction per row), a grain falls up to `vy` cells (`vy` grows by `GRAV`
  per step up to `VMAX`). If it can't fall, a **loose** grain slides
  diagonally down (the side it's being shoved first, else random). A
  diagonal slide needs the side cell free too, so grains can't squeeze
  through corners.
- Packing: a grain that sits still for `PACK_T` becomes **packed** (drawn
  darker). Packed grains never slide diagonally, so piles keep their shape,
  but they still fall if the cell below empties.
- Knock: every grain within `KNOCK_R` of where the flick started turns
  loose and gets sideways speed `vx = dx · KNOCK_V` (±20%); a mostly
  vertical flick scatters them both ways. Resting grains lose `KNOCK_FRICT`
  of `vx` per step. A shoved grain blocked by sand passes `PUSH_KEEP` of its
  push on (and loosens it), so a knock runs through a whole pile. A moving
  shoved grain also loosens packed neighbors with chance `AVAL_P`.
  Cooldown `KNOCK_COOL`, only if something moved.
- Air drag: a falling shoved grain drifts one cell sideways per step and
  keeps `AIR_DRAG` of its `vx`. Without this (first build), knocked sand
  landed 30–60 px past the ledge end, missed the glasses and both-together
  won only 16–41%. With it, a knocked pile drops just off the ledge end.
- Pour: while held, `POUR_RATE` grains/s appear on the top row at the
  spout x ±1 cell, from a `HOPPER`-grain hopper.
- Glasses: a grain crossing `MOUTH_ROW` within `MOUTH_HW` of a glass's
  center lands in it (up to `CAP`; beyond that it's spilled and the glass
  is marked overflowed). Grains reaching `BELT_ROW` elsewhere are spilled.
  A glass counts as filled at `LINE` grains, judged when it leaves the
  right edge.
- Gesture: moving `FLICK_PX` (game units) within `FLICK_MS` is a flick,
  knocking at the press point in the swipe direction. Otherwise pouring
  starts at `FLICK_MS` and the spout follows the pointer's x. Only the first
  pointer counts.

## Key constants (`games/hourglass-delivery.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| GRAV / VMAX | 0.08 / 3 cells per step | PACK_T | 1.5 s |
| HOPPER / POUR_RATE | 2000 / 60 per s | KNOCK_R / KNOCK_COOL | 24 px / 0.8 s |
| KNOCK_V / KNOCK_FRICT | 2.5 / 0.08 per step | PUSH_KEEP / AVAL_P / AIR_DRAG | 0.9 / 0.3 / 0.75 |
| LEDGE_ROWS | [50, 108] ±2 | LEDGE_MIN–MAX / GAP_MIN–MAX | 12–24 / 10–20 cells |
| PEGS / DUNES × DUNE_N | 6 / 3 × 80 grains | MOUTH_ROW / BELT_ROW | 125 / 140 (y 500 / 560) |
| MOUTH_HW / BELT_V | 16 px / 40 px/s | GLASSES / FIRST / SPACING | 8 / 6 s / 8 s |
| LINE / CAP / LOSE_AT | 120 / 150 / 3 | FLICK_PX / FLICK_MS | 25 / 180 ms |
| SLIDE_N / STOCK_N | 60 / 400 | CLEAN_MAX / BRIM_TOL | 15% / 10 |

A round lasts about 73 s (last glass enters at 62 s and takes 11 s to
cross). A glass passes under a fixed spout in about a second (~50 grains),
so pouring alone means sliding the spout along with it through the gaps.
A knocked pile drops 20–60 grains into it at once.

## Layout (400×600)

Seeded at random each round: an upper row of ledges (y ≈ 200) and a
lower row of "shelves" (y ≈ 432), 2 cells thick, plus 6 2×2 pegs
between them. Three ledges start with packed dunes of 80 grains. The glass
mouths are at y 500, the belt at y 560. Hopper gauge top-left, order dots
top-right (gold filled, red missed).

## Balance (v1, `node scripts/balance-hourglass-delivery.mjs 300`, ±3 pts)

| Bot | Win | 8/8 | Median filled | Median poured / spilled |
|---|---|---|---|---|
| idle (no input) | 0% | 0% | 0 | 0 / 0 |
| pour (pour down a clear column onto where the next glass will be) | 23% | 19% | 0 | 389 / 0 |
| knock (knock the starting dunes off a ledge end onto a passing glass) | 0% | 0% | 0 | 0 / 38 |
| both (knock piles onto glasses, pour direct, restock the shelves in between) | 70% | 43% | 7 | 1548 / 390 |

Pour-only is bimodal: it wins (usually 8/8) when the level happens to have
a clear column from top to belt, and fills nothing otherwise, because it
never pours onto ledges. Humans who learn where ledge overflow lands will
do better than this bot.

Achievement rates (both bot): First Delivery 98%, Steady Hand 53%, Full
Order 43%, Stockpiler 22%, Landslide 12%, Not a Grain Wasted 3% (pour bot
22%: it only pours straight into glasses).

Tuning path:
- 5 ledge rows, then 3: almost no clear columns, so pour-only won 0–10%
  and both-together about 15%. Two rows opened the field.
- Knocks first moved only the grains inside the radius (the rest of the
  packed pile blocked them). `PUSH_KEEP` made the push run through the pile.
- Air drag (see above) was the big one: both 41% → 83% at 80 runs.
- Landslide at 120 and then 80 grains never happened for bots; 60 gives
  12–18%.

## Open ideas / known limits

- Playtest link (private artifact, republished on each push):
  https://claude.ai/artifact/UZTvK3z1uFsWPHVTETrCmx
- Stockpiler counts all packed grains, including the starting dunes (240).
- Not a Grain Wasted counts spilled starting-dune sand against your
  poured total.
- The top half of the screen is mostly open (one ledge row); a third row
  made pouring too blind. Possible v2: a few funnels or angled deflectors
  up there instead.
- Possible v2: a flip animation for delivered hourglasses, a pour-rate
  boost for holding longer, or a fixed hand-made layout.

## History

- v1: first version.
- v2: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry. Bot numbers above still apply; compare humans with
  `node scripts/fetch-telemetry.mjs --game hourglass-delivery` (see `docs/telemetry.md`).
