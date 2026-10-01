# Pressure Grid: design notes

**v8** (2026-10-01) · playtest: https://claude.ai/artifact/WKBg1jZwLxZLnZ97Ben1sf ·
balance: `node scripts/balance-pressure-grid.mjs` (`--level N`, `--map`, `--full`, `--count`) ·
browser: `node scripts/playthrough-pressure-grid.mjs` (`--level N`)
The arcade's first game, rebuilt as a turn-based level puzzle (plan and
later increments: `docs/games/pressure-grid-plan.md`). v7's 60 s round was
a tap-speed test and is retired (history: `docs/history/pressure-grid.md`).
Mechanics: **pump** ({tap} a cell: +4) and **siphon** (drag to a
neighbour: pour all of it in, 1 lost), sharing **pressure per cell**,
read by the passive **burst** system (at 10 a cell empties, +2 to each
open neighbour, chains in waves) and a small **leak** (a cell left above
8 loses 1 per move). Goal per level: burst every ringed cell. Stars by
moves: 3 at par, 2 within par + 3, 1 for any solve. No fail state: Undo
(unlimited, Restart is undoable too) and Restart only. Increment 1 =
levels 1-5; next increments add 5 levels each.

## Rules (`// § sim` block in the game; the balance script runs it as is)

| Const | Value | Note |
|---|---|---|
| THRESHOLD | 10 | a cell at 10+ bursts |
| PUMP_ADD | 4 | three pumps from empty burst (12, 2 wasted) |
| BLAST | 2 | to each **open** neighbour; walls, edges and sealed cells take none. 4 × 2 < 10: every burst loses ≥ 2 |
| SAFE_MAX | 8 | after a move, a cell at 9 leaks to 8 |
| SIPHON_LOSS | 1 | a pour moves everything, 1 lost; source needs 2+ |

Cells: open, **target** (ring), **wall** (nothing passes), **sealed** (no
pumps, no blasts in: only a pour fills it; it can be poured from).
Order inside a move: pump/pour → burst waves (all cells at 10+ together,
then their neighbours) → leaks. Between moves every cell is ≤ 8.

Why these numbers (first tries in the plan: threshold 12, pump 4, blast
3): with 12/4/3 a blast never completes a pumped cell (8 + 3 = 11), so
chains didn't pay. 10/4/2 makes "prime at 8, let the neighbour finish it"
the core move.

## Levels (increment 1)

| # | id | map | par | lesson |
|---|---|---|---|---|
| 1 | first-pop | 5×5, one ring | 3 | pump to 10 |
| 2 | chain | 5×5, three rings in a row | 7 | a burst gives +2; 8 + 2 bursts |
| 3 | sealed | 5×5, sealed ring in the centre | 5 | pour into a seal; pour a little to top it off |
| 4 | wall | 6×6, wall column, ring left; ring + sealed ring right | 10 | walls; prime the ring beside the seal |
| 5 | pipes | 7×7 mostly walls: o S o row, a feeder, o, S, feeder | 16 | pour out of a ring into a seal, then refill it |

## Balance (`balance-pressure-grid.mjs --full --count`)

| Level | par | optimal lines (first moves) | pump-only | habit | greedy novice (≤40) | random (≤40) | ledger: in / burst loss / pour loss / left |
|---|---|---|---|---|---|---|---|
| 1 first-pop | 3 | 1 (1) | 3 | 3 | 100%, med 3 | 96%, med 13 | 12 / 4 / 0 / 8 |
| 2 chain | 7 | 630 (3) | 7 | 7 | 100%, med 7 | 28%, med 31 | 28 / 8 / 0 / 20 |
| 3 sealed | 5 | 128 (4) | none | 5 | 62%, med 17 | 62%, med 17 | 12 / 2 / 2 / 8 |
| 4 wall | 10 | 186,720 (5) | none | 11 | 56%, med 22 | 17%, med 32 | 32 / 14 / 2 / 16 |
| 5 pipes | 16 | 5.5 × 10⁹ (5) | none | 18 | 9%, med 36 | 0% | 48 / 32 / 4 / 12 |

Greedy novice = pump the fullest unburst ring, else a random move near a
ring. "Optimal lines" counts orderings; distinct first moves show there's
more than one plan.

- **Siphon is required** on levels 3-5 (sealed rings): the pump-only
  search finds no solution (findings: "A verb only shares state if
  succeeding needs to read it").
- **Habit** (burst rings one at a time in reading order, each by its
  shortest line) loses 1 move on level 4 and 2 on level 5: still 2 stars.
- **Novices** clear 1-2 almost always, rarely clear 5 within 40 moves.
- **Passive system loses**: every burst destroys ≥ 2 (the ledger column:
  pressure in vs lost to bursts, pours, leaks on the solver's line).
- Browser (`playthrough-pressure-grid.mjs`, 390×844 and 844×390):
  solver lines played by pointer reach ★★★ on all five; no scrolling;
  pause blocks input; `arcade:result` posts.

Solver: A* over moves with an admissible bound (pumps are the only
source; each unburst ring must destroy ≥ 10 − 2 × open neighbours; each
pour into a seal destroys 1, and a seal needs ⌈deficit / 7⌉ pours). Moves
limited to cells within 1 step of an unburst ring; `--zone 2` gives the
same par on 1-4. A fast copy of `play()` is checked against the game's on
random sequences each run. Level 5 takes ~25 s; `--budget S` (default
120) stops a search and prints "over budget". Importable: `solve(def)`
returns par and the line (`playthrough-pressure-grid.mjs` uses it).

## Adding levels (one increment = 5 levels)

1. Design each map with `--map "row,row,..."` (letters as in `LEVELS`;
   keep it walled, open 7×7 boards search slowly); `--full` shows the line.
2. Paste it into `LEVELS` (`// § sim` block) with `par` = the solver's;
   add new mechanics in that block too, so the solver runs them as is.
3. `node scripts/balance-pressure-grid.mjs` (all `ok`), then
   `node scripts/playthrough-pressure-grid.mjs` (exit 0).
4. Update the Levels and Balance tables and the notes here (old tables
   to `docs/history/pressure-grid.md`); bump `version`/`updated`, score
   max in this file. `smoke-gallery.mjs` only if `index.html`/`assets/`
   changed.
5. Last: in `docs/games/pressure-grid-plan.md`, replace "Next session
   prompt" with the prompt for the following increment.

## Score, progress, telemetry

`score`: **total stars** (own `score` in `arcade:result`, board `main`,
higher, max 15, **epoch 2**). The gallery only keeps the best total, so
on a later visit levels 1..⌈best/3⌉ count as solved (shown ✓, the next
one unlocked) and the total is spread over them; stars per level are only
exact for levels played this visit.

`arcade:result` per solve: `outcome: 'win'`, `time` (unpaused seconds on
the level), `level`, `level_id`, `run`, `attempt` (times the level was
opened this run), `score`, `stats`: `level`, `actions`, `par`, `siphons`,
`max_chain` (most cells burst by one move), `stars`, `undos`, `restarts`.
Levels left unsolved post nothing (read from session time).

Achievements (7): First Pop, Chain Reaction (3+ cells in one move: prime
both rings beside a seal on level 5, or all three on level 2), Siphon
Strike, Unsealed, Last Drop (a final pour that bursts 2 rings), Plumber
(15 pours in a visit), All Stars. Full Pressure and Century were v7-only.

## Layout

Top: level buttons with stars and the total. A two-line message strip
(level name + hint; the result after a solve). The board (80-unit cells,
fitted to the space, refitted on every level). A status line (moves, star
limits, rings left, the threshold) and Undo / Restart / Next. Numbers in
every cell; 8+ drawn larger and warm; rings orange, green ✓ when burst;
sealed cells have a steel frame and a padlock; walls hatched. Pressing a
cell previews the pump, dragging previews the pour: each changed cell
shows its new value, bursts get a dashed outline. Bursts play one wave
per 260 ms (white flash, "chain wave n/m"); a leak shows "−1 leak". A
press during the animation finishes it and acts. Keys: Z undo, R
restart, N next.

## Open ideas / known limits

- Not hand-played on a phone yet. Watch: is the pour gesture found
  without the level 3 hint? Do players read the preview?
- The leak rarely matters in 1-5 (0 leaks on every solver line); it's
  the hook for "leaky" cells in levels 6-10.
- Order costs little with 10/4/2 (a cell needs 4a + 2b = 10 in any
  order); order shows up through pours and overshoot. Later levels need
  rules that empty or block (valves, vents, delayed bursts) to make order
  matter more.
- Search cost grows fast on open boards (state = every cell's value);
  keep later maps walled, or improve the bound, before 7×7 open boards.
- Progress across visits is only the best total (see Score). A per-game
  save channel in the gallery would fix it.
