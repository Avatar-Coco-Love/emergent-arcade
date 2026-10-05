# Loom: design notes

**v3** (2026-10-05, canvas label; v2 2026-09-29) · playtest: https://claude.ai/artifact/85uz8o6kFYJaZRyVatPwAf ·
balance: `node scripts/balance-loom.mjs 100`
Verbs: **pull** (drag) and **pin** (tap), sharing **tension in every strand** of a 6×6 knotted net.

## How it works

- A run is seven silhouettes (Tablecloth, Banner, Sail, Kite, and from v2
  Pennant, Hammock, Arrow), each mirrored left-right at random per run (knot
  numbers too). Win a shape: every dot covered by a knot at once, hands off,
  for 1 s. Lose: 3 slips (a pin popping or a strand snapping), or one frayed
  strand snapping ("Torn!"). A lost shape can be retried from its start.
  Snapped strands carry over to later shapes. 6 achievements (in
  `games/games.json`).
- v2 twists: **dyed knot** (Pennant, Arrow): a blue dot counts only under
  the blue knot, which is not a corner (Pennant: right edge, row 2; Arrow:
  top edge, column 2). **Frayed strands** (Hammock): dashed strands (whole
  top and bottom rows) snap at `FRAY_SNAP` 0.2 (gold at 0.12) and one snap
  loses the shape at once; the corners' rows stretch to 0.22 even at the
  dots' inner edges, so use rows 1 and 4 and leave the frayed rows slack.
- The net: knots on a 32 px grid, strands between horizontal and vertical
  neighbours only (no diagonals, so it shears freely like a real net).
  Strands only pull: force = strain = stretch / rest length, while taut.
  A slack strand is drawn sagging.
- Motion is overdamped: a free knot moves at `MOB · (|F| − FRICTION)` px/s
  (capped at `VMAX`) along its net force, and doesn't move under
  `FRICTION`. Friction is near zero, so an unpinned net slides as a whole
  and the first pin anchors it.
- Pull: the grabbed knot is pulled toward the finger with force
  `min(GRIP_MAX, GRIP_K · lead)`. It tracks the finger closely until the
  net pulls back harder than `GRIP_MAX`, and then it lags behind: the
  pink line thickens. Grabbing a pinned knot pulls its pin out. A released
  knot stays put for `GRACE` s (a fading ring), then slides.
- Pin: tap a knot. Up to `MAX_PINS` at once. A pin's ring fills with its
  load (the net strand force on it) relative to `PIN_HOLD`: white, gold at
  half, red at `RING_RED`. Over `PIN_HOLD` for `POP_DELAY` s (the pin
  shakes), it pops. While pulling, the grabbed knot shows the same ring: the
  load a pin would hold there.
- Snap: a strand over `SNAP` strain for `SNAP_DELAY` s snaps. It turns
  linen → gold (`WARN`) → red, flashing white while over. Snapped strands
  stay gone for the rest of the run, but a retry restores the holes the
  shape started with.
- Shapes (dots are `[x, y, knot]`: the third number is the knot the design
  has in mind, read only by the balance bots):
  - Tablecloth: 200×200 square, corners to corners (strain ~0.25).
  - Banner: 230×120, four corner dots plus one on the top and bottom edges.
    The four corner pins stretch those edges taut (strain ~0.44), which lines
    the edge knots up on the two extra dots. 6 dots, 4 pins.
  - Sail: right triangle (net corners TL, BL, BR). The left edge is taut
    (~0.4). 5 dots, 4 pins.
  - Pennant (v2): triangle, left edge on the corners (190 px), point at
    (335, 245) for the dyed knot 17. 3 dots, 3 pins, about 4 s for bots.
  - Hammock (v2): 220×110 on knots 6, 11, 24, 29 (rows 1 and 4), frayed
    top and bottom rows.
  - Arrow (v2): tip (200, 110) for dyed knot 2, feet (310, 330) and
    (90, 330) on the bottom corners. The pins at the feet pop at the dots'
    centres: rings needed (no-rings 23% first try).
  - Kite: diamond 240×320. The net has to turn 45° (corners to the points),
    and pins at the dot centres pop; pins at the inner edges hold (loads
    0.36–0.5).


## Key constants (`games/loom.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| COLS × ROWS / REST | 6×6 / 32 px | FRICTION | 0.01 |
| MOB / VMAX | 1500 / 600 px/s | GRIP_K / GRIP_MAX | 1/8 per px / 1 |
| WARN / SNAP / SNAP_DELAY | 0.4 / 0.6 / 0.8 s | PIN_HOLD / POP_DELAY | 0.6 / 0.6 s |
| RING_RED | 0.8 of PIN_HOLD | MAX_PINS / MAX_SLIPS | 4 / 3 |
| DOT_R / HOLD_WIN | 12 px / 1 s | GRACE | 0.6 s |
| GRAB_R / TAP_SLOP_PX | 26 / 10 px | STEP / SUB | 1/60 s / 4 substeps |
| FRAY_WARN / FRAY_SNAP (v2) | 0.12 / 0.2 | | |

## Layout (400×480)

Net centred at (200, 245). The status message sits at the top. The HUD
below the canvas shows shape n/4, pins in use, slips and Restart shape.

## Balance (v2, `node scripts/balance-loom.mjs 100`)

First-try % / any-try %, median seconds for wins. Shapes 1–4 (v1 table) are
in history.

| Bot | Run | Pennant | Hammock | Arrow |
|---|---|---|---|---|
| reader | 100% | 100/100 4 s | 100/100 9 s | 100/100 11 s |
| slow-hands | 100% | 100/100 | 100/100 | 99/100 |
| no-rings | 65% | 100/100 | 95/100 | 23/69 |
| inset-rule | 100% | 100/100 | 100/100 | 99/100 |
| mapper | 72% | 100/100 | 95/100 | 32/77 |
| novice | 71% | 100/100 | 92/100 | 40/78 |
| habit (v1 trick, blind to dye) | 0% | 0/0 | – | – |
| habit-dye (v1 trick + dye) | 0% | 100/100 | 0/0 (tears) | – |

Old Rope (Hammock first try): reader 100%, novice 84%. True Colours
(Arrow, no slips): reader 85%, no-rings 24%, novice 33%.

## Telemetry

One `arcade:result` per shape, with `level` (1–4), `run`, `attempt`,
`reason` for a loss (`torn` = the third slip was a snap, `slipped` = a pop,
`frayed` = a frayed strand snapped, v2). **v2 adds three shapes after Kite
(levels 5–7).** Levels 1–4 are the same shapes, now mirrored at random.
and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `snaps` | strands snapped this try | `pops` | pins popped this try |
| `pulls` | drags | `pins` | pins placed |
| `max_pins` | most pins in at once | `holes` | snapped strands carried in |
| `covered` | dots covered at the end | `first_input` | s until the first touch (-1: none) |


## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): no keyboard play.
- Not hand-played on a real phone yet (rendered headlessly with mouse input
  at 390×700).
- Bots win each shape in 6–12 s once they know the plan; a human's time goes
  into finding it (turning the net for Kite, using the taut edges on
  Banner), which bots can't measure. Check `first_input` and time per level.
- A plan-aware bot aiming at the inner edge (`inset-rule`) wins every shape,
  v2's included; the twists change which knots go where, not the "inner
  edge" part. Not built yet: **tacks** (knots fixed where they lie, never
  popping): a dot below a tack is safe at its outer (tack-side) edge, so
  aiming at the inner edge snaps the strand.
- Load rings aren't strictly needed (inner-edge aiming wins 100%). A shape
  where the safe spot isn't the inner edge (e.g. an extra non-dot pin to
  split a load) would make them required.
- Snapping rarely matters to a player who knows the plan, so carry-over
  holes rarely matter. A shape needing strain near `SNAP` (0.6) would make
  yanking (full grip against a pin) a real risk.
- The nearest-knot guess fails Banner outright (pins pop). If players stall
  there, draw a faint "corner" tick on the silhouette's corners, or move
  Banner's corners nearer the net's corners.
- More shapes combining twists (dyed knot next to frayed strands; Hammock
  with a dyed dot).
- `habit` never adapts after a loss; a human will after one tear. Check in
  telemetry how many tries Hammock (level 6) takes and whether players get
  stuck on Pennant (level 5) before seeing the blue knot.

History (older versions, balance tables, playtests): `docs/history/loom.md`
