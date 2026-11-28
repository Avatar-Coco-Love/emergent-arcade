# Terrace Garden: design notes

**v6** (2026-11-28, depth pass: gardens 4–5, endless Long Summer, Daily from 12-03, score epoch 2; playtest: https://claude.ai/artifact/KX7S2QbzYdDtjt2pMMYBps) · v5 (2026-11-26, focus fix) ·
balance: `node scripts/balance-terrace-garden.mjs 60` (`BRIEF=1`, `SUMMER=1` summer only, `LOSSES=1`, `GEN=1` rebuilds the pool)
Mechanics: **tilt** (phone tilt, tilt bar, or ← → / A D) and **gate** (tap, or keys),
sharing the **water depth in every column** of a stepped hillside. A warm-up,
five gardens, then the endless **Long Summer**; no clock. Win a garden: every
plant blooms. Lose it: the water that can still reach the plants can't make
them bloom (spilled, leaked, drunk, or stranded), a tender shoot washes out,
or the player restarts it. A lost garden is retried from its start (in the
summer that costs one of `SPARE` = 3 tries; the 4th loss ends the run).
Spring water left at a win carries to the next garden, summer included.
Score: gardens bloomed in the run (own `score`, warm-up not counted). 4
achievements (in `games/games.json`; Long Summer = 5 summer gardens).

## How it works

- Hillside: `n` terraces (4 or 5) of `NC` = 12 columns, stepping down to
  the right; 1 water = 1 px deep over a column. Virtual pipes: flow builds by
  `PIPE · (level diff + SLOPE · tilt)`, decays at `FRICT`. Full tilt settles
  at `SLOPE` px per column.
- Gates at the right end of each terrace but the last: `gates[0]` is the
  spring valve, `gates[k]` ends terrace `k−1`. Outflow = `GATE_K · (depth −
  edge) · (1 + 2 · max(0, tilt))` per s; edge is `SILL` open, `WALL` shut (a
  full terrace pours over a shut gate). Lands on the terrace below at column
  10. The bottom terrace has a fixed `LIP`; over it is spilled.
- Spring: `SPRING_RATE` per s into column 0 of the top terrace.
- Plants `[terrace, column, lo, hi, kind]`: in `[lo, hi]` they grow
  (`GROW_T` s) and drink `DRINK`/s (28 each); blooms are permanent. Cactus
  (kind `true`) blooms after `DRY_T` s under `DRY_MAX`, wilts in `ROT_T` s
  wet; it must be in bloom at the end.
- Leak (garden 2): cracked terrace loses `LEAK` of each column's water per s.
- Jam (garden 4, `jam: k`): gate k is stuck open (rope cross over its
  valve); a tap says so. Only a tilt ◀ holds water on the terrace above it
  (pour in level, then tilt ◀). Hint: tilt ◀ when that terrace has water.
- Tender shoot (garden 5, kind `'tender'`, dashed white box round its band):
  `soak` counts up while too deep, down otherwise; at `TENDER_T` the garden is
  lost (`reason: drowned`). A closing ring shows the soak; the hint jumps
  straight to a drain move (`drainHint`) and speaks it.
- Long Summer (`§ summer`): gardens from `SUMMER_POOL` (3 tiers by twist
  count: summer 1–2, 3–5, 6+), a seeded shuffle per tier from the run's
  seed. Spring = listed tank × max(`SUMMER_MIN` 0.4, 1 − `SUMMER_DM` 0.05·k)
  + carry, so the run ends on water. Pool: `GEN=1` makes candidates and keeps
  those the reader (2 noise seeds) and slow-hands win (tier 1: keys too)
  with 85% of the listed tank, no carry, under 240 s; kept 24/46, 30/57,
  30/111. Edit the generator in the harness, not the game.
- Skip: best ≥ 5 (`arcade:best`) shows "Start at the Long Summer" on the
  warm-up before any input (5 credited, `SKIP_CARRY` in the spring). Daily
  (`?daily=`): the summer from the date's seed, no carry, `arcade:final`.
- Loss check `hopeless()`: water that can still reach each thirsty plant
  must cover its drinking plus `minStand` (standing water for its band at
  full tilt). Otherwise "Restart garden" (`reason: restart`).
- Warm-up: 2 terraces, 130 water pre-placed, no spring, gate locked until
  plant 0:1 blooms; no achievements count it.
- Stuck hint (`watchStall`/`findHint`) after `STALL_T` s still; "Ease off ▶"
  on spills. Tilt input: keys ±1 (Shift ±0.5), tilt bar, phone tilt
  (`MOTION_DEAD` 3°, full at `MOTION_FULL` 20°). Detail: history, "v5 notes".

## Gardens

| # | Name | Terraces | Tank | Plants `[t, col, lo–hi]` | Twist |
|---|---|---|---|---|---|
| 0 | Warm-up | 2 | 0 (130 pre-placed) | 0:1 16–34, 1:9 8–26 | gate locked until the first bloom |
| 1 | First steps | 4 | 300 | 0:5 6–18, 1:2 14–28, 2:8 3–10, 3:4 6–16 | – |
| 2 | The cracked terrace | 5 | 440 | 0:3 8–20, 1:1 18–32 + 1:9 2–7, 2:6 10–22, 3:8 4–12, 4:2 10–20 | terrace 2 leaks |
| 3 | The dry corner | 5 | 400 | 0:8 6–14, 1:2 12–26 + 1:9 cactus, 2:5 16–30, 3:1 3–8 + 3:9 12–24, 4:6 8–18 | cactus |
| 4 | The jammed gate | 5 | 520 | 0:4 8–18, 1:2 12–24, 2:7 6–16, 3:3 12–26, 4:8 6–14 | gate 2 jammed open |
| 5 | Tender shoots | 5 | 420 | 0:6 8–18, 1:3 8–20 T, 2:8 6–14, 3:2 14–28 + 3:8 4–14 T, 4:5 8–18 | 2 tender shoots |

Tanks before carry (reader carries ~100/170/240/450/530 into gardens 2–5
and the summer). Garden 4's 520 is for a player arriving with nothing.

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
| STALL_T | 3 s (warm-up 1.5) | TENDER_T | 3.5 s |
| SPARE / SKIP_CARRY | 3 / 120 | SUMMER_DM / SUMMER_MIN | 0.05 / 0.4 |

## Balance (v6, 60 runs; campaign retries unlimited, a stuck bot restarts)

First-try / any-try win %, per garden. Summer: gardens bloomed in a run
(median, p25); sim minutes include 300 s per stuck garden.

| bot | campaign | g4 jam | g5 tender | summer | campaign min |
|---|---|---|---|---|---|
| reader | 100% | 100/100 | 98/100 | 10 (4) | 6.1 |
| novice | 100% | 100/100 | 97/100 | 10 (3) | 6.2 |
| slow-hands | 100% | 100/100 | 87/100 | 9 (4) | 6.7 |
| learner | 100% | 13/100 | 97/100 | 5 (4) | 17.1 |
| keys-half (Shift) | 72% | 100/100 | 34/73 | 8 (5) | 7.8 |
| keys (full tilt only) | 12% | 100/100 | 11/15 | 2 (1) | 8.7 |

hinted still 0% (garden 2's crack, as v2); thrifty 100% (Gatekeeper).
Summer losses (reader): dry 125, stuck 69, drowned 46; spring at summer
gardens 1/3/6/10 ~640/620/620/700. Long Summer: reader 73%, keys-half 57%.

## Accessibility (v4, `node scripts/a11y-audit.mjs terrace-garden`: 6/6 pass)

Keys in `// § keys`, live region via `speak()` (v6 names jams and tender
shoots); states by lightness and shape, not hue. Detail: history, "v4
accessibility notes".

## Telemetry

One `arcade:result` per garden: `level` (1 = warm-up, 2–6 = gardens 1–5, 7+ summer),
`run`, `attempt`, `reason` for a loss (`dry`, `restart`), `tilt` (`motion`,
`bar`, `keys`) and `stats`: `spilled`, `leaked`, `drunk`, `left`, `start`
(spring water at start incl. carry), `gate_taps`, `gate_keys` (v4: toggles
by key), `tilt_s`, `bloomed` / `plants`, `first_input` (s; −1 if none), `hints`, v6: `summer` (summer
garden, 0 in the campaign), `spare`, `twists`. v6 also sends `score`
(gardens bloomed this run), `level_id` (`g0`–`g5`, `summer`), `daily`;
`reason` can be `drowned`.

## Open ideas / known limits

- **Watch first**: does garden 4's jam read (pour level, then tilt ◀)? Do
  phone players lose garden 5 to the tender shoots (`reason: drowned`)? Does
  anyone reach the summer (level 7+) and how far (`score`)?
- PC keys with full tilt lose garden 5 (12%); Shift halves the tilt (72%).
  If `tilt: keys` players lose it, say "hold Shift" in the drowning hint.
- Summer runs end mostly on water (good) but also on stuck bots; if players
  restart a lot in the summer, check which pool rows (`LOSSES=1`).
- Garden 2's crack walls hint-followers (0%): if telemetry agrees, point
  the hint at the crack's gate when most water sits on it.
- PC keys with full tilt: garden 3 41% first try (v2), now Shift (half tilt).
- Plants are small on a phone: if bands get misread, widen the stakes.

History (older versions, balance tables, playtests): `docs/history/terrace-garden.md`
