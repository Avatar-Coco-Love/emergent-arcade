# Orbit Garden: design notes

Current: **v6**. Mechanics: **place** (tap the sky: a planet) and **fling**
(drag up from anywhere: a seed from the launcher), sharing **planet mass**.
Place creates mass, landed seeds add it, mass sets gravity, and every fling
withers every planet by `WITHER_PER_FLING`. Win: 3 planets blooming
(mass ≥ `BLOOM_MASS`) at the same time. Lose: all 40 seeds used and none in
flight. 6 achievements (in `games/games.json`); Frugal = win with 15+ seeds
left.

Playtest (private artifact, v6): https://claude.ai/artifact/LgWCoWvU5hTLxUqGUDbWms

## Key constants (`games/orbit-garden.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_SEEDS | 40 | GOAL_BLOOMS / MAX_PLANETS | 3 / 5 |
| PLANET_START_MASS | 1.5 | SEED_MASS | 1 |
| BLOOM_MASS | 5 | WITHER_PER_FLING / DEAD_MASS | 0.11 / 0.3 |
| G / SOFTEN | 900000 / 15 | SEED_LIFETIME | 10 s |
| FLING_POWER / MAX_DRAG | 1.8 per px / 140 px | MAX_AIM_ANGLE | 75° from straight up |
| PREVIEW_STEPS | 40 (≈ 0.67 s of path) | | |

Planet radius = `6 + 5·√mass` (≈ 12 px new, ≈ 17 px blooming).

Seed maths: wither is per seed flung, not per second, so there is no clock
pressure: the round is a budget of 40 flings. A new planet needs ~5 landed
seeds to bloom (every fling, hit or miss, costs each planet 0.11). A
blooming planet drops below 5 after about 5 flings aimed elsewhere. The round
clock (`elapsed`) only counts unpaused time and is used for
`arcade:result`.

## Layout (400×600)

Launcher at (200, 566). No planets below y = 500 or within 8 px of another
planet. Status line and Reset sit below the canvas. The end card has an
input lock of `END_INPUT_LOCK_MS` = 1 s.

## Balance (v6, `node scripts/balance-orbit-garden.mjs 200`, ±3–4 pts)

Bots place 3 planets at the start (triangle: (110,320), (290,320),
(200,170)), then fling one seed every `gap` s. Aim is one of three kinds,
then Gaussian noise (σ in degrees; the same σ in % on power):
`search` tries drag vectors on the full predicted path (knows more than a
player can see); `preview` sees only the in-game dotted preview and extends
it in a straight line (the closest model of a human); `straight` drags
straight at the target at full power.

| Bot | aim | feed | gap | v5 win | **v6 win** | seeds used (wins) | time (wins) |
|---|---|---|---|---|---|---|---|
| perfect | search, σ 0 | lightest first | 1.5 s | 100% | 100% | 21 | 31 s |
| even2 | search, σ 2° | lightest first | 1.5 s | 96% | 64% | 30 | 45 s |
| even5 | search, σ 5° | lightest first | 1.5 s | 81% | 54% | 36 | 54 s |
| serial2 | search, σ 2° | one at a time | 1.5 s | 93% | 89% | 31 | 45 s |
| slow2 | search, σ 2° | lightest first | 3 s | 8% | 57% | 34 | 100 s |
| fast2 | search, σ 2° | lightest first | 0.5 s | | 96% | 29 | 14 s |
| naive | straight, σ 2° | lightest first | 1.5 s | 100% | **1%** | 39 | 58 s |
| naive5 | straight, σ 5° | lightest first | 1.5 s | 14% | 0% | | |
| preview2 | preview, σ 2° | lightest first | 1.5 s | | **94%** | 21 | 31 s |
| preview5 | preview, σ 5° | lightest first | 1.5 s | | **36%** | 31 | 46 s |
| pslow2 | preview, σ 2° | lightest first | 3 s | | 93% (100 runs) | 21 | 61 s |
| pfast2 | preview, σ 2° | lightest first | 0.5 s | | 42% (100 runs) | 35 | 18 s |
| close2 | search, σ 2°, tight cluster | lightest first | 1.5 s | 99% | 87% | 27 | 40 s |

Readings:
- Straight aim is dead (100% → 1%): you have to read the curve.
- Cadence: for preview aim, 3 s and 1.5 s win the same, and spamming every
  0.5 s drops to 42% (masses change while seeds are still flying). The
  search bot still gains from spam (96%): it picks long swing shots and
  lands a burst of them before the wither catches up. A human can't plan
  those without seeing the whole path, so it's a harness artifact, but
  watch for it in telemetry (very short won rounds).
- Skill spread: a precise preview reader wins 94%, a sloppy one (σ 5°) 36%.
  v5 had 81% for σ 5° even with the search bot.
- WITHER_PER_FLING is steep: 0.09 → even2 92%, 0.11 → 64–67%, 0.13 → 42%.

Achievements (preview2): Green Thumb 97%, Frugal 61%, Gravity Assist 12%
(search bots 100%, since they choose swing shots). Full Sky is never
earned by these bots (they place only 3).

## Player data (2026-09-28: `fetch-telemetry.mjs`)

v5: 2 rounds, 2 wins, both on a first try. One tester (touch) won in
**23 s**, faster than every bot (naive 32 s, perfect 35 s at a 1.5 s fling
gap), as the "fast play wins easily" idea predicted. A second player won in
**52 s** with all 4 achievements (First Bloom, Green Thumb, Full Sky,
Garden Complete). Both were never in danger, and that is why v6 was made.
No v6 data yet.

## Open ideas / known limits

- Check v6 with telemetry: win rate should drop well below 2/2, and a round
  under ~20 s would mean spamming still pays for humans.
- A first-time player who aims straight will lose (naive 1%). The preview
  shows the curve from the first shot, and a round lasts 40 flings, so there
  is time to learn. If new players lose their first round and leave, add a
  hint after 3 straight misses ("Seeds curve: follow the dotted line").
- Gravity Assist is free for search bots but only 12% for preview aim:
  probably fine now. Consider it again after player data.
- Feeding one planet at a time (serial2) beats feeding evenly (89% vs
  64%), because a blooming planet only needs topping up. The "big planets
  steal seeds" pressure is still mild.
- Not yet hand-played on a phone.

## History

- v1: first version (with per-game achievements). v2: cabinet support, win
  screen and aiming fixes. v3: cleanup pass (small bugs). v4: sharp
  rendering at screen resolution.
- v5: no gameplay change. Posts `arcade:result` when a round ends, and adds
  the `elapsed` round clock for it.
- v6 (difficulty): both v5 players won on a first try. Seeds are slower
  (FLING_POWER 2.6 → 1.8) and gravity is stronger (G 400k → 900k), so
  straight shots miss. Wither is per fling (0.11 per planet) instead of per
  second (0.06/s), so speed no longer beats it. The aim preview length is
  now a constant (PREVIEW_STEPS). Updated howToPlay text.
