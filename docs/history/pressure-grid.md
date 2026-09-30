# Pressure Grid: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/pressure-grid.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

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

