# Loom: design notes

**v4** (2026-10-05, accessibility: keys, live region, tension by lightness; v3 canvas label; v2 2026-09-29) · playtest: https://claude.ai/artifact/85uz8o6kFYJaZRyVatPwAf ·
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
below: shape n/7, pins, slips, Restart shape.

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

Achievement rates: `docs/history/loom.md`, "Shapes (v2)".


## Accessibility (v4, `node scripts/a11y-audit.mjs loom`: all 6 pass, 3/3)

- Keys (`// § keys`): arrows pick a knot; each net neighbour gets its own
  arrow (least-turn matching on current positions), so all 36 are
  reachable (300 pulled nets). On folded nets 43% of steps aren't undone
  by the opposite arrow, so opposite arrows walk back a trail; C /
  Shift+C jump corners. Enter/P = `tapKnot`. Hold Space = `grab`, arrows
  move a lead point (40 → 160 px/s over 0.8 s, 3 px a press, ≤ 40 px
  ahead) into `setFinger`; Space up = `release`. S status, Enter next.
  Tab free; Space/Enter on a focused button press it.
- Live region `#say` (`#msg` aria-hidden): picked knot (pinned + load
  word, each strand by arrow: slack/taut/straining/over its limit, "On
  dot 2, 4 right of its centre" or the nearest dot, saying if another
  knot covers it), a pull's lead and load once the arrows rest, strands
  turning straining, over-limit strands, pins working loose, pops and
  snaps by name, covered dots (0.4 s still), start and result.
- Tension by lightness (L* normal/deutan/protan), steps on the rule's
  lines: slack 35 (sags, 1.5 px); taut linen 88 → gold 80/82/78; at `WARN`
  orange-red 60/64/53 → red 54/58/45, +1 px; over `SNAP` white crossbars.
  Rings: grey 54, gold 80 from half, from `RING_RED` red 53/57/45 4 px on
  a dark track; over `PIN_HOLD` an outer white ring. v3 had no step at
  `WARN` (red end protan 48 vs slack 61); the colour cell passed both, on
  2 scripted late screens too.
- Reduced motion (`still()`): no flash, shake, blink, lint, flying pins
  (`Math.random` calls kept). v3's pass was a state pass (settled net
  0.00% idle); a frozen loose-pin + over-limit scene moves 0.13–0.17% in
  v3 either way, 0.41% → 0.00% in v4. `#msg` on a backing, 6.9:1, 13.6 px.
- Balance identical to v3 (16 bots × 100, old file twice first). Keys-only
  bot (live region only, 3 runs): Tablecloth 7–8 s, Banner 10–11 s, 0
  slips; Sail lost (its corner plan misses the taut-edge dots).

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
| `keys` (v4) | key pulls + key pins | | |


## Open ideas / known limits

- Accessibility: a real screen reader and keyboard player are the test.
  Offsets are in game px (knot spacing 32). Sighted players see that a
  dot lies on the line between two others (a taut edge covers it); S
  could say so (the keys bot lost Sail there).
- Not hand-played on a real phone yet (headless, 390×700).
- Bots win each shape in 6–12 s once they know the plan; a human's time
  goes into finding it. Check `first_input` and time per level.
- Depth ideas from v2 (tacks, a shape where load rings are needed, a shape
  needing strain near `SNAP`): `docs/history/loom.md`, "Depth ideas".
- The nearest-knot guess fails Banner outright (pins pop). If players stall
  there, draw a faint "corner" tick on the silhouette's corners, or move
  Banner's corners nearer the net's corners.
- More shapes combining twists (dyed knot next to frayed strands; Hammock
  with a dyed dot).
- `habit` never adapts after a loss; a human will after one tear. Check in
  telemetry how many tries Hammock (level 6) takes and whether players get
  stuck on Pennant (level 5) before seeing the blue knot.

History (older versions, balance tables, playtests): `docs/history/loom.md`
