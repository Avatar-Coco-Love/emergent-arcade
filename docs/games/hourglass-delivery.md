# Hourglass Delivery: design notes

**v3** (2026-09-29) · playtest: https://claude.ai/artifact/UZTvK3z1uFsWPHVTETrCmx (private, republished each push) ·
balance: `node scripts/balance-hourglass-delivery.mjs 300`
Verbs: **pour** (hold) and **knock** (flick), sharing the **sand grid**
(100×150 cells, 4 px each: empty, loose, packed, wall). Win: 8 hourglasses
cross the belt, at least 6 filled to their line. Lose: the 3rd empty glass
(round ends at once). 6 achievements (in `games/games.json`).

## How it works

- Falling sand: each step, bottom row up (alternating scan direction per
  row), a grain falls up to `vy` cells (`vy` grows by `GRAV` per step up to
  `VMAX`). If it can't fall, a **loose** grain slides diagonally down (the
  side it's being shoved first, else random); the side cell must be free too,
  so grains can't squeeze through corners.
- Packing: a grain still for `PACK_T` becomes **packed** (darker). Packed
  grains never slide diagonally but still fall if the cell below empties.
- Knock: every grain within `KNOCK_R` of the flick start turns loose with
  sideways speed `vx = dx · KNOCK_V` (±20%); a mostly vertical flick scatters
  both ways. Resting grains lose `KNOCK_FRICT` of `vx` per step. A shoved
  grain blocked by sand passes `PUSH_KEEP` of its push on (and loosens it),
  so a knock runs through a pile. A moving shoved grain also loosens packed
  neighbors with chance `AVAL_P`. Cooldown `KNOCK_COOL`, only if something moved.
- Air drag: a falling shoved grain drifts one cell sideways per step and
  keeps `AIR_DRAG` of its `vx`, so a knocked pile drops just off the ledge end.
- Pour: while held, `POUR_RATE` grains/s appear on the top row at spout x ±1
  cell, from a `HOPPER`-grain hopper.
- Glasses: a grain crossing `MOUTH_ROW` within `MOUTH_HW` of a glass's
  center lands in it (up to `CAP`; beyond that spilled, glass marked
  overflowed). Grains reaching `BELT_ROW` elsewhere are spilled. A glass
  counts as filled at `LINE` grains, judged when it leaves the right edge.
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

## Balance (`node scripts/balance-hourglass-delivery.mjs 300`, ±3 pts)

| Bot | Win | 8/8 | Median filled | Median poured / spilled |
|---|---|---|---|---|
| idle (no input) | 0% | 0% | 0 | 0 / 0 |
| pour (pour down a clear column onto where the next glass will be) | 23% | 19% | 0 | 389 / 0 |
| knock (knock the starting dunes off a ledge end onto a passing glass) | 0% | 0% | 0 | 0 / 38 |
| both (knock piles onto glasses, pour direct, restock the shelves in between) | 70% | 43% | 7 | 1548 / 390 |
Pour-only is bimodal: wins (usually 8/8) when the level has a clear column
from top to belt, fills nothing otherwise (it never pours onto ledges).
Humans who learn where ledge overflow lands should do better.
Achievement rates (both bot): First Delivery 98%, Steady Hand 53%, Full
Order 43%, Stockpiler 22%, Landslide 12%, Not a Grain Wasted 3% (pour bot
22%: it only pours straight into glasses).

## Telemetry (v3)

Each `arcade:result` also carries (see `docs/telemetry.md`):

- `reason` on a loss (always the 3rd empty glass; it says why they were
  empty): `idle` (never poured or knocked), `hopper` (the hopper ran dry),
  `empty` (otherwise).
- `stats`: `filled`, `missed`, `caught` (grains that landed in any glass),
  `knocked_in` (of those, grains moved by a knock), `best` (most grains in
  one glass that left), `poured`, `spilled`, `hopper` (grains left),
  `pour_s` (seconds pouring), `knocks` (flicks that moved sand), `whiffs`
  (flicks that hit nothing), `clear_cols` (grid columns with no ledge or peg
  from top to belt: the pour bot only wins when there is one),
  `first_input` (seconds to the first pour or knock, −1 if none).
Pouring alone drains the hopper about as fast as the glasses arrive (60
grains/s against a 2000-grain hopper), so watch the `hopper` reason.

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v2: 1 round, **lost in 33 s** (3rd empty glass), 0 achievements: not a
single glass filled, like the pour bot on a blocked level. 33 s is the
earliest a round can end (3rd glass arrives at 22 s, ~11 s to cross). A
browser check pouring continuously while sweeping emptied the hopper to 70
grains in 32 s, caught 119 grains in total, filled nothing (best glass 86 of
120). The bot table has no round length; add one to the balance script so
losses can be compared.

## Open ideas / known limits

- Stockpiler counts all packed grains, including the starting dunes (240).
- Not a Grain Wasted counts spilled starting-dune sand against your poured total.
- The top half of the screen is mostly open (one ledge row); a third row
  made pouring too blind. Possible v2: a few funnels or angled deflectors.
- Possible v2: a flip animation for delivered hourglasses, a pour-rate boost
  for holding longer, or a fixed hand-made layout.

History (older versions, balance tables, playtests): `docs/history/hourglass-delivery.md`
