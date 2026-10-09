# Orbit Garden: design notes

**v9** (2026-10-09, voyage: the depth pass; v8 keys and live region) · playtest: https://claude.ai/artifact/6eFwEmPgemRyQjpzhtDhun ·
balance: `node scripts/balance-orbit-garden.mjs 32` (voyages) or `… 40 preview5 '' --garden N`
Mechanics: **place** (tap the sky: a planet) and **fling**
(drag up from anywhere: a seed from the launcher), sharing **planet mass**.
Place creates mass, landed seeds add it, mass sets gravity, and every fling
withers every planet. A garden is won with `goal` planets blooming (mass ≥
`BLOOM_MASS`) at once, lost when its seeds run out with none in flight.
**Voyage** (v9): gardens in a row; leftover seeds + `REFILL` (max
`MAX_SEEDS`) start the next one; a lost garden is retried from its start
with the seeds it began with. Score = gardens bloomed in the voyage
(`score.epoch` 2; was fastest single garden). 9 achievements; Frugal =
a garden with ≤ 25 seeds used (same as "15+ left" in garden 1).

## Key constants (`games/orbit-garden.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_SEEDS | 40 | GOAL_BLOOMS / MAX_PLANETS | 3 / 5 |
| PLANET_START_MASS | 1.5 | SEED_MASS | 1 |
| BLOOM_MASS | 5 | WITHER_PER_FLING / DEAD_MASS | 0.11 / 0.3 |
| G / SOFTEN | 900000 / 15 | SEED_LIFETIME | 10 s |
| FLING_POWER / MAX_DRAG | 1.8 per px / 140 px | MAX_AIM_ANGLE | 75° from straight up |
| PREVIEW_STEPS | 70 (≈ 1.2 s of path; v5 40) | REFILL / MAX_SEEDS | 25 / 60 |
| DEEP_WITHER | +0.01 per lap | | |

Planet radius = `6 + 5·√mass` (≈ 12 px new, ≈ 17 px blooming).

Seed maths: wither is per seed flung, not per second, so there is no clock
pressure: a garden is a budget of flings. A new planet needs ~5 landed
seeds to bloom (every fling, hit or miss, costs each planet 0.11). A
blooming planet drops below 5 after about 5 flings aimed elsewhere. The round
clock (`elapsed`) only counts unpaused time and is used for
`arcade:result`.

## Gardens (`GARDENS`, `gardenDef()`)

Rocks: no pull, eat seeds, lumpy grey polygons. Moons: pull like a planet
of that mass, never grow, eat seeds, round with craters and faint rings.
Wild planets: ordinary planets placed at the start (they wither too).
No planet within 8 px of a rock or moon edge.

| # | Name | Goal | Adds |
|---|---|---|---|
| 1 | First garden | 3 | empty sky (v8's garden) |
| 2 | Rock field | 3 | rocks (45,300) and (200,110), r 18: catch wide swings |
| 3 | Dead moon | 3 | moon (200,330) mass 3 |
| 4 | Wild planets | 4 | wild (90,210) and (310,210), mass 4.5 |
| 5 | Twin moons | 3 | moons (50,250) and (350,250), mass 2 |
| 6 | Narrow gap | 3 | wall of 6 rocks at y 240, gap x 152–248 |
| 7 | Heavy moon | 3 | moon (200,105) mass 4.5, wild (200,230) 3, rocks low corners |
| 8 | Dry sky | 3 | wither 0.13, wild (200,150) 3.5, rock (340,440) |
| 9+ | "deep sky" laps | +1 from lap 2 | gardens 2–8 again, mirrored on odd laps, wither +0.01 per lap |

Random layouts were tried first for 9+: per-garden bot win rates swung
0%–100% (a rock or moon on the centre column blocks every good layout).

## Layout (400×600)

Launcher at (200, 566). No planets below y = 500. Garden, seeds, blooming
and planets sit below the canvas with Restart garden. The garden's intro
(name, seeds, goal, what's new) shows 6 s over the top of the sky, so
nothing sits above y ≈ 85. End card: Next garden (won) or Try garden N
again + New voyage (lost); input lock `END_INPUT_LOCK_MS` = 1 s.

Telemetry (`arcade:result`, one per garden): `level` garden, `run`,
`attempt`, `score` gardens bloomed, `reason` "seeds" on a loss, `stats`:
`start` seeds, `used`, `landed`, `lost`, `goal`.

## Balance (v9 voyage, 32 voyages per bot)

Bots place planets themselves (spots 50+ from rocks and moons, 90+ apart,
not behind another planet as seen from the launcher, never right above the
launcher), fling every `gap` s at the lightest unbloomed planet by the
dotted preview (σ in degrees and %), retry a lost garden up to 3 times,
then quit. Voyage time adds 8 s per garden for reading and placing.

| Bot | σ / gap | bloomed (p25–p75) | voyage | 1st-try win %, gardens 1–12 |
|---|---|---|---|---|
| preview5 (casual) | 5° / 2 s | **4** (2–5) | 9.7 min | 78 100 31 65 35 40 88 100 88 38 17 40 |
| preview3 | 3° / 2 s | **18** (16–18) | 21.8 min | 100 100 91 97 97 100 100 100 100 84 97 100 |
| preview2 (skilled) | 2° / 1.5 s | **19** (18–19) | 16.9 min | 100 100 84 100 100 100 100 100 100 94 100 100 |

- preview5 matches v6 humans on garden 1 (78% vs 70%). Its walls are
  garden 3 (dead moon, 31%) and 5 (twin moons, 35%).
- Skilled runs end in lap 2 (gardens 16–22: bloom 4, wither 0.12–0.14);
  seeds pile up at `MAX_SEEDS` 60 by garden 8, so the cap is the brake.
- Bot layout matters more than the garden: a planet behind another (seen
  from the launcher) took garden 2 from 97% to 3% for preview5.



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
  Keys-only playthrough (live region only): 40 flings, 31 landed, all
  31 "reaches" shots hit; 9 at a planet past preview reach all missed.
  With that planet lower: won, 18 of 18 landed, 22 seeds left.

## Open ideas / known limits

- Watch v9 telemetry per level: where casual players stop (bots: gardens
  3 and 5), and whether anyone retries past 3 times.
- Keys/screen reader: N aims straight at a planet (misses); rocks and
  moons are named when the cursor or the dots reach them, not listed.
- Deep laps reuse gardens 2–8; new hand-made gardens (moving comet,
  a moon that drifts) would freshen laps 2+.
- **User's v10 wishlist (2026-10-09), propose options before building:**
  preset worlds with planets already placed (v9 has a few wild planets);
  planets of different sizes; different space backdrops; planet colours
  or textures; different kinds of blooms; asteroid storms (moving rocks
  shooting across the screen); more achievements. Let v9 playtest
  feedback decide which come first.
- Feeding one planet at a time still beats feeding evenly.
- Not yet hand-played on a phone.

History (older versions, balance tables, playtests): `docs/history/orbit-garden.md`
