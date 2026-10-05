# Pressure Grid: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/pressure-grid.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## Adding levels (one increment = 5 levels; moved from the notes in v11)

1. Design each map with `--map "row,row,..."` (letters as in `LEVELS`;
   keep it walled, open 7×7 boards search slowly); `--full` shows the line.
2. Paste it into `LEVELS` (`// § sim` block) with `par` = the solver's;
   add new mechanics in that block too, so the solver runs them as is.
3. `node scripts/balance-pressure-grid.mjs` (all `ok`), then
   `node scripts/playthrough-pressure-grid.mjs` (exit 0).
4. Update the tables and notes in `docs/games/pressure-grid.md` (old parts here);
   bump `version`/`updated` and score max in the manifest.
5. Last: in `docs/games/pressure-grid-plan.md`, replace "Next session
   prompt" with the prompt for the following increment.

## Solver (moved from the notes in v11, 2026-10-05)

Solver: A* with an admissible bound (pressure on the board + 4 per pump
must cover what unburst rings destroy, 10 − 2 × open neighbours; seals
need ⌈deficit / 7⌉ pours; ≥ 1 while unsolved). Moves only within 1 step
of an unburst ring (a step out of a valve is free); `--zone 2` agrees on
1-4 and 10. A fast `play()` copy is checked against the game's each run.
The proof gets half of `--budget` (120 s), then a fast search gives an
upper bound, flagged: level 5 (~85 s). 6-10 prove in < 8 s; leaky cells
slow it most. `solve(def)`, `habit(L)` are importable.

## Moved from the notes (2026-10-05): open ideas

- The leak still rarely matters (0 on solver lines); leaky cells and
  vents are where order costs now (habit loses 1-2 on 6, 7, 9, 10).
- Level 10's par equals 9's; its difficulty is the idea. Increment 3
  can scale par up.

## v8 notes moved out in v9 (2026-10-01)

Why 10/4/2 (first tries in the plan: threshold 12, pump 4, blast 3): with
12/4/3 a blast never completes a pumped cell (8 + 3 = 11), so chains
didn't pay. 10/4/2 makes "prime at 8, let the neighbour finish it" the
core move.

v8 ledger column (pressure on the solver's line: in / burst loss / pour
loss / left): 1: 12/4/0/8 · 2: 28/8/0/20 · 3: 12/2/2/8 · 4: 32/14/2/16 ·
5: 48/32/4/12. v9 levels: 6: 32/6/0/18 (+8 drip) · 7: 8/10/2/12 ·
8: 16/17/3/12 · 9: 24/14/4/14 · 10: 28/15/3/22 (+4 drip).

Solver fix in v9: v8's A* returned the first goal it *generated*; from a
node with h = 0 that goal can be one move past the optimum, so pars were
not proven. Found when the habit bot beat "par" on a generated valve map
(6 vs 7). v9 floors h at 1 while unsolved (then the first goal is
optimal). Levels 1-4 still prove their par; level 5's 16 runs out of
memory/budget before the proof, so it is reported as an upper bound.

v8 layout: message strip between the level buttons and the board (the
cabinet's toasts covered it), and a green ✓ in a burst ring's corner
(read as a stray line over the ring). v9 moved the strip under the board
and dropped the ✓.

Design path for 6-10: hand maps for valves came out either bypassed (an
open cell beside the seal) or as pipe grinding (pump, pour, pour). A
scratch generator (random walled 5×3 maps per theme, kept if par 7-18 and
the new cell changes par) found the vent maps for 7 and 9; 8 is the
two-vent valve map with the left arrow reversed, 10 a hand variant.

## v8 plan: increment 1 (built 2026-10-01)

Moved from `docs/games/pressure-grid-plan.md` once levels 1-5 shipped in
v8 (what changed from it: `docs/games/pressure-grid.md`, numbers 10/4/2,
level 5 par 16). The plan's opening status lines read: "Keep the 2-3 verbs
rule: pump, siphon, and the passive bleed + eruption system, all sharing
pressure per cell. `id` stays `pressure-grid`."

Built vs plan: level 5's par is 16, not "about 14" (the solver's minimum
for the map; kept). The greedy novice's level 4 solves take ~22 moves
(1 star), not a clean fail as the plan hoped; level 5 it mostly fails.

### Why change it (maintainer playtest, 2026-10-01)

| Complaint | Cause in v7 |
|---|---|
| Finger masher | Bleed is per second, so only tap rate matters (bots: spam6 wins 100%, every board-reading bot loses). Known flaw in the notes. |
| Don't understand what's going on | Pressure is colour only; bleed is invisible; a chain happens in one tick with no way to follow it; the goal is a count, not something on the board. |
| No clear objective | "100 eruptions in 60 s" says nothing about where or why. |
| Siphon is pointless | Pumping reaches every cell, so there is never a reason to move pressure. |
| No variety | One 10x10 grid forever. |

### Core idea: from a speed test to a placement puzzle

1. **Targets on the board.** Each level marks cells (ringed) that must erupt.
   The goal is visible and specific.
2. **Turn-based, not real-time.** Bleed and eruptions advance one *step per
   action*, not per second (same fix as Orbit Garden v6, see findings: "A
   decay rate turns a puzzle into a speed test"). No clock in levels. Taking
   your time never hurts, tapping fast never helps.
3. **Make siphon necessary.** Add cell types that block pumping, so
   pressure must be carried there:
   - **Sealed** cell: cannot be pumped, can be siphoned into/out of.
   - **Wall**: no pressure, blocks bleed, blasts and siphons.
   - **Well** (later): pump here adds double.
4. **Move budget and stars.** Each level has a par number of actions.
   Under par = 3 stars. Pump and siphon each cost one action, so choosing
   *where* beats mashing.
5. **Readable physics.**
   - Integer numbers in each cell, threshold shown (for example 8/12).
   - On hover/drag, a preview of where a blast or siphon would go.
   - Eruptions animate one wave at a time (about 250 ms per wave), with the
     chain count shown. "Cell burst, +3 to each neighbour" is visible.
   - A one-line hint per level, shown before the first move.
6. **Retire the timed round.** (Decided 2026-10-01.) v7's 60 s round and free
   play are removed, not kept as a mode. Its balance table and rationale move
   to `docs/history/pressure-grid.md`. The old telemetry is v7 data and stays
   readable by version.

Suggested starting numbers, to be tuned with the solver below: threshold
12, pump +4, blast +3 to each neighbour, siphon moves half (rounded down) and
loses 1, bleed 1 step per action splitting 20% among neighbours. Check
that every eruption still loses pressure (findings: "Passive systems that
create more than they cost play themselves").

### Increment 1 (this first PR): levels 1-5, "Learn the pipes"

Small boards (5x5 to 7x7) so the numbers are readable on a phone.

| # | Board idea | Target | New lesson |
|---|---|---|---|
| 1 | 5x5, empty | one ringed cell next to the centre | Pump a cell 3 times and it erupts |
| 2 | 5x5 | three ringed cells in a row | A blast pushes pressure into neighbours: pump the middle, chain outward |
| 3 | 5x5, one sealed ringed cell | the sealed cell | It can't be pumped. Pump a neighbour, then **siphon** into it |
| 4 | 6x6, wall splits the board | one target each side | Bleed and blasts don't cross walls; siphon can't either. Plan two separate builds |
| 5 | 7x7, mix | five ringed cells, two sealed | All of the above; par is about 14 actions. First level where a wrong order costs you |

Level 1-2 par is generous, 3-5 get tight. Stars: 1 = solved, 2 = within par + 3,
3 = at par. Locked until the previous level is solved. **No fail state**: the only
controls besides pump/siphon are **Undo** (unlimited, one action at a time)
and **Restart** (level from its start). Exceeding par just means fewer stars.
Hazards that could "lose" the level (vents filling) wait for later
increments and must be undoable too. Progress saved via
the gallery's score/`arcade:best` channel (see `docs/scores.md`).

Achievements: keep the existing six if they still make sense in a level game
(First Pop, Chain Reaction, Siphon Strike, Plumber, Century is replaced by
"3 stars on levels 1-5"), and add two that need the new mechanics (burst a
sealed cell, solve a level with a siphon-only finish). Update the manifest
`goal`, `howToPlay`, `blurb`; keep `{tap}`/`{hold}` wording rules.

Score: **stars (and levels cleared)**, higher is better; bump `score.epoch`
to 2. Telemetry: post `arcade:result` per level with `stats`: level, actions,
par, siphons, max_chain, stars.

### How to prove it (before shipping)

- **Solver bot:** `scripts/balance-pressure-grid.mjs` gains a breadth-first
  or best-first solver over actions. It proves each level is solvable,
  computes the true minimum (par comes from this, not a guess), and counts
  how many distinct solutions exist (want 2+ on later levels, but not a
  trivial single obvious path).
- **Findings checks to run** (`docs/findings.md`):
  - "A verb only shares state if succeeding needs to read it": a bot that
    ignores siphon must **fail** levels 3-5.
  - "When two things always move apart, turning alone can separate them":
    search for a single-verb win with an exploring bot, not only greedy.
  - "One round shows everything": levels must keep changing what the
    verbs face. The table above is meant to do that. Re-check at level 5.
  - Passive system must lose something each step (check bleed/eruption
    conservation numbers with the solver).
- A novice bot (random legal moves, or greedy "pump the target") should
  clear levels 1-2 and fail 4-5.
- **Real browser check:** Playwright at phone size (about 390x844): numbers
  readable, previews appear on touch drag, no scrolling, `arcade:pause`
  and `arcade:resume` still work.
- Normal pipeline: `node scripts/validate.mjs`, update
  `docs/games/pressure-grid.md` (move superseded v7 balance to
  `docs/history/pressure-grid.md`), bump `version`/`updated`, add a
  `changes` entry, private playtest Artifact link in the PR body.


## v7 design notes (retired 2026-10-01 by v8)

v8 replaced the 60 s round and free play with turn-based levels (plan:
`docs/games/pressure-grid-plan.md`). The v7 notes as they stood, kept for
the telemetry it produced (v7 rows read by version). The v7 bot script
(Playwright, timed bots) is `scripts/balance-pressure-grid.mjs` in git
history before v8:

**v7** (2026-09-29) · playtest: https://claude.ai/artifact/6XdvHNUwNZx9LdbutZBSuL ·
balance: `node scripts/balance-pressure-grid.mjs 100`
The arcade's first game and its structural reference
(`docs/adding-a-game.md`). Mechanics: **pump** (tap a cell: +pressure) and
**siphon** (drag from a cell toward a neighbour: move 60% of it, 15% lost),
sharing **pressure per cell**. A passive system bleeds pressure into
neighbours every tick. Cells at the threshold erupt: they empty and blast
their neighbours, which can chain. **Round (v7): make `TARGET` (100)
eruptions within `ROUND_S` (60 s)**; the clock starts at the first pump or
siphon. Win or loss posts `arcade:result`, then the board stays open for
free play until New round. Until v6 it was a sandbox with no round. 6
achievements (in `games/games.json`).

**Known flaw, accepted for now:** the round is a tapping-speed test (see
Balance (v7)). It was added to get human win rates and round data. A goal
where decisions matter needs a redesign (below).

Feedback: one 3/5 test rating on v5 (2026-09-27). No telemetry sessions
recorded yet.

### Key constants (`games/pressure-grid.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| GRID_SIZE | 10×10 | TICK_MS | 200 (5 ticks/s) |
| CLICK_ADD | 30 | BLEED_RATE | 0.15 of a cell per tick, split among neighbours |
| ERUPT_THRESHOLD | 100 | ERUPT_BLAST | 24 to each neighbour (was 40 until v6) |
| SIPHON_FRACTION / _EFFICIENCY | 0.6 / 0.85 | DRAG_THRESHOLD_PX | 12 |
| ROUND_S | 60 s (clock from the first input) | TARGET | 100 eruptions |

Eruptions resolve in up to 20 passes per tick (`resolveEruptions`, `guard`).
An interior eruption removes ≥100 and adds 96 (4 × 24), so **every
eruption loses pressure** (edges and corners lose more) and storms burn out.
Before v6 it added 160 and storms sustained themselves. Bleed conserves
pressure and siphons lose 15%.

### Layout

400×400 board (40 px cells), scaled to fit. A status line below (the goal
before the first input, then seconds left · eruptions/100 · siphons, then
the result and free-play counts) and a New round button.

### Balance (v7 round, `node scripts/balance-pressure-grid.mjs 100`)

One 60 s round per run. Achievements are only counted inside the round.

| Bot | win | median win time | pumps used | eruptions |
|---|---|---|---|---|
| spam1 (centre, 1/s) | 0% | – | – | 0 |
| spam3 (centre, 3/s) | 100% | 56 s | 168 | 103 |
| spam6 (centre, 6/s) | 100% | 24 s | 144 | 100 |
| spread3 (random cells, 3/s) | 0% | – | – | 0 |
| spread6 (random cells, 6/s) | 100% | 45 s | 270 | 108 |
| sweep3 (lowest cell, 3/s) | 0% | – | – | 0 |
| sweep6 (lowest cell, 6/s) | 100% | 44 s | 265 | 100 |
| strike3 (siphon strikes, 3/s) | 0% | – | – | 41 |

Tap rate decides the round, not where you tap. Bleed spreads pumped
pressure across the board within about a second, so only pressure
concentrated faster than it bleeds away erupts. Spam at 3/s wins just
before the clock. The siphon bot loses, so siphon doesn't help win.

Tried first: a pump budget (reach 100 eruptions with 150 pumps, siphons
free, no clock). Still a speed test: spam6 won 100% (144 pumps), spam3 0%
(85 eruptions), and every board-reading bot 0%, because pressure bled away
between slow taps.

Real-browser check (Playwright fake clock): one tap, then idle → loss at
60.0 s, `reason: time`; centre spam 6/s → win at 25 s with 166 pumps and
107 eruptions, max chain 9.

#### Telemetry fields (v7)

`reason` on a loss: `time`. `stats`: `eruptions`, `pumps`, `siphons`,
`siphon_hits` (siphons that set off an eruption), `max_chain` (most
eruptions in one tick or one siphon), `pressure` (total left on the board).
`time` is the round clock (paused ticks don't count). New round mid-round
posts nothing.

### Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v6 sandbox, 1 session of 64 s: **all 6 achievements unlocked** (no bot
earns all six), so they may be too easy for a human using both verbs. A
second player: 13 s of play, First Eruption only, then left. No v7 round
data yet, so no human win rate.

### Open ideas / known limits

- **Fixed in v6: eruption storms sustained themselves** (4 × 40 > 100).
  Now `ERUPT_BLAST` 24; all bots settle. Watch for the opposite problem:
  play may feel too calm. If so, try 25 (break-even, occasional storms that
  still burn out) before anything larger.
- Siphon is rarely needed. Only a deliberate strike pattern earns Siphon
  Strike or Plumber; pumping alone reaches 4 of 6 achievements.
- **The v7 round is a speed test** (Balance (v7)). A goal where decisions
  matter could come from making bleed slower, or charging it per action
  instead of per second (as Orbit Garden v6 did for wither, see
  `docs/findings.md`). Or add a goal only siphon can reach, such as making
  marked cells erupt. Compare the human win rate and `pumps` against the
  bot table first: a human at ~3 taps/s is right at the limit.
- Not yet hand-played on a phone.


## History (per-version summary)


- v1: first game (pump and siphon, bleed, eruptions). v2: per-game
  achievements, fits its frame. v3: cabinet support. v4: cleanup pass.
  v5: sharp rendering at screen resolution. Versions 2–5 were platform
  changes with little or no gameplay change. v6: `ERUPT_BLAST` 40 → 24 so
  storms burn out.
- v7: a 60 s round (100 eruptions to win) with `arcade:result`, reason
  and stats; free play after the round; Reset renamed New round.


## Balance (v6 sandbox, superseded: 120 s sessions, no round)

Bots act `rate` times per second. "Storm" = the first tick with 100+
eruptions (the board flashing white). "Settles" = no eruptions within 20 s
of the bot stopping.

| Bot | what it does | storm | settles | eruptions / 120 s (v5) |
|---|---|---|---|---|
| spam3 | pump the centre, 3/s | – | 100% | 411 (780k) |
| spread3 | pump random cells, 3/s | – | 100% | 240 (350k) |
| spread6 | pump random cells, 6/s | – | 100% | 753 (590k) |
| sweep3 | pump the lowest cell, 3/s | @85 s | 100% | 100 (1.8k) |
| sweep6 | pump the lowest cell, 6/s | @44 s | 100% | 400 (4.9k) |
| strike3 | pump two neighbours, siphon one into the other | – | 100% | 150 (1.1M) |

The sweep bots' "storm" is one whole-board wave (every cell tips at once),
which then burns out. Sweep of `ERUPT_BLAST` (30 runs, settles / spread6
storms): 40 → 3–7% / 100%; 30 → 100% / 100%; 25 → 100% / 37%; 24 → 100% /
0%; 20 → 100% / 0% but Chain Reaction gone for spam3 and Century gone for
strike3. 24 is the highest value that is strictly lossy (4 × 24 < 100).

Median seconds to each achievement (share of runs, within 120 s):

| Bot | First Pop | Chain Reaction | Siphon Strike | Plumber | Full Pressure | Century |
|---|---|---|---|---|---|---|
| spam3 | 3 s | 25 s | – | – | 86 s | 56 s |
| spread3 | 68 s | 74 s | – | – | 47 s | 92 s |
| sweep3 | 85 s | 85 s | – | – | 28 s | 85 s |
| strike3 | 4 s | – | 4 s | 39 s | 105 s | 99 s |

Century is now earned (45–99 s) rather than free with the first storm.

Real-page check (Playwright clicks, 3 taps/s on random cells, v6): no
eruptions for 60 s, 68 by 80 s, then none in 20 s idle. (v5: 84k by 80 s,
never settled.)

## Player data before v7 (older logs)


v6: sandbox, 1 session of 64 s, **all 6 achievements unlocked in that
session** (bots take 28–105 s per achievement, and no bot earns all six;
Siphon Strike and Plumber come only from strike3). The achievements may be
too easy for a human who uses both verbs. No rounds, so no win rate.

Overnight (2026-09-28, a second player): 1 session of 13 s play (21 s
open), First Eruption only, then left. One short visit: no conclusion.


## Notes before the split (2026-09-30)

Original header text (before the current-file rewrite).

# Pressure Grid: design notes

Current: **v7** (playtest: https://claude.ai/artifact/6XdvHNUwNZx9LdbutZBSuL). The arcade's first game and its structural reference
(`docs/adding-a-game.md`). Mechanics: **pump** (tap a cell: +pressure) and
**siphon** (drag from a cell toward a neighbour: move 60% of it, 15% lost),
sharing **pressure per cell**. A passive system bleeds pressure into
neighbours every tick. Cells at the threshold erupt: they empty and blast
their neighbours, which can chain. **Round (v7): make `TARGET` (100)
eruptions within `ROUND_S` (60 s)**; the clock starts at the first pump or
siphon. Win or loss posts `arcade:result`, then the board stays open for
free play until New round. Until v6 it was a sandbox with no round. 6
achievements (in `games/games.json`).

**Known flaw, accepted for now:** the round is a tapping-speed test (see
Balance (v7)). It was added to get human win rates and round data. A goal
where decisions matter needs a redesign (below).

Feedback: one 3/5 test rating on v5 (2026-09-27). No telemetry sessions
recorded yet.

