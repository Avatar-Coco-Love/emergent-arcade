# Loom: design notes

**v5** (2026-11-26, depth pass: the Long Weave; v4 accessibility; v2 2026-09-29) · playtest: https://claude.ai/artifact/85uz8o6kFYJaZRyVatPwAf ·
balance: `node scripts/balance-loom.mjs 100`
Verbs: **pull** (drag) and **pin** (tap), sharing **tension in every strand** of a 6×6 knotted net.

## How it works

- A run starts with seven silhouettes (Tablecloth, Banner, Sail, Kite, and from v2
  Pennant, Hammock, Arrow), each mirrored left-right at random per run (knot
  numbers too). Win a shape: every dot covered by a knot at once, hands off,
  for 1 s. Lose: 3 slips (a pin popping or a strand snapping), or one frayed
  strand snapping ("Torn!"). A lost shape can be retried from its start.
  Snapped strands carry over to later shapes. Then the Long Weave
  (below). 8 achievements (in `games/games.json`).
- v2 twists: **dyed knot** (Pennant, Arrow): a blue dot counts only under
  the blue knot, which is not a corner (Pennant: right edge, row 2; Arrow:
  top edge, column 2). **Frayed strands** (Hammock): dashed strands (whole
  top and bottom rows) snap at `FRAY_SNAP` 0.2 (gold at 0.12) and one snap
  loses the shape at once; the corners' rows stretch to 0.22 even at the
  dots' inner edges, so use rows 1 and 4 and leave the frayed rows slack.
- The net: knots on a 32 px grid, strands between horizontal and vertical
  neighbours only (it shears freely). Strands only pull: force = strain =
  stretch / rest length, while taut.
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
  load (the net strand force on it) relative to `PIN_HOLD` (bands in
  "Accessibility"). Over `PIN_HOLD` for `POP_DELAY` s (outer ring, shakes)
  it pops. While pulling, the grabbed knot shows the same ring.
- Snap: a strand over `SNAP` strain for `SNAP_DELAY` s snaps. Its colour
  bands are in "Accessibility"; over `SNAP` it gets two white crossbars
  (and blinks white with motion on). Snapped strands
  stay gone for the rest of the run, but a retry restores the holes the
  shape started with.
- Shapes (dots are `[x, y, knot]`: the third number is the knot the design
  has in mind, read only by the balance bots). Per-shape notes (strains,
  pins, where pins pop) are in `docs/history/loom.md`, "Shapes (v2)".


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

Net centred at (200, 245); status line on a backing at the top; HUD
below: shape n/7 (Weave: n ∞), pins, slips, Weave retries, Restart shape.

## The Long Weave (v5, `// § long weave`: `shapeIndex`, `layShape`)

From shape 8 the run goes on. Each lap is the seven shapes shuffled (no
repeat across a lap boundary), each turned 0–3 quarter turns about the
net's centre (`turnKnot`) and mirrored. Shape n ≥ 8 is laid
`ENDLESS_GROW` 0.002 × (n − 7) wider about (CX, CY). Snapped strands
still carry. A lost Weave shape, or Restart (posts `reason: 'restart'`),
uses one of the run's `WEAVE_RETRIES` 3; with none left "The weave is
done." and the button starts a new run. The end card has a New run button
(key N) from shape 7 on. Achievements: Long Weave (`LONG_WEAVE` 10 held),
Twenty Shapes (`DEEP_WEAVE` 20). Score: shapes held (level), max 300,
epoch 2. Shapes 1–7 and their random calls are as in v4 (4 bots × 100
identical).

## Balance (v5)

Campaign (shapes 1–7) is v2's table (`docs/history/loom.md`). Endless,
`node scripts/balance-loom.mjs 100 <bots> --endless` (shapes held per run,
median / p10 / max, bot minutes, % of runs ≥ 10 min):

| Bot | Held | Minutes | ≥10 min | Runs stop at | long / deep |
|---|---|---|---|---|---|
| reader | 27 / 25 / 32 | 11.2 | 65% | Kite 47, Arrow 44 | 100 / 100% |
| slow-hands | 24 / 21 / 32 | 9.4 | 45% | Kite 60, Arrow 23 | 100 / 96% |
| inset-rule | 24 / 22 / 32 | 3.6 | 0% | Arrow 84 | 100 / 96% |
| no-rings | 9 / 6 / 18 | 1.9 | 0% | Arrow 73 | 49 / 0% |
| novice | 11 / 6 / 19 | 2.0 | 0% | Arrow 63, Kite 34 | 62 / 0% |
| mapper | 10 / 6 / 17 | 1.9 | 0% | Arrow 69 | 59 / 0% |

Reading the load rings is what the Weave pays for (reader 27 vs no-rings
9). Sweep: GROW 0 → reader and inset-rule never stop (200 shapes);
0.004 → reader 18. Bots take 6–14 s a shape; humans took 27–41 s in
v1–v4 telemetry, so a reader-like human's run is ~15–20 minutes.

## Accessibility (v4, `node scripts/a11y-audit.mjs loom`: all 6 pass in v5)

Keys in `// § keys` (arrows pick, C corners, Enter/P pin, hold Space +
arrows pull, S status, Enter next, N new run from v5), live region `#say`,
tension by lightness, reduced motion via `still()`. Full design and
measurements: `docs/history/loom.md`, "Accessibility (v4)".

## Telemetry

One `arcade:result` per shape, with `level` (1–4), `run`, `attempt`,
`reason` for a loss (`torn` = the third slip was a snap, `slipped` = a pop,
`frayed` = a frayed strand snapped, v2; `restart` = Restart in the Weave, v5).
**v5: levels 8+ are the Long Weave.** **v2 adds three shapes after Kite
(levels 5–7).** Levels 1–4 are the same shapes, now mirrored at random.
and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `snaps` | strands snapped this try | `pops` | pins popped this try |
| `pulls` | drags | `pins` | pins placed |
| `max_pins` | most pins in at once | `holes` | snapped strands carried in |
| `covered` | dots covered at the end | `first_input` | s until the first touch (-1: none) |
| `keys` (v4) | key pulls + key pins | `shape` (v5) | which of the 7 (0 Tablecloth … 6 Arrow) |
| `wider` (v5) | % wider (Weave) | `turns` (v5) | quarter turns (Weave) |


## Open ideas / known limits

- v5: watch `level` ≥ 8 rounds, where Weave runs stop (`stats.shape`)
  and whether humans reach 10 minutes. If Kite/Arrow end every run, give
  each shape its own growth (bots: they have the least headroom).
- Weave twists not built: a dyed corner from lap 2, frayed rows away from
  the load path (a random frayed strand makes shapes unwinnable, see
  history v5).

- Accessibility: a real screen reader and keyboard player are the test.
  Offsets are in game px (knot spacing 32). Sighted players see that a
  dot lies on the line between two others (a taut edge covers it); S
  could say so (the keys bot lost Sail there).
- Not hand-played on a real phone yet (headless, 390×700).
- Bots win each shape in 6–12 s once they know the plan; a human's time
  goes into finding it. Check `first_input` and time per level.
- Depth ideas from v2 (tacks, a shape where load rings are needed, a shape
  needing strain near `SNAP`): `docs/history/loom.md`, "Depth ideas".
- More v2-era ideas (Banner corner ticks, combined twists, `habit` vs a
  human after a tear): `docs/history/loom.md`, "Depth ideas".

History (older versions, balance tables, playtests): `docs/history/loom.md`
