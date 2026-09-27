# Wildfire Line: design notes

Current: **v1**. Mechanics: **cut** (drag) and **backburn** (tap), sharing
**fuel per ground cell** (40×60 grid, 10 px cells, 0–1). Win: the fire burns
out with at least 3 of 4 houses standing. Lose: a second house burns (the
round ends at once). 6 achievements (in `games/games.json`).

## How the fire works

- Each cell is fresh, burning or ash, and remembers its fire's origin (wild,
  backburn, or backburn lit during a wind warning) for achievements and
  "your backburn took a house".
- Spread: each burning cell tries each of its 8 neighbors at
  `SPREAD · neighborFuel · windFactor` per second, where
  `windFactor = max(WIND_MIN, 1 + WIND_PUSH·cos θ)` (×`DIAG` for diagonals).
  That's about 3.5× faster downwind, and a slow creep upwind. Nothing below
  `IGNITE_MIN` fuel catches. A cell burns `BURN_T · fuel` seconds (at least
  `BURN_MIN`), so the fire front is a wide band.
- Sparks: a **main-fire** cell with fresh grass directly downwind (the
  leading edge) throws a spark `EMBER_MIN`–`EMBER_MAX` cells downwind at
  `EMBER_RATE · fuel` per second. Sparks jump thin lines. Backburns don't
  throw sparks (lit low and tended); they only spread. This was the key
  balance change: with backburn sparks, burning out against a line lost
  houses in 10–30% of runs, and cut + backburn never beat cut-only.
- Wind: blows toward the village at the start. Every `WIND_EVERY` ± `WIND_JITTER` s
  it turns 45–135°, and with probability `WIND_TOWARD` it turns the way
  that blows more toward the village. The next heading shows as a blinking
  dashed arrow `WIND_WARN` s before the shift. The turn itself takes
  `WIND_TURN_T` s.
- Houses: 2×2 cells with no fuel. A house burns after `HOUSE_HEAT` s of
  burning cells in its ring (cumulative). It's blamed on your backburn if
  backburn cells outnumbered wild ones for most of that time.
- Cut: clears every fresh grass cell within `CUT_W` px of the stroke, in
  stroke order, at `CUT_COST · fuel` stamina each. It stops when stamina
  runs short ("Out of breath"). It can't cut burning cells, and ash is free
  (there's nothing to cut).
- Backburn: lights every fresh cell with fuel within `TORCH_R` px, then
  starts a `TORCH_COOL` s cooldown (only if something caught).
- Input: moving more than 10 px is a cut. A release within 300 ms without
  moving is a backburn at the press point.

## Key constants (`games/wildfire-line.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| FUEL_MIN / FUEL_MAX | 0.35 / 1.0 | YARD_Y / YARD_FUEL | 510 / ×0.9 |
| IGNITE_MIN | 0.15 | BURN_T / BURN_MIN | 12 s per fuel / 3 s |
| SPREAD / DIAG | 0.1 / 0.7 | WIND_PUSH / WIND_MIN | 2.5 / 0.15 |
| EMBER_RATE / EMBER_MIN–MAX / FLIGHT | 0.12 / 2–6 cells / 0.5 s | START_SPOTS | 3 |
| WIND_EVERY ± JITTER / WARN / TURN_T | 20 ± 3 s / 4 s / 1.2 s | WIND_TOWARD | 0.75 |
| STAM_MAX / STAM_REGEN | 100 / 6 per s | CUT_W / CUT_COST | 10 px / 6 × fuel |
| TORCH_R / TORCH_COOL | 20 px / 1.5 s | HOUSE_HEAT / LOSE_AT | 1.2 s / 2 houses |
| HOLD_N / STARVE_N / SWIFT_T | 60 / 20 / 60 s | | |

A full stamina bar cuts about 100 px of line in average grass. A
full-width line costs about 350 stamina, which is roughly when the front
arrives.

## Layout (400×600)

Fire starts as 3 spots of 2×2 cells along the top edge. Houses sit at
y 560, x 60 / 150 / 250 / 340. The meadow is seeded random each round:
smooth value-noise fuel, one pond (random, mid-field) and 3 small rock
outcrops. The wind indicator is in the top-right corner.

## Balance (v1, `node scripts/balance-wildfire-line.mjs 300`, ±3 pts)

| Bot | Win | 4/4 houses | Median length | Houses lost to own backburn |
|---|---|---|---|---|
| idle (no input) | 4% | 3% | 53 s | 0 |
| cut (2-row line at y 470/450, nearest the fire first; rings a house if fire gets past) | 53% | 47% | 66 s | 0 |
| cutburn (same, plus burning out right above finished sections ≥2 sections from any gap) | 74% | 70% | 69 s | 6 in 300 runs |
| burn (diagnostic: no cutting, backburn ahead of the fire when the wind blows back at it) | 3% | 2% | 51 s | 335 in 300 runs |

Cut + backburn beats cut-only by 21 points, and no input wins 4%. The
burn-only bot shows the risk: a backburn with no line behind it turns into
a second front at the next wind shift (Backfired in 58% of its runs).

Achievement rates (cutburn bot): Fight Fire with Fire 72%, Read the Wind
43%, Hold the Line 40% (cut bot 86%), Not a Scratch 70%, Swift 7%,
Backfired 1%.

Tuning path:
- The first pass (SPREAD 0.6, BURN_T 3) reached the village in 12 s.
- SPREAD 0.12–0.15 with short burns made the fire fizzle into a thin
  finger. Long burns (BURN_T 12) keep the front wide.
- CUT_COST 3 let cut-only win 100%.
- Burning out in sections next to gaps flanked round the ends.

## Open ideas / known limits

- Not hand-played on a real phone yet (rendered headlessly at 390×760, drag
  and tap tested with synthetic mouse input).
- Hold the Line counts expected main-fire spread attempts into cut ground
  (not literal events), so it's a "your line took a lot of heat" measure.
- Swift (under 60 s) is rare for bots (7%). It likely needs aggressive
  burning out early.
- Possible v2: a visible stamina cost preview while dragging, gusts (short
  wind-speed spikes), or a fixed hand-made map if players want to learn a
  layout.

## History

- v1: first version.
