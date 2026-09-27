# Pressure Grid: design notes

Current: **v5**. The arcade's first game and its structural reference
(`docs/adding-a-game.md`). Mechanics: **pump** (tap a cell: +pressure) and
**siphon** (drag from a cell toward a neighbour: move 60% of it, 15% lost),
sharing **pressure per cell**. A passive system bleeds pressure into
neighbours every tick. Cells at the threshold erupt: they empty and blast
their neighbours, which can chain. **Sandbox: no win or loss**, so it never
posts `arcade:result` and telemetry only records sessions. 6 achievements
(in `games/games.json`).

Only feedback so far: 3/5 on v1, "It is alright." (2026-09-26).

## Key constants (`games/pressure-grid.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| GRID_SIZE | 10×10 | TICK_MS | 200 (5 ticks/s) |
| CLICK_ADD | 30 | BLEED_RATE | 0.15 of a cell per tick, split among neighbours |
| ERUPT_THRESHOLD | 100 | ERUPT_BLAST | 40 to each neighbour |
| SIPHON_FRACTION / _EFFICIENCY | 0.6 / 0.85 | DRAG_THRESHOLD_PX | 12 |

Eruptions resolve in up to 20 passes per tick (`resolveEruptions`, `guard`).
An interior eruption removes ≥100 and adds 160 (4 × 40), so **eruptions
create pressure**; only corners lose any. Bleed conserves pressure and
siphons lose 15%.

## Layout

400×400 board (40 px cells), scaled to fit. A stat line below
(ticks · eruptions · siphons) and a Reset button.

## Balance (v5, `node scripts/balance-pressure-grid.mjs 100`, 120 s sessions)

Bots act `rate` times per second. "Storm" = the first tick with 100+
eruptions (the board flashing white). "Settles" = no eruptions within 20 s
of the bot stopping.

| Bot | what it does | storm | settles | eruptions / 120 s |
|---|---|---|---|---|
| spam3 | pump the centre, 3/s | @9 s | 0% | 780k |
| spread3 | pump random cells, 3/s | @68 s | 3% | 350k |
| spread6 | pump random cells, 6/s | @32 s | 5% | 590k |
| sweep3 | pump the lowest cell, 3/s | @85 s | 100% | 1.8k |
| sweep6 | pump the lowest cell, 6/s | @44 s | 100% | 4.9k |
| strike3 | pump two neighbours, siphon one into the other | @11 s | 0% | 1.1M |

Median seconds to each achievement (share of runs, within 120 s):

| Bot | First Pop | Chain Reaction | Siphon Strike | Plumber | Full Pressure | Century |
|---|---|---|---|---|---|---|
| spam3 | 3 s | 8 s | – | – | – | 9 s |
| spread3 | 68 s | 68 s | – | – | 47 s (97%) | 68 s |
| sweep3 | 85 s | 85 s | – | – | 28 s | 85 s |
| strike3 | 4 s | 10 s | 4 s | 19 s | – | 11 s |

Real-page check (Playwright clicks, 3 taps/s on random cells): no eruptions
for 60 s, then 84k eruptions by 80 s. With 10 s of taps on one cell: 197
eruptions, then it settled.

## Open ideas / known limits

- **Eruption storms sustain themselves.** Once the board holds about 7.5k
  pressure (an average of ~75 a cell), eruptions feed on themselves: about
  1,400 per tick, the board stays white, and it usually never settles until
  Reset. There is no middle ground: 60 s of calm, then a permanent storm.
  Century is effectively free, and the eruption counter becomes meaningless.
  Cause: `ERUPT_BLAST` × 4 > `ERUPT_THRESHOLD`. Revision candidates: make an
  eruption lose pressure (e.g. `ERUPT_BLAST` 20–24), add a drain (edges
  vent, or eruptions leave the cell with a cooldown), or cap passes per tick
  lower. Re-run the bots after any change; the target is storms that burn
  out on their own.
- This is the roadmap's example finding in action: a self-reinforcing
  passive system plays itself. Record it in `docs/findings.md` when that
  exists.
- Siphon is rarely needed. Only a deliberate strike pattern earns Siphon
  Strike or Plumber; pumping alone reaches 4 of 6 achievements.
- Sandbox with no goal, so telemetry shows session length only. The v1
  rating (3/5, "It is alright.") fits the lack of stakes.
- Not yet hand-played on a phone.

## History

- v1: first game (pump and siphon, bleed, eruptions). v2: per-game
  achievements, fits its frame. v3: cabinet support. v4: cleanup pass.
  v5: sharp rendering at screen resolution. Versions 2–5 were platform
  changes with little or no gameplay change.
