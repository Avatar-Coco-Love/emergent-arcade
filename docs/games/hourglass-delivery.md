# Hourglass Delivery: design notes

**v6** (2026-11-26, depth pass: a run of orders) · playtest: https://claude.ai/artifact/ShajkshW4PgzyNWaUhG3eA (private, republished each push) ·
balance: `node scripts/balance-hourglass-delivery.mjs 300`
Verbs: **pour** (hold) and **knock** (flick), sharing the **sand grid**
(100×150 cells, 4 px each: empty, loose, packed, wall). An order: 6
hourglasses cross the belt; lose on the 3rd under the line. Orders run on
(below). 8 achievements (in `games/games.json`).

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
| MOUTH_HW / BELT_V | 16 px / per order | GLASSES / FIRST / SPACING | 6 / 8 or 4 s / per order |
| LINE / CAP / LOSE_AT | per order / 150 / 3 | FLICK_PX / FLICK_MS | 25 / 180 ms |
| SLIDE_N / STOCK_N | 60 / 400 | CLEAN_MAX / BRIM_TOL | 15% / 10 |

An order lasts 6 glasses: about 70 s in order 1 (8 + 5·11 s, then 15 s
to cross), about 45 s once spacing hits 6 s. A glass passes under a fixed
spout in 1–1.5 s, so pouring alone means sliding the spout along with it.

## Layout (400×600)

Seeded at random each round: an upper row of ledges (y ≈ 200) and a
lower row of "shelves" (y ≈ 432), 2 cells thick, plus 6 2×2 pegs
between them. Three ledges start with packed dunes of 80 grains. The glass
mouths are at y 500, the belt at y 560. Hopper gauge top-left, order dots
top-right (gold filled, red missed).

## Orders (v6, `// § orders`)

A run of orders, 6 glasses each; 3 glasses under the line fail the order.
Order k: line `LINE_0` 45 + `LINE_UP` 10·(k−1) up to 130; glasses
`SPACING_0` 11 − 0.6·(k−1) s apart, down to 6; belt `BELT_0` 24 +
3·(k−1) px/s, up to 55; first glass at 8 s (order 1) or 4 s. A delivered
order keeps the grid (packed sand carries) and adds `REFILL` 600 grains
(cap 2000). A failed order is retried on a fresh layout with its start
hopper and its glasses taken off the run total. Restart order = retry,
no result posted. Score: glasses filled in the run (`score`, epoch 2).
Foreman (5 orders), Night Shift (10). Full Order = all 6 in one order.
v5 was one order of 8 at line 120, 8 s apart, belt 40.

## Balance (v6)

Bots: v5's `pour`, `both`, plus `sloppy` (both at 3 decisions/s, pour aim
N(0, 10 px), takes a ready knock half the time) and `sloppy-pour`.
Single orders (`ORDER=k node scripts/balance-hourglass-delivery.mjs 100`):

| Bot | Order 1 | Order 3 | Order 8 |
|---|---|---|---|
| both | 77% | 76% | 64% |
| sloppy | 79% | 72% | 34% |
| pour | 72% | 46%* | 17% |
| sloppy-pour | 53% | 20%* | 0% |

(* order 3 measured with v6's first line 60; order 1 with 45.) Pour-only is
bimodal on clear columns; an order-1 clear chute didn't help it (not in).

Whole runs (`RUN=1 node scripts/balance-hourglass-delivery.mjs 40`; 3
losses on one order = gives up):

| Bot | Orders median | Glasses | Play | Done 5 |
|---|---|---|---|---|
| both | 7 | 110 | 10.9 min | 93% (6.3 min) |
| sloppy | 6 | 84 | 9.3 min | 83% (6.6 min) |
| pour | 5 | 94 | 8.2 min | 68% |
| sloppy-pour | 3 | 39 | 7.0 min | 10% |

## Telemetry (v3)

Each `arcade:result` also carries (see `docs/telemetry.md`) `level` (order),
`run`, `attempt`, `score` (glasses this run), and:

- `reason` on a loss (always the 3rd empty glass; it says why they were
  empty): `idle` (never poured or knocked), `hopper` (the hopper ran dry),
  `empty` (otherwise).
- `stats`: `line`, `start_hopper`, `filled`, `missed`, `caught` (grains that landed in any glass),
  `knocked_in` (of those, grains moved by a knock), `best` (most grains in
  one glass that left), `poured`, `spilled`, `hopper` (grains left),
  `pour_s` (seconds pouring), `knocks` (flicks that moved sand), `whiffs`
  (flicks that hit nothing), `clear_cols` (grid columns with no ledge or peg
  from top to belt: the pour bot only wins when there is one),
  `first_input` (seconds to the first pour or knock, −1 if none).
Pouring alone drains the hopper about as fast as the glasses arrive (60
grains/s against a 2000-grain hopper), so watch the `hopper` reason.

## Accessibility (v5, `node scripts/a11y-audit.mjs hourglass-delivery`)

All six pass on the audit's screen (3/3). A scripted late copy (~38 s:
filled, missed and half-full glasses, cursor and knock ring on) passes
colour, contrast, text, label, keys 3/3; motion there is "reads it,
unchanged" (0.7% → 0.6%): the glasses are the motion (below).
- Keys (`// § keys`): arrows move a cursor while held (100 → 300 units/s
  over 0.6 s); hold Space pours at its x (key up = finger up; the spout
  follows the cursor); K or X, then an arrow, knocks at the cursor that
  way (the flick's `knock()`; Esc cancels); G next glass on the belt
  (front first, again cycles), L next ledge onto its sand (Shift+L back).
  Enter plays again. Tab free; Space/Enter on a focused button press it.
- Live region `#say` (`#msg` aria-hidden, `say()` speaks): where the cursor
  stopped (grains in knock reach, where a pour lands: which ledge, a peg,
  a glass and its count, the belt), pour start and grains poured, knock
  result, glass rolling in / filled / delivered / empty, hopper every 500,
  the result. `#msg` on a dark backing (it sits where sand falls).
- Reduced motion (`still()`): belt stripes, puffs, knock ring drawn still (details in history).
- No canvas text; DOM text ≥ 13.6 px, 7.9:1+. `stats.keys`: key pours/knocks.

## Open ideas / known limits

- Accessibility: a real screen reader and keyboard player are the test.
- Stockpiler counts all packed grains, including the starting dunes (240).
- Not a Grain Wasted counts spilled starting-dune sand against your poured total.
- v6 to watch: order 1 win rate (v2–v5: 0 of 5 rounds, lost at ~33 s with
  sand in glasses but under 120), orders per run, `attempt`.
- Older v2 ideas (deflectors, flip animation, hand-made layout): history.

History (older versions, balance tables, playtests): `docs/history/hourglass-delivery.md`
