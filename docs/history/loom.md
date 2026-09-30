# Loom: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/loom.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## History

- v1 (2026-09-29): first version.
- v2 (2026-09-29): from the friend's feedback ("every other level
  blindfolded"). Pennant, Hammock and Arrow; dyed knots; frayed strands
  (a frayed snap tears the shape); random mirroring; Old Rope and True
  Colours achievements. Bots `habit` and `habit-dye`.

## v2: breaking the one trick (rationale and design principles)

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

## v1 balance, for reference

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

## Notes before the split (2026-09-30)

Original full text of sections that were tightened in the current file.

### Intro (original lines 3-10)

Current: **v2** (playtest: https://claude.ai/artifact/85uz8o6kFYJaZRyVatPwAf). Mechanics: **pull** (drag) and
**pin** (tap), sharing **tension in every strand** of a 6×6 knotted net.
A run is seven silhouettes (Tablecloth, Banner, Sail, Kite, and from v2
Pennant, Hammock, Arrow), each mirrored left-right at random. Win a shape:
every dot covered by a knot at once, hands off, for 1 s. Lose a shape:
3 slips (a pin popping or a strand snapping), or one frayed strand
snapping. A lost shape can be retried from its start. Snapped strands carry
over to later shapes. 6 achievements (in `games/games.json`).

### Balance (v2) header and notes (original lines 126-143)

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

### Open ideas (original lines 186-209)

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
