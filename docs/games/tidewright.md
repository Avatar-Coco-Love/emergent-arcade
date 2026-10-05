# Tidewright: design notes

**v2** (2026-10-05, canvas label; v1 2026-09-30) · playtest: https://claude.ai/artifact/6y3SvqHNfdbqdzaVQeVuwk (private, republished each push) ·
balance: `node scripts/balance-tidewright.mjs 200`
Verbs: **shore up** (flick) and **sluice** (tap), sharing **wall height `H`
and standing water `W` per column** (32 columns). Endless: seasons of 6
waves (each a `win`), until the village floods (mean `W` ≥ `FLOOD_D`).
Score: waves held in the run. 5 achievements. Brief: `docs/ideas/tidewright.md`.

## How it works

- View from the village: the wall's columns run left to right, the sea
  rises *behind* them (not the brief's cross-section, which can't have a
  rogue wave "at one column"). A blue line shows the sea level through the
  wall; a white step line shows the next crest (with the rogue bump).
- Each wave: calm (`CALM_T`), then the sea rises from its calm level to the
  crest (`RISE`, `HOLD`, `FALL`). Where the sea beats `H[i]`, water pours
  over (`OVER·excess^1.5`) and scours the column (`SCOUR`), so a breach
  deepens itself. From wave `LEAK_FROM`, water seeps through every column
  while the wave stands above the calm sea (`LEAK`), and standing water
  deeper than `WET_D` wears the wall down (`ERODE`). Each wave slumps every
  column by `SLUMP` of its height.
- `W` spreads between neighbours (`FLOW`). An open gate drains its column
  down to `max(SILL, sea)`; when the sea stands higher, it bursts in
  (`GATE_Q·head`) and spreads over ±`JET` columns.
- Flick: sand lands on the column under the press (±1 neighbour, 25/50/25,
  skewed up to 0.2 by a sideways swipe); speed sets 3-9 sand. Into water
  deeper than `WET_D`, only down to `WASH` of it stays (whiff if < 60%).
  Sand pile `AMMO_MAX`, refills `AMMO_RATE`/s.
- Events (fixed waves 4-12, then 2 random per wave from 13, 3 from 19):
  rogue (+`ROGUE` on one column), rain (`RAIN` on every column), spring
  tide (sea at `SPRING_B`, above the sills and the flood line, until it
  ebbs halfway through the calm; never twice in a row), double (a second
  crest `DOUBLE_GAP` s later), storm (4 columns cut by `STORM_CUT`, slump ×3).
- Season end: `win` result, wall +`REPAIR`, water halved, full sand.
  A loss offers "Retry season" (snapshot at season start) or "New run".
- Gesture: moving `FLICK_PX` makes a flick (fired on release or
  `FLICK_WAIT` ms later), speed from the pointer events' own timestamps; a
  press under `TAP_SLOP`/`TAP_MS` is a tap (gates only; elsewhere a hint).
  Keys: ← → cursor, hold Space (`CHARGE_S` = biggest), 1-4 gates.

## Key constants (top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| C0 / CG | 24 / +1 per wave | CALM_T | 12, 16, 22 s |
| CALM_B / SPRING_B / SILL | −8 / 26 / 0.5 | EBB / EBB_T | 0.5 / 3 s |
| RISE / HOLD / FALL / DOUBLE_GAP | 2.5 / 2 / 2.5 / 6 s | ROGUE / STORM_CUT | 10 / 6 |
| OVER / SCOUR | 2 / 0.08 | LEAK / LEAK_FROM | 0.035 / wave 3 |
| GATE_Q / JET / FLOW | 2 / 4 / 6 | RAIN / ERODE | 0.09 / 0.005 |
| WET_D / WASH / FLOOD_D | 2 / 0.3 / 24 | SLUMP / REPAIR | 3% / +4 |
| AMMO_MAX / AMMO_RATE | 40 / 4.5 per s | S_MIN / S_MAX | 3 / 9 |
| FLICK_PX / TAP_SLOP / TAP_MS | 16 px / 10 px / 450 ms | V_LO / V_HI | 0.25 / 1.4 px/ms |

A normal cycle is 29 s; wave 1 hits at 12 s (first wave over at 19 s).

## Layout (400×600)

Wall on ground at y 440 (4.2 px per height unit, 95 max). Gate doors at
columns 4, 12, 19, 27; their handles (r 21) at y 488 with OPEN/SHUT. Seven
houses at y 562 fill with water as the flood meter rises. Top strip: season,
wave, the wave's events, countdown. Bar: waves held, sand, flood.

## Balance (`node scripts/balance-tidewright.mjs 200`)

Waves held p10/median/p90, share reaching wave 10/15/20, median minutes.

| Bot | Waves | ≥10 / ≥15 / ≥20 | Min | Losses |
|---|---|---|---|---|
| novice (builds where the wall looks low, reads the crest only when it turns orange, aim ±1.3, random sizes, gates only after the hint, 3 wrong taps, forgets to shut 1 in 4, ignores spring half the time) | 5 / 10 / 15 | 88 / 13 / 1% | 5.4 | seep 72, gate 25 |
| habit (full pellets on the lowest column, never a gate) | 5 / 5 / 5 | 0% | 2.6 | seep 100 |
| allShut (skilled building, never a gate) | 5 / 5 / 5 | 0% | 2.6 | seep 100 |
| allOpen (skilled building, all gates open) | 5 / 5 / 5 | 0% | 2.3 | gate 100 |
| timer (skilled building, opens every calm, shuts before crests, never reads water or tide) | 5 / 5 / 5 | 0% | 2.3 | gate 100 |
| skilled (drains when water stands and the sea is below the sills, shuts 2 s + lag before crests, builds dry columns to crest + 2.5, banks spare sand) | 19 / 20 / 22 | 100 / 100 / 84% | 11.6 | seep 85, overtop 15 |

Every bot survives waves 1-2 (100%). All four one-rule bots lose during wave 6 (the
spring tide ends season 1), so the first win needs both verbs. Sweeps
(skilled): lag 0.6 / 1.0 s → median 20 / 20; think 0.2 / 0.8 / 1.5 s → 20 /
20 / 16, so speed doesn't win, but one action per 1.5 s or slower costs ~4 waves.
Novice with lag 1.2, think 2 s: median 8.

**Not met: novice 4-6 (brief).** An honest novice holds 10. It loses
where it doesn't read (spring tides, forgotten gates, wet flicks: 55 of
106 flicks whiffed), but each mistake is recoverable by design (findings:
2-3 wrong taps must be survivable). Bots are optimistic for first-timers
(findings); check telemetry before tuning harder.

Achievements (skilled / novice): Breakwater 100 / 100%, Stand Firm (3
clean rogue waves) 100 / 23%, Sluice Master (drain half a flood in a wave,
no sea let in) 100 / 38%, Old Salt (18 waves) 95 / 2%, Dry Feet (a season
with water ≤ a third of the flood line) 11 / 2%.

## Telemetry

`arcade:result` per season: `level` (season), `run`, `attempt`, `score`
(waves held in the run), `reason` on a loss: `gate` (gate inflow ≥ 25% of
recent water), else `overtop` or `seep` (seepage, rain, and wall softened
by standing water ×`SOFT`), whichever brought more (30 s decay). `stats`:
`waves`, `peak_w` (highest mean water this season), `gate_open_s` (summed
over gates), `flicks`, `whiffs` (no sand, or < 60% kept in water).

## Player data

None yet.

## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): labels 8.5 px, "flood" at 1.3:1; red sluice handles merge with the wall for protanopia; ignores reduced motion.
- Novice target (see Balance); watch `reason` and `whiffs` in telemetry.
- The skilled bot's death is 85% `seep` (events it can't drain through);
  a human who pre-builds before springs may go further. Late waves are
  random combos, so a run's end is partly luck.
- The sand pile isn't drawn in the scene (the bar has the meter).
- The score only posts when a season ends (win at 6 waves, or a loss), so
  a run left mid-season records nothing: a player who held 4 waves and
  quit can still see "Your best 1". Candidate for v2: post the waves held
  on leaving (gallery support needed), or score per wave.
- Possible v2: gates that jam if opened under pressure; a second wall line.

History (tuning story, why each rule exists): `docs/history/tidewright.md`
