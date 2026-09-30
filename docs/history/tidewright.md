# Tidewright: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/tidewright.md`. Add new entries at the top of the relevant
section; sessions don't read this file by default.

## History

- v1 (2026-09-30): first version, from `docs/ideas/tidewright.md`.

## v1: departures from the brief and why

- **View.** The brief's side view (sea left, village right) is a
  cross-section, where a wave meets only the highest column; per-column
  overtopping, "a rogue wave aimed at one column" and gates at fixed
  columns need the columns to run along the wall. The game looks from the
  village at the wall, with the sea behind it. A sideways flick spreads sand
  along the wall instead of "toward sea or land".
- **Seepage as a water source.** With gates shut and a good wall, the
  brief's `W` only came from rain, so `allShut` survived. Water now seeps
  through the wall while a wave stands on it.
- **Flick vs drag.** Any press that moves `FLICK_PX` is a flick; speed only
  sets the size, so a slow drag throws the smallest pellet instead of doing
  nothing. Gates got large handles (a column is ~12 px on a phone).
- **Retry season.** Findings ask that a lost round can be retried from its
  start; the score stays "waves held in the run".
- **`timer` bot added** to test "only a bot that reads both `H` and `W`
  passes 15": opens gates every calm and shuts them before crests.

## v1 tuning, in order (100-run sweeps, median waves)

| Step | Problem | novice / habit / allShut / allOpen / timer / skilled | Fix |
|---|---|---|---|
| 1 | Sand runs out by wave 9 (slump + crest growth > refill) | 5 / 4 / 5 / 4 / 11 / 11 | Refill 3/s, crest +1/wave |
| 2 | allOpen lives to 9: sea let in through a gate drains back out the same gate; timer ≈ skilled: spring tide (sea 6) harmless | 16 / 8 / 8 / 9 / 17 / 16 | Gate inflow spreads ±4 columns, stronger gates, spring 12-16 |
| 3 | novice ≈ skilled: one breached column spreads to ~1 of mean water, sand not binding, novice bot read the crest perfectly | 16 / 8 / 7 / 5 / 15 / 17 | Breaches scour themselves, pile 40, novice builds reactively |
| 4 | timer passes 15: an open gate on a spring tide only fills to the sea's level, below the flood line | 12 / 8 / 7 / 5 / 15 / 18 | Spring tide at 26 (above the flood line) |
| 5 | A gate left open on a spring tide floods in ~2 s, faster than reaction; two spring tides in a row = certain death; no counterplay | 5 (bimodal) / 8 / 7 / 5 / 5 / 17 | Gate flow 2, spring ebbs late in the calm, no back-to-back springs |
| 6 | habit and allShut win season 1 without ever touching a gate | 12 / 8 / 7 / 5 / 5 / 21 | Seepage only from the wave above the calm sea (not the tide), ×3.5 |
| 7 | Skilled dies at wave 10: double wave then spring tide, erosion eats the whole sand income | 9 / 5 / 5 / 5 / 5 / 10 | Double gap 6 s, ebb at half the calm, erosion halved, flow 6, refill 4.5 |
| final | | 10 / 5 / 5 / 5 / 5 / 20 | |

Also fixed on the way: loss `reason` credited leak water that kept coming
after a gate flood (now `gate` at ≥ 25% of recent water); Sluice Master
was free for `allOpen` (it drained the sea it had let in) and Sealed Season
became impossible once gateless play lost season 1 (replaced by Dry Feet);
Stand Firm needed 3 rogue waves (1 was 100% for every bot); flick speed
read `performance.now()` at handler time, which frame-batched touch events
made slow (now the events' own timestamps).
