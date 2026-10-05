# Hourglass Delivery: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/hourglass-delivery.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## History

- v5: no gameplay change. Keys (cursor, hold Space pours, K + arrow
  knocks, G/L jumps), a live region, reduced motion for decoration, order
  dots keep outcomes. Notes: "Accessibility" in the design notes.
- v1: first version.
- v2: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry. Bot numbers above still apply; compare humans with
  `node scripts/fetch-telemetry.mjs --game hourglass-delivery` (see `docs/telemetry.md`).
- v3: no gameplay change. Round results add `reason` and `stats` (above).

## Tuning path (v1 balance)

Tuning path:
- 5 ledge rows, then 3: almost no clear columns, so pour-only won 0–10%
  and both-together about 15%. Two rows opened the field.
- Knocks first moved only the grains inside the radius (the rest of the
  packed pile blocked them). `PUSH_KEEP` made the push run through the pile.
- Air drag (see above) was the big one: both 41% → 83% at 80 runs.
- Landslide at 120 and then 80 grains never happened for bots; 60 gives
  12–18%.

## Notes before the split (2026-09-30)

Original full text of sections that were tightened in the current file.

### Intro (original lines 3-7)

Current: **v3**. Mechanics: **pour** (hold) and **knock** (flick), sharing
the **sand grid** (100×150 cells, 4 px each: empty, loose, packed, wall).
Win: 8 hourglasses cross the belt and at least 6 leave filled to their
line. Lose: the 3rd empty glass (the round ends at once). 6 achievements
(in `games/games.json`).

### How the sand works (original lines 9-41)

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

### Balance notes (original lines 78-85)

Pour-only is bimodal: it wins (usually 8/8) when the level happens to have
a clear column from top to belt, and fills nothing otherwise, because it
never pours onto ledges. Humans who learn where ledge overflow lands will
do better than this bot.

Achievement rates (both bot): First Delivery 98%, Steady Hand 53%, Full
Order 43%, Stockpiler 22%, Landslide 12%, Not a Grain Wasted 3% (pour bot
22%: it only pours straight into glasses).

### Player data and telemetry notes (original lines 96-126)

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v2: 1 round, **lost in 33 s** (3rd empty glass), 0 achievements, so not a
single glass filled. Bots: both 70%, pour-only 23% (0 filled when the level
has no clear column). The bot table has no round length; add one to the
balance script so losses can be compared. A 0-achievement first round
suggests the tester never got sand into a glass, like the pour bot on a
blocked level.

## Telemetry fields (v3)

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

Both 33 s losses so far are the earliest a round can end: the 3rd glass
arrives at 22 s and takes about 11 s to cross, so they were the first
three glasses, all empty. A browser check pouring continuously while
sweeping side to side emptied the hopper to 70 grains in 32 s, caught 119
grains in total and still filled nothing (best glass 86 of 120).
Pouring alone drains the hopper about as fast as the glasses arrive
(60 grains/s against a 2000-grain hopper), so watch the `hopper` reason.

### Open ideas (original lines 128-139)

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
