# Orbit Garden: design notes

**v8** (2026-10-05, keys, live region, reduced motion; v7 canvas label; v6 2026-09-28) · playtest: https://claude.ai/artifact/LgWCoWvU5hTLxUqGUDbWms ·
balance: `node scripts/balance-orbit-garden.mjs 200`
Mechanics: **place** (tap the sky: a planet) and **fling**
(drag up from anywhere: a seed from the launcher), sharing **planet mass**.
Place creates mass, landed seeds add it, mass sets gravity, and every fling
withers every planet by `WITHER_PER_FLING`. Win: 3 planets blooming
(mass ≥ `BLOOM_MASS`) at the same time. Lose: all 40 seeds used and none in
flight. 6 achievements (in `games/games.json`); Frugal = win with 15+ seeds
left.

## Key constants (`games/orbit-garden.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_SEEDS | 40 | GOAL_BLOOMS / MAX_PLANETS | 3 / 5 |
| PLANET_START_MASS | 1.5 | SEED_MASS | 1 |
| BLOOM_MASS | 5 | WITHER_PER_FLING / DEAD_MASS | 0.11 / 0.3 |
| G / SOFTEN | 900000 / 15 | SEED_LIFETIME | 10 s |
| FLING_POWER / MAX_DRAG | 1.8 per px / 140 px | MAX_AIM_ANGLE | 75° from straight up |
| PREVIEW_STEPS | 70 (≈ 1.2 s of path; v5 40) | | |

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

## Balance (v6, ±3–4 pts)

Bots place 3 planets at the start (triangle: (110,320), (290,320),
(200,170)), then fling one seed every `gap` s. Aim is one of three kinds,
then Gaussian noise (σ in degrees; the same σ in % on power):
`search` tries drag vectors on the full predicted path (knows more than a
player can see); `preview` sees only the in-game dotted preview and extends
it in a straight line (the closest model of a human); `straight` drags
straight at the target at full power.

| Bot | aim | feed | gap | **v6 win** | seeds used (wins) | time (wins) |
|---|---|---|---|---|---|---|
| perfect | search, σ 0 | lightest first | 1.5 s | 100% | 21 | 31 s |
| even2 | search, σ 2° | lightest first | 1.5 s | 64% | 30 | 45 s |
| even5 | search, σ 5° | lightest first | 1.5 s | 54% | 36 | 54 s |
| serial2 | search, σ 2° | one at a time | 1.5 s | 89% | 31 | 45 s |
| slow2 | search, σ 2° | lightest first | 3 s | 57% | 34 | 100 s |
| fast2 | search, σ 2° | lightest first | 0.5 s | 96% | 29 | 14 s |
| naive | straight, σ 2° | lightest first | 1.5 s | **1%** | 39 | 58 s |
| naive5 | straight, σ 5° | lightest first | 1.5 s | 0% | | |
| preview2 | preview, σ 2° | lightest first | 1.5 s | **100%** | 20 | 30 s |
| preview5 | preview, σ 5° | lightest first | 1.5 s | **66%** | 30 | 45 s |
| pslow2 | preview, σ 2° | lightest first | 3 s | 100% | 19 | 55 s |
| pfast2 | preview, σ 2° | lightest first | 0.5 s | 66% | 33 | 16 s |
| close2 | search, σ 2°, tight cluster | lightest first | 1.5 s | 87% | 27 | 40 s |

Readings:
- Straight aim is dead (100% → 1%): you have to read the curve.
- Cadence: for preview aim, 3 s and 1.5 s win the same (100%), and spamming
  every 0.5 s drops to 66% (masses change while seeds are still flying). The
  search bot still gains from spam (96%): it picks long swing shots and
  lands a burst of them before the wither catches up. A human can't plan
  those without seeing the whole path, so it's a harness artifact, but
  watch for it in telemetry (very short won rounds).
- Skill spread: a precise preview reader wins 100%, a sloppy one (σ 5°) 66%.
  The bot reads the dotted line exactly, so humans should do worse.
- Preview length is a strong easing lever. At wither 0.11, σ 5° wins 36%
  with the 0.67 s preview and 66% with 1.2 s. The long preview plus wither 0.09
  gave σ 5° 83% and spam 99% (back to v5 ease), so we kept 0.11. The user
  found 0.11 fast and gravity high; this was their pick.
- WITHER_PER_FLING is steep: 0.09 → even2 92%, 0.11 → 64–67%, 0.13 → 42%.

Achievements (preview2): Green Thumb 100%, Frugal 79%, Gravity Assist 53%
(search bots 100%, since they choose swing shots). Full Sky is never
earned by these bots (they place only 3).

## Player data (2026-10-05: `fetch-telemetry.mjs`)

v6: 7 players, 10 rounds, human win rate 70%, win median 35 s, loss
median 46 s, first win after 2 rounds (median). v7: 2 rounds, 1 win (43 s).
Sessions median 70 s: far from the 10-minute target. v5 data: history.

## Accessibility (v8, `node scripts/a11y-audit.mjs orbit-garden`)

All six pass (3/3), and 2/2 on scripted late rounds (4 planets, 2
blooming, 9 seeds, seeds in flight, hint on; cursor or aim preview on).
- Keys (`// § keys`): arrows move a cursor while held (100 → 300 units/s
  over 0.6 s); Enter places a planet there (`placePlanet`). Space (or A)
  switches the arrows to aiming: ← → angle (±75°), ↑ ↓ strength (10–100%
  of `MAX_DRAG`); a tap steps 1° / 1%, held 0.3 s ramps 10 → 60 per s; the
  dotted preview shows. Space (or Enter) then flings the same drag vector
  (`fling`); aiming stays on for the next shot. N jumps to the next
  planet (aiming: points straight at it, a start, not a hit). Esc or A back
  to the cursor; Enter plays again. Tab free; Space/Enter on a focused
  button press it.
- Live region `#say` (`#msg` aria-hidden; `say()` speaks): planet placed
  (numbered 1–5, lowest free), what the cursor is on or whether a planet
  fits there, the aim once arrows are up ("Aim 12° left, strength 70%. The
  dotted line reaches planet 2" / "ends 40 units above planet 3": only
  what the preview shows), flung / landed on planet n with its mass /
  lost, blooming and wilting below bloom, withered away, the result.
- `#msg` on a dark backing (planets can sit under it). DOM text only,
  13.6 px+, 7.2:1+.
- Reduced motion: the petals' spin is on `deco()` (0 when reduced). The
  audit's pass was timing: petals exist only once a planet blooms. Idle,
  2 blooming: v7 0.71–0.94% reduced; v8 0.00%; planets hidden 0.00%
  (3 runs). Seeds and trails are the game and still fly.
- Colour: bloom is told by petals (shape), growth by the ring's length;
  the brown → green body ramp merges to olive for deutans and protans, but
  carries nothing else.
- Bots reproduce v7 exactly (200 runs × 13 bots; old file twice first).
  Keys-only playthrough: KEYS_RESULT.

## Open ideas / known limits

- Accessibility: a real screen reader and keyboard player are the test.
  N aims straight at a planet, which misses (naive 1%); a blind player
  sweeps from there by the spoken preview. A "sweep until it reaches" key
  would aim for them, more than a sighted player gets.
- v6 telemetry: 70% won (10 rounds), win median 35 s. Keep watching for
  rounds under ~20 s (spamming paying for humans).
- A first-time player who aims straight will lose (naive 1%). The preview
  shows the curve from the first shot, and a round lasts 40 flings, so there
  is time to learn. If new players lose their first round and leave, add a
  hint after 3 straight misses ("Seeds curve: follow the dotted line").
- Gravity Assist is free for search bots and 53% for preview aim.
  Frugal is 79% for a precise preview reader: maybe too easy. Consider it again after player data.
- Feeding one planet at a time (serial2) beats feeding evenly (89% vs
  64%), because a blooming planet only needs topping up. The "big planets
  steal seeds" pressure is still mild.
- Not yet hand-played on a phone.

History (older versions, balance tables, playtests): `docs/history/orbit-garden.md`
