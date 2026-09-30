# Pressure Grid: design notes

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

## Key constants (`games/pressure-grid.html`, top of the script)

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

## Layout

400×400 board (40 px cells), scaled to fit. A status line below (the goal
before the first input, then seconds left · eruptions/100 · siphons, then
the result and free-play counts) and a New round button.

## Balance (v7 round, `node scripts/balance-pressure-grid.mjs 100`)

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

### Telemetry fields (v7)

`reason` on a loss: `time`. `stats`: `eruptions`, `pumps`, `siphons`,
`siphon_hits` (siphons that set off an eruption), `max_chain` (most
eruptions in one tick or one siphon), `pressure` (total left on the board).
`time` is the round clock (paused ticks don't count). New round mid-round
posts nothing.

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v6 sandbox, 1 session of 64 s: **all 6 achievements unlocked** (no bot
earns all six), so they may be too easy for a human using both verbs. A
second player: 13 s of play, First Eruption only, then left. No v7 round
data yet, so no human win rate.

## Open ideas / known limits

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

History (older versions, balance tables, playtests): `docs/history/pressure-grid.md`
