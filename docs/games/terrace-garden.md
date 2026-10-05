# Terrace Garden: design notes

**v3** (2026-10-05, canvas label; v2 2026-09-29) · playtest: https://claude.ai/artifact/HJwSo4d4qB6wGrm4RUZhEV ·
balance: `node scripts/balance-terrace-garden.mjs 100`
Mechanics: **tilt** (phone tilt, tilt bar, or ← → / A D) and **gate** (tap),
sharing the **water depth in every column** of a stepped hillside. A warm-up
and three gardens; no clock. Win a garden: every plant blooms. Lose it: the
water that can still reach the plants can't make them bloom (spilled, leaked,
drunk, or stranded), or the player restarts it. A lost garden is retried from
its start. Spring water left at a win carries to the next garden. 3
achievements (in `games/games.json`).

## How it works

- Hillside: `n` terraces (4 or 5), each `NC` = 12 columns × `CW` = 21 px,
  stepping down to the right. Floor of terrace `i`: `TOP_Y + i · (BOT_Y −
  TOP_Y)/(n−1)`. 1 water = 1 px deep over one column. Columns are virtual
  pipes: flow builds by `PIPE · (level diff + SLOPE · tilt)`, decays at
  `FRICT`, `SUB` substeps per 1/60 s. Full tilt settles at `SLOPE` px per
  column; the drawing leans `atan(SLOPE/CW)` (~15°).
- Gates at the right end of each terrace but the last: `gates[0]` is the
  spring valve, `gates[k]` ends terrace `k−1`. Outflow = `GATE_K · (depth −
  edge) · (1 + 2 · max(0, tilt))` per s; edge is `SILL` open, `WALL` shut (a
  full terrace pours over a shut gate). Lands on the terrace below at column
  10. The bottom terrace has a fixed `LIP`; over it is spilled.
- Spring: `SPRING_RATE` per s into column 0 of the top terrace while the
  valve is open and the tank isn't empty.
- Plants `[terrace, column, lo, hi]`: in `[lo, hi]` depth they grow (`GROW_T`
  s to bloom) and drink `DRINK`/s (28 each); outside they wait (dry: brown
  stem, deep: bubbles). Blooms are permanent. Cactus (`dry: true`) grows
  under `DRY_MAX`, blooms after `DRY_T` s dry, wilts in `ROT_T` s wet; it
  must be in bloom when the last thirsty plant blooms.
- Leak (garden 2): cracked terrace loses `LEAK` of each column's water per s.
- Loss check `hopeless()`: per thirsty plant, spring + water on its terrace
  and above must cover what it still drinks plus `minStand` (least standing
  water that reaches its band at full tilt); total water must cover all
  remaining drinking. Otherwise the player decides: "Restart garden"
  (`reason: restart`).
- Warm-up: 2 terraces, 130 water pre-placed, no spring (nothing carries
  over). Gate locked ("First tilt ◀...") until plant 0:1 blooms. No Spill and
  Gatekeeper don't count it.
- Stuck hint (`watchStall`/`findHint`): after `STALL_T` s with no gate
  flowing, slosh, or growth, points at a move for the topmost thirsty plant
  (else the cactus): gold chevrons + pulsing tilt bar, gate ring, or Restart
  button, plus a line naming the input. Spilling off the bottom while tilted
  right warns "Ease off ▶". White tick on each stake shows current depth.
  Logic detail: history, v2 section.
- Tilt input: target −1..1. Keys ±1 while held. Tilt bar (PC drag, touch
  without motion) follows the finger and springs back. Phone tilt is gravity
  along the screen width (`deviceorientation` + screen angle), zeroed at
  each garden's start, `MOTION_DEAD` 3° dead zone, full at `MOTION_FULL` 20°.
  iOS shows "Enable tilt". The mouse never tilts.

## Gardens

| # | Name | Terraces | Tank | Plants `[t, col, lo–hi]` | Twist |
|---|---|---|---|---|---|
| 0 | Warm-up | 2 | 0 (130 pre-placed) | 0:1 16–34, 1:9 8–26 | gate locked until the first bloom |
| 1 | First steps | 4 | 300 | 0:5 6–18, 1:2 14–28, 2:8 3–10, 3:4 6–16 | – |
| 2 | The cracked terrace | 5 | 440 | 0:3 8–20, 1:1 18–32 + 1:9 2–7, 2:6 10–22, 3:8 4–12, 4:2 10–20 | terrace 2 leaks |
| 3 | The dry corner | 5 | 400 | 0:8 6–14, 1:2 12–26 + 1:9 cactus, 2:5 16–30, 3:1 3–8 + 3:9 12–24, 4:6 8–18 | cactus |

Tanks are before carry-over (a reader carries ~100 into garden 2, ~150 into
garden 3). Warm-up: floors at y 300 and 470.

## Key constants (`games/terrace-garden.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| NC × CW | 12 × 21 px | TOP_Y / BOT_Y | 180 / 560 |
| BACK / WALL / SILL / LIP | 64 / 40 / 5 / 30 px | SLOPE | 5.5 px per column |
| PIPE / FRICT | 160 / 3 | GATE_K | 5 per s |
| SPRING_RATE | 18 per s | TILT_RATE | 2.5 per s |
| GROW_T / DRINK | 7 s / 4 per s | DRY_MAX / DRY_T / ROT_T | 1.5 px / 5 s / 1.5 s |
| LEAK | 0.04 per s | MOTION_FULL / MOTION_DEAD | 20° / 3° |
| GATE_R | 30 px | STEP / SUB | 1/60 s / 4 |
| STALL_T | 3 s (warm-up 1.5) | | |

## Layout (400×600)

Spring tank top-left with its valve over column 0; terraces are shelves on a
dark hill, gates are valves at their right ends (tap radius 30). Tilt gauge
top centre, message under it. Below the canvas: tilt bar (not on phones with
motion), Garden, Bloomed, Spring (not in warm-up), Enable tilt, Restart.

## Balance (v2, 100 runs, up to 3 tries per garden)

Per garden: first-try win % / any-try win %, median s for wins, median
spilled, spring water left. Skilled bots unchanged from v1.

| Bot | Run | Warm-up | Garden 1 | Garden 2 | Garden 3 |
|---|---|---|---|---|---|
| reader (0.5× / 2× also 100%) | 100% | 100 18 s | 100/100 55 s | 100/100 87 s, leak 135 | 100/100 66 s |
| slow-hands | 100% | 100 | 100 60 s | 100 99 s | 100 70 s |
| keys | 56% | 100 | 100/100 | 98/98 | 41/57 |
| novice | 100% | 100 | 100/100 | 100/100 | 100/100 |
| thrifty | 100% | 100 | 100/100 43 s | 100/100 | 100/100 |
| hinted (masher obeying hints, full tilt) | 0% | 100 | 83/99 | 0 (leak 468) | – |
| masher (tilts 10% of decisions) | 0% | 91 | 97/97 117 s | 0/2 | – |
| learner (masher, then reader) | 83% | 91 | 97 | 0/100 | 20/94 |
| masher-0 / no-tilt / flood / idle | 0% | 0 (stuck) | – | – | – |

Achievements: No Spill reader 89%, novice 88%, keys 14%. Full Bloom = run %.
Gatekeeper: `thrifty` 100%. Garden 2's crack is the intended wall for
hint-followers (gate habit parks water on the leaky terrace); a player who
reads depths after one loss (`learner`) wins it on a retry. Full table (hinted-.5 row, v1
comparison): history. `TRACE=1` prints state every 5 s.

## Telemetry

One `arcade:result` per garden: `level` (1 = warm-up, 2–4 = gardens 1–3),
`run`, `attempt`, `reason` for a loss (`dry`, `restart`), `tilt` (`motion`,
`bar`, `keys`) and `stats`: `spilled`, `leaked`, `drunk`, `left`, `start`
(spring water at start incl. carry), `gate_taps`, `tilt_s`, `bloomed` /
`plants`, `first_input` (s; −1 if none), `hints`.

## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): keys tilt but can't work the gates; ignores reduced motion.
- **Did v2 fix the first minute?** Watch warm-up win rate/time (bots 18–23
  s), garden 1 (level 2) first-try wins, `tilt_s` (v1 median 6 s), `hints`,
  mid-round quits. If players quit in the warm-up with `hints` > 0, make the
  chevrons bigger or put them on the bar.
- **Garden 2 is the next wall** for hint-followers (0%, all to the crack).
  If telemetry shows it, show the crack's loss rate (drips already), or have
  the hint point at the crack's gate when most water sits on it.
- The spring empties in ~17 s if left open. `SPRING_RATE` 18 → ~10 was held
  back (water wasn't short). Revisit if `left` stays 0 at garden 1 wins.
- **PC keys are the weak spot in garden 3** (`keys` 47%): full tilt only, so
  terrace 4's plants (3–8 left, 12–24 right) and the lip get overshot. Real
  players can feather; the bot doesn't. `TILT_RATE` 1.2 plus more water
  didn't help. Watch `tilt: keys`; if PC players lose garden 3, try Shift
  for half tilt or a gentler lip.
- Bots were optimistic (v1 humans 0/4 first tries); `masher-0` matched
  humans. Compare it with each telemetry batch.
- If long rounds still end in `restart`, tighten `hopeless()` (count only
  water above the sills as reachable).
- Plants are small on a phone. If bands get misread, widen the stakes or
  tick the band on the terrace wall.

History (older versions, balance tables, playtests): `docs/history/terrace-garden.md`
