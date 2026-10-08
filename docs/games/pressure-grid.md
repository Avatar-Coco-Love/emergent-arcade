# Pressure Grid: design notes

**v11** (2026-10-05, accessibility; v10 canvas label) · playtest: https://claude.ai/artifact/WKBg1jZwLxZLnZ97Ben1sf ·
balance: `node scripts/balance-pressure-grid.mjs` (`--level N`, `--map`, `--full`, `--count`) ·
browser: `node scripts/playthrough-pressure-grid.mjs` (`--level N`)
Turn-based level puzzle (plan: `docs/ideas/pressure-grid-plan.md`;
older: `docs/history/pressure-grid.md`). **Pump** (+4) and **siphon**
(pour all into a neighbour, 1 lost) share **pressure per cell** with the
passive **burst** (at 10: empty, +2 to open neighbours, chains) and
**leak** (above 8: −1 per move). Goal: burst every ring. Stars: 3 at par,
2 within par + 3, 1 any solve. No fail state: Undo, Restart. 5 levels
per increment: 1-5 (v8), 6-10 "pressure in motion" (v9).

## Rules (`// § sim` block in the game; the balance script runs it as is)

| Const | Value | Note |
|---|---|---|
| THRESHOLD | 10 | a cell at 10+ bursts |
| PUMP_ADD | 4 | three pumps from empty burst (12, 2 wasted) |
| BLAST | 2 | to each **open** neighbour; walls, edges and sealed cells take none. 4 × 2 < 10: every burst loses ≥ 2 |
| SAFE_MAX | 8 | after a move, a cell at 9 leaks to 8 |
| SIPHON_LOSS | 1 | a pour moves everything, 1 lost; source needs 2+ |
| LEAKY_DRIP | 2 | a leaky cell loses this after every move (no leak on top) |

Cells (map letter): open `.`, **target** ring `o`, **wall** `#` (nothing
passes), **sealed** `s`/`S` (no pumps, no blasts in: only a pour fills
it; it can be poured from). v9: **valve** `^>v<` (a sealed pipe cell:
pours into and out of it only go the arrow's way), **vent** `*` (open,
starts at 8; when it bursts it empties its open neighbours instead of
blasting them), **leaky** `l`/`L` (open; loses 2 after every move).
Order inside a move: pump/pour → burst waves (all cells at 10+ together,
then their neighbours; vents empty theirs after the wave's blasts) →
leaks → drips. Between moves every cell is ≤ 8.

## Levels

| # | id | map | par | lesson |
|---|---|---|---|---|
| 1 | first-pop | 5×5, one ring | 3 | pump to 10 |
| 2 | chain | 5×5, three rings in a row | 7 | a burst gives +2; 8 + 2 bursts |
| 3 | sealed | 5×5, sealed ring in the centre | 5 | pour into a seal; pour a little to top it off |
| 4 | wall | 6×6, wall column; o left, o S right | 10 | walls; prime the ring beside the seal |
| 5 | pipes | 7×7 walled: `.oSo.`, feeder, o, S, feeder | 16* | pour out of a ring into a seal, refill it |
| 6 | drip | 5×5, o L o row | 8 | leaky ring: prime the others, fill it last in one run |
| 7 | vent | `.*o.` / `.o*.` | 4 | pour a vent out: defused, and its 8 is free |
| 8 | valves | `*<S<*` / ring under S | 7 | the left vent's arrow is wrong-way (two-way: 6) |
| 9 | relief | `.So*S` row, open around | 10 | pour the vent into a seal before a burst sets it off |
| 10 | flow | `*>S..` / `.o*.` / `l.L.` | 10 | vent into the leaky ring (10 at once); a seal burst ends it |

\* upper bound: the proof runs over budget (see Solver).

## Balance (`balance-pressure-grid.mjs --full --count`)

| Level | par | optimal lines (first moves) | pump-only | habit | greedy novice (≤40) | random (≤40) |
|---|---|---|---|---|---|---|
| 1 first-pop | 3 | 1 (1) | 3 | 3 | 100%, med 3 | 96%, med 13 |
| 2 chain | 7 | 630 (3) | 7 | 7 | 100%, med 7 | 28%, med 31 |
| 3 sealed | 5 | 128 (4) | none | 5 | 62%, med 17 | 62%, med 17 |
| 4 wall | 10 | 186,720 (5) | none | 11 | 56%, med 22 | 17%, med 32 |
| 5 pipes | 16* | 5.5 × 10⁹ (5) | none | 18 | 9%, med 36 | 0% |
| 6 drip | 8 | 30 (3) | 8 | 9 | 100%, med 9 | 4%, med 37 |
| 7 vent | 4 | 16 (6) | 6 | 5 | 100%, med 6 | 78%, med 23 |
| 8 valves | 7 | 23 (2) | none | 7 | 19%, med 24 | 17%, med 29 |
| 9 relief | 10 | 675,304 (6) | none | 12 | 14%, med 34 | 13%, med 33 |
| 10 flow | 10 | 13,251 (8) | none | 11 | 49%, med 25 | 2%, med 39 |

Greedy novice: pump the fullest unburst ring, else a random move near
one.

- **Siphon is required** on levels 3-5 and 8-10; on 7 it saves 2 moves
  (the vent is a source only a pour can use). 6 is pump-only, like 1-2.
- **Habit** (burst rings one at a time in reading order, each by its
  shortest line) loses 1-2 moves on 4, 5, 6, 7, 9, 10: still 2 stars.
- **Novices** clear 1-2, 6-7 almost always; 5, 8, 9 rarely within 40.
- **Passive system loses**: every burst destroys ≥ 2, vents and drips
  more (`--full` ledger on the solver's line).
- Browser (`playthrough-pressure-grid.mjs`, 390×844, 844×390): solver
  lines get ★★★ on all ten; no scroll; pause blocks; results post.

Solver: A* with an admissible bound, moves within 1 step of an unburst
ring; details in the history file ("Solver").

## Adding levels

Steps (map design with `--map`, `LEVELS`, par from the solver, tables
here, manifest): history file, "Adding levels".

## Score, progress, telemetry

`score`: **total stars** (own `score` in `arcade:result`, board `main`,
higher, max 30, **epoch 2**). The gallery keeps only the best total:
on a later visit levels 1..⌈best/3⌉ count as solved (✓ on the button)
with the total spread over them.

`arcade:result` per solve: `win`, `time` (unpaused s), `level`,
`level_id`, `run`, `attempt`, `score`, `stats` (`actions`, `par`,
`siphons`, `max_chain`, `stars`, `undos`, `restarts`). Unsolved levels
post nothing.

Achievements (7): First Pop, Chain Reaction (3+ cells in one move, vents
not counted), Siphon Strike, Unsealed (valves don't count), Last Drop (a
final pour that bursts 2 rings), Plumber (15 pours in a visit), All Stars
(every level).

## Layout

Top: level buttons and star total (two rows on a phone; the cabinet's
toasts land here). The board (80-unit cells, refitted per level). Under
it the message strip (name + hint, or the result; below the board since
v9 so toasts don't cover it), the status line and Undo / Restart / Next.
Numbers in every cell, 8+ larger and warm; rings orange, green when
burst; sealed: steel frame + padlock; valve: pipe walls + chevron; vent:
purple frame + grille; leaky: a drop; walls hatched. Press previews the
pump, drag the pour (new value on each changed cell, dashed outline on
bursts). Waves play 260 ms apart ("chain wave n/m", "vented!", "−1
leak", "drip"); a press finishes the animation. Keys: below.

## Accessibility (v11, `node scripts/a11y-audit.mjs pressure-grid`: all 6 pass, 3/3 runs)

- Two lightness bands (`fillFor`): 0-7 dark slate to brick, white
  numbers 8:1+ (0 grey, 6.3:1); 8+ bright amber, dark numbers 10:1+. So
  near-burst cells differ by lightness (protan: 8 and 4 were both olive).
  Rings get a dark rim so they show on amber.
- Labels (chips, leak, drip, vented!, chain wave): dark backing (`tag()`),
  `fs(n)` ≥ 12.5 CSS px.
- Keys: arrows move a cursor (the first key shows it on the first ring),
  Enter/Space pump, S aims a pour (an arrow picks the neighbour, with the
  preview; Enter or S pours, Esc cancels). Same `doMove` as the pointer.
  Tab free; Space/Enter on a focused button press it. Solver lines by
  keys only: ★★★ on all ten.
- Live region `#say` (`role="status"`, hidden), one line per key or move:
  "Row 2, column 3: 4, ring."; "Poured 7 left, now 10. 2 cells burst in a
  chain of 2 waves. 1 ring left."; solve, undo, level.
- `draw()` marks dirty and the frame loop paints once: a press and its
  move used to paint twice in one frame (the audit read the stale "0").

## Open ideas / known limits

- Accessibility: done in v11 (above). Not checked with a real screen
  reader or colour-blind player; do keyboard players find S for pours?
- Not hand-played on a phone yet: is the pour found without level 3's
  hint? Are the preview and the vent/valve/leaky marks read?
- Valve direction binds only on level 8; on 10 the valve route is an
  optional source. A level where the arrow blocks the obvious pour out
  of a ring would test it harder.
- Search cost grows on open boards and with leaky cells; keep maps
  walled or improve the bound. A scratch generator (random walled maps
  scored by `solve`/`habit`) found 7 and 9: worth a script for Daily.
- Progress across visits is only the best total (see Score). A per-game
  save channel in the gallery would fix it.
