# Pressure Grid: design notes

Current: **v6**. The arcade's first game and its structural reference
(`docs/adding-a-game.md`). Mechanics: **pump** (tap a cell: +pressure) and
**siphon** (drag from a cell toward a neighbour: move 60% of it, 15% lost),
sharing **pressure per cell**. A passive system bleeds pressure into
neighbours every tick. Cells at the threshold erupt: they empty and blast
their neighbours, which can chain. **Sandbox: no win or loss**, so it never
posts `arcade:result` and telemetry only records sessions. 6 achievements
(in `games/games.json`).

Feedback: 3/5 on v1, "It is alright." (2026-09-26); one 3/5 test rating on v5
(2026-09-27). No telemetry sessions recorded yet.

## Key constants (`games/pressure-grid.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| GRID_SIZE | 10×10 | TICK_MS | 200 (5 ticks/s) |
| CLICK_ADD | 30 | BLEED_RATE | 0.15 of a cell per tick, split among neighbours |
| ERUPT_THRESHOLD | 100 | ERUPT_BLAST | 24 to each neighbour (was 40 until v6) |
| SIPHON_FRACTION / _EFFICIENCY | 0.6 / 0.85 | DRAG_THRESHOLD_PX | 12 |

Eruptions resolve in up to 20 passes per tick (`resolveEruptions`, `guard`).
An interior eruption removes ≥100 and adds 96 (4 × 24), so **every
eruption loses pressure** (edges and corners lose more) and storms burn out.
Before v6 it added 160 and storms sustained themselves. Bleed conserves
pressure and siphons lose 15%.

## Layout

400×400 board (40 px cells), scaled to fit. A stat line below
(ticks · eruptions · siphons) and a Reset button.

## Balance (v6, `node scripts/balance-pressure-grid.mjs 100`, 120 s sessions)

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

## Open ideas / known limits

- **Fixed in v6: eruption storms sustained themselves** (4 × 40 > 100).
  Now `ERUPT_BLAST` 24; all bots settle. Watch for the opposite problem:
  play may feel too calm. If so, try 25 (break-even, occasional storms that
  still burn out) before anything larger.
- Siphon is rarely needed. Only a deliberate strike pattern earns Siphon
  Strike or Plumber; pumping alone reaches 4 of 6 achievements.
- Sandbox with no goal, so telemetry shows session length only. The v1
  rating (3/5, "It is alright.") fits the lack of stakes.
- Not yet hand-played on a phone.

## History

- v1: first game (pump and siphon, bleed, eruptions). v2: per-game
  achievements, fits its frame. v3: cabinet support. v4: cleanup pass.
  v5: sharp rendering at screen resolution. Versions 2–5 were platform
  changes with little or no gameplay change. v6: `ERUPT_BLAST` 40 → 24 so
  storms burn out.
