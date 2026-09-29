# Loom: design notes

Current: **v2** (playtest: https://claude.ai/artifact/85uz8o6kFYJaZRyVatPwAf). Mechanics: **pull** (drag) and
**pin** (tap), sharing **tension in every strand** of a 6×6 knotted net.
A run is seven silhouettes (Tablecloth, Banner, Sail, Kite, and from v2
Pennant, Hammock, Arrow), each mirrored left-right at random. Win a shape:
every dot covered by a knot at once, hands off, for 1 s. Lose a shape:
3 slips (a pin popping or a strand snapping), or one frayed strand
snapping. A lost shape can be retried from its start. Snapped strands carry
over to later shapes. 6 achievements (in `games/games.json`).

## v2: breaking the one trick

Feedback (2026-09-29, the friend who asked for depth in Ant Trails): "once
the player finds the trick on how to do one level they can do every other
level blindfolded, will need to add mechanics to spice things up there,
but it was a little fun game." The v1 trick is "the four net corners go to
the outermost dots, pinned at the inner edge". The new `habit` bot plays
exactly that (corners first, inset, no rings) and wins all of v1. v2 adds
two twists, each in a shape where that habit fails:

- **Dyed knot** (Pennant, Arrow): a blue dot counts only under the blue
  knot, which is not a corner (Pennant: right edge, row 2; Arrow: top
  edge, column 2). The net has to be stretched from a different knot.
  `habit` ignoring the dye: Pennant 0%.
- **Frayed strands** (Hammock): dashed strands (the whole top and bottom
  rows) snap at `FRAY_SNAP` 0.2 (turn gold at 0.12), and one snapping
  loses the shape at once ("Torn!"). The rectangle is 220 px wide, so the
  corners' rows stretch to 0.22 even at the dots' inner edges. The fix is
  to use rows 1 and 4 and leave the frayed rows slack. At first a snap was
  only a slip, and `habit` still won with 2 slips, because a snapped strand
  relieves its row. Hence the instant tear. `habit` aware of dye: Hammock
  0% (3 tries).
- **Mirroring**: every shape is mirrored at random per run (knot numbers
  too). Variety only; it doesn't break any rule.

Still open: a plan-aware bot aiming at the inner edge (`inset-rule`) wins
every shape, the new ones included. The twists change *which* knots go
where, not the "inner edge" part. The idea not built yet is **tacks**
(knots fixed where they lie, never popping): a dot below a tack is safe at
its *outer* (tack-side) edge, so aiming at the inner edge snaps the strand.

Built against `docs/findings.md`:

- **Passive systems must lose something.** The only passive system is the
  net relaxing: knots drift down the tension gradient, which only lowers
  tension. A pop releases load and a snap removes a strand. Nothing adds
  tension except a pull.
- **A verb only shares state if success needs to read it.** Pins pop at a
  load of 0.6, and Kite's pins at the dot centres carry more than that. Bots
  that ignore the load rings win Kite 55–58% on the first try, and the
  ring-reading bot wins 100%. But see open ideas: a fixed "aim at the dot's
  inner edge" rule also wins 100%.
- **Decay rate / speed test.** The net has no clock and nothing decays over
  time. Reader win rates are the same at 0.5×, 1× and 2× think time and
  with a 0.5 s reaction lag.
- **Sweep reaction time.** At POP_DELAY 0.3 s a pin popped before the
  reader could react to its red ring, so reading didn't help (reader 92%,
  mapper 97%). At 0.6 s the reader wins every Kite. At 1.0 s every bot that
  knows the plan wins everything.
- **Bots model skilled play, not the first minute.** `novice` yanks three
  knots onto dots without pinning them and watches them slide back (a hint
  then says to tap to pin). Tablecloth is built for that guess: the nearest
  knots are the right knots, and all novice bots hold it (98–100%).

## How it works

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

First-try % / any-try %, median seconds for wins. Shapes 1–4 as in v1
(below).

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

### v1 balance, for reference

Each seed plays one run, with up to 3 tries per shape. Per shape: first-try
win % / any-try win %, median seconds for wins.

| Bot | Run | Tablecloth | Banner | Sail | Kite |
|---|---|---|---|---|---|
| reader | 100% | 100/100 8 s | 100/100 6 s | 100/100 7 s | 100/100 12 s |
| reader 0.5× / 2× | 100% / 100% | 100 | 100 | 100 | 100/100 |
| slow-hands (0.5 s react) | 100% | 100 | 100 | 100 | 100/100 |
| no-rings (ignores load rings) | 93% | 99 | 100 | 100 | 55/93 |
| mapper (plan, yanks, ignores tension) | 95% | 99 | 100 | 100 | 58/95 |
| inset-rule (aims inside dots, no rings) | 100% | 100 | 100 | 100 | 100/100 |
| novice (3 yanks, then mapper) | 93% | 98/100 13 s | 100 | 100 | 70/93 |
| novice-read (3 yanks, then reader) | 100% | 100/100 15 s | 100 | 100 | 100/100 |
| pinner (nearest knot to each dot) | 0% | 99/100 | 0/0 (pops) | – | – |
| straight (never pins) / idle | 0% | 0 | – | – | – |

Kite Flyer (Kite with no slips): reader 68%, no-rings 72%, inset-rule 100%.
Snaps are rare for every plan-aware bot (median 0). They happen when the
plan is wrong (pinner on Kite: 3 snaps).

What decides a shape, in order: knowing which knot goes where (pinner 0%
from Banner on, and it can't turn the net for Kite), then not
overstretching (Kite pins pop at the dot centres). Speed doesn't matter.

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

- Not hand-played on a real phone yet (rendered headlessly with mouse
  input at 390×700).
- Bots win each shape in 6–12 s once they know the plan. A human's time
  goes into finding the plan (turning the net for Kite, using the taut edges
  on Banner), which bots can't measure. Check `first_input` and the time per
  level in telemetry.
- The load rings aren't strictly needed: aiming at the inner edge of every
  dot wins 100% without reading them. That rule is itself learned from
  tension (pins pop when you stretch too far), but a shape where the safe
  spot isn't the inner edge (e.g. an extra non-dot pin needed to split a
  load) would make the rings required.
- Snapping rarely matters for a player who knows the plan. Carry-over holes
  therefore rarely matter either. A shape needing strain near `SNAP` (0.6)
  would make yanking (full grip against a pin) a real risk.
- The nearest-knot guess fails Banner outright (pins pop). If players stall
  there, draw a faint "corner" tick on the silhouette's corners, or make
  Banner's corners nearer the net's corners.
- Tacks (see v2 above), and more shapes combining twists (a dyed knot
  next to frayed strands; Hammock with a dyed dot).
- `habit` never adapts after a loss; a human will after one tear. Check
  in telemetry how many tries Hammock (level 6) takes and whether players
  get stuck on Pennant (level 5) before seeing the blue knot.

## History

- v1 (2026-09-29): first version.
- v2 (2026-09-29): from the friend's feedback ("every other level
  blindfolded"). Pennant, Hammock and Arrow; dyed knots; frayed strands
  (a frayed snap tears the shape); random mirroring; Old Rope and True
  Colours achievements. Bots `habit` and `habit-dye`.
