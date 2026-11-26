# Pressure Grid: design notes

**v12** (2026-11-26, depth pass: Pipeline, Daily) · playtest: https://claude.ai/artifact/L3wkcN93UmuHrLTdLDHEa7 ·
balance: `node scripts/balance-pressure-grid.mjs` (`--level N`, `--map`, `--full`, `--count`,
`--pipeline`) · browser: `node scripts/playthrough-pressure-grid.mjs` (`--level N`, `--pipeline`) ·
boards: `node scripts/gen-pressure-grid-pool.mjs`
Turn-based level puzzle (plan: `docs/ideas/pressure-grid-plan.md`;
older: `docs/history/pressure-grid.md`). **Pump** (+4) and **siphon**
(pour all into a neighbour, 1 lost) share **pressure per cell** with the
passive **burst** (at 10: empty, +2 to open neighbours, chains) and
**leak** (above 8: −1 per move). Goal: burst every ring. Stars: 3 at par,
2 within par + 3, 1 any solve. No fail state: Undo, Restart. 5 levels
per increment: 1-5 (v8), 6-10 "pressure in motion" (v9). After level 5:
the endless **Pipeline** (v12, below), also the Daily's run.

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

## Balance (levels)

All ten `ok` against `LEVELS`. Siphon is required on 3-5 and 8-10; the
habit loses 1-2 moves on 4-7, 9, 10; greedy novices clear 1-2, 6-7, rarely
5, 8, 9. Full table (optimal lines, novices, ledger): history file,
"Level balance (v9-v11)".

## Pipeline (v12, `// § pipeline` in the sim block)

Endless boards from `POOL` (written by `gen-pressure-grid-pool.mjs`, data
in `scripts/pressure-grid-pool.json`; never edit by hand). Board k: tier
`pipeTier(k)` = 1 for boards 1-3, 2 for 4-9, then 3 except every third
board (2). Each tier shuffled by the run's seed (new shuffle per pass) and
flipped (mirror / upside down: par holds, 40 flipped boards re-solved).

| Tier | boards | pieces | par | habit loses |
|---|---|---|---|---|
| 1 warm-up | 60 | rings, walls, seals; 3×2-4×3 inner | 7-8 | 0.37 avg |
| 2 | 60 | + vents, leaky (25 boards) | 5-11 | 0.22 avg |
| 3 habit breakers | 107 | + valves (8); habit > par on all | 6-13 | 1.1 avg |

Kept only if: par proven in 1-1.5 s, a pour is needed (pump-only can't
match par), the new piece matters (made plain, par changes; a valve counts
if two-way seals or walls change par). Random boards beat the habit only
~25% of the time, hence tier 3 (finding).

**Spare moves**: start `PIPE_START` 8, at most `PIPE_CAP` 10. Moves over
par come out; a board at par gives `PIPE_REFUND` 1 back. Undone moves stay
spent (Restart too). Out of moves on a board = run over. Score = boards
cleared (board `pipeline`, label "Boards cleared").

`--pipeline` (200 runs; minutes guessed at 2.5 s/move + 12 s/board):

| bot | boards med (p25-p75) | est. min | past 10 min |
|---|---|---|---|
| solver | 200 (cap) | 110 | 100% |
| habit | 26 (24-29) | 15 | 100% |
| habit + 1-2 on 30% | 15 (12-17) | 9 | 32% |
| habit + 1-2 always | 4 (4-5) | 3 | 0% |
| greedy novice | 0 | 1 | 0% |

Tried: 6/9 → habit 24, slip 13, +2 3; 10/12 → 30, 17, 5. Watch human
boards per run: v9 players used ~2× par on levels 2-4 (worse than +2).

**Daily** (`daily.from` 2026-11-28): `?daily=` opens a Pipeline run seeded
by FNV-1a(`pressure-grid:date`), no level bar; results carry `daily`,
`arcade:final` on run over. Later runs that day replay the same boards.

## Adding levels

Steps (map design with `--map`, `LEVELS`, par from the solver, tables
here, manifest): history file, "Adding levels".

## Score, progress, telemetry

`score`: **total stars** (own `score` in `arcade:result`, board `main`,
higher, **epoch 2**); Pipeline: boards cleared, board `pipeline` (max 1000
for both). The gallery keeps only the best total:
on a later visit levels 1..⌈best/3⌉ count as solved (✓ on the button)
with the total spread over them.

`arcade:result` per solve: `win`, `time` (unpaused s), `level`,
`level_id`, `run`, `attempt`, `score`, `stats` (`actions`, `par`,
`siphons`, `max_chain`, `stars`, `undos`, `restarts`). Unsolved levels
post nothing. Pipeline: one per board, `level` 11+ (board 1 = 11),
`level_id` `pipeline`, `board` `pipeline`, `run` per run, `score` =
cleared; `stats` adds `board`, `tier`, `bank` (spare after it); `loss`
when out of moves.

Achievements (9): First Pop, Chain Reaction (3+ cells in one move, vents
not counted), Siphon Strike, Unsealed (valves don't count), Last Drop (a
final pour that bursts 2 rings), Plumber (15 pours in a visit), All Stars
(every level), Pipefitter (10 boards in a run: slip bot median 15),
Mainline (25: habit median 26).

## Layout and accessibility

Top: level buttons, the Pipeline button and the star total (two rows on a
phone). Board, then the message strip (under the board so toasts don't
cover it), status line, Undo / Restart / Next. Accessibility (v11: keys,
live region, two lightness bands; a11y audit 6/6) and the full layout
notes: history file, "Layout and accessibility (v11)".

## Open ideas / known limits

- Pipeline: is 8 spare moves right for people? Watch boards per run and
  `stats.bank`; humans used ~2× par on early levels (the +2 bot: 4
  boards). If runs end at board 1-3, start higher or make tier 1 smaller.
- Tier 1 par is 7-8: smaller pump-only boards were filtered (a pour is
  required). A gentler first board might need that rule relaxed.
- Leaving a run for a level drops it silently (no result).
- Not hand-played on a phone yet: is the pour found without level 3's
  hint? Are the preview and the vent/valve/leaky marks read?
- Valve boards are rare (8 of 107 in tier 3): most random valves are
  idle or make a board unsolvable. Hand-made valve templates would help.
- Search cost grows on open boards and with leaky cells; the generator
  keeps boards ≤ 5×4 inner, walled.
- Progress across visits is only the best total (see Score). A per-game
  save channel in the gallery would fix it.
