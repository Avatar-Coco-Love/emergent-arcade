# Terrace Garden: design notes

Current: **v1** (playtest: https://claude.ai/artifact/HJwSo4d4qB6wGrm4RUZhEV). Mechanics: **tilt** (phone
tilt, tilt bar, or ← → / A D) and **gate** (tap), sharing the **water depth
in every column** of a stepped hillside. A run is three gardens. Win a
garden: every plant blooms. Lose it: the water that can still reach the
plants can't make them bloom (spilled off the bottom, leaked, drunk, or
stranded below them), or the player restarts it. No clock. A lost garden is
retried from its start. Spring water left at a win carries on to the next
garden. 3 achievements (in `games/games.json`).

Design from the maintainer (2026-09-29): a side-view hillside of 4–5
terraces, a spring with a fixed amount of water per garden, plants that each
want their own depth, tilt moves all the water at once, a tap opens or
closes one gate, water only ever leaves, three gardens with a twist each
(a leaky terrace, a plant that wants to stay dry). The maintainer accepted
these choices: the spring's outlet is a gate you tap (so "no clock" holds);
Gatekeeper means no gate opened twice; Full Bloom means all three gardens;
the leak stays mild; spring water carries over.

Built against `docs/findings.md`:

- **Passive systems must lose something.** Water only leaves: through a
  gate (to the terrace below), over the bottom lip, through the crack, or
  into a plant. Nothing adds water but the spring, which is finite.
- **A verb only shares state if success needs to read it.** Gates alone
  can't win: an open gate keeps a puddle `SILL` px deep (60 water per
  terrace) that only a tilt toward the gate brings down, and some terraces
  hold two plants with bands a level surface can't serve at once. `no-tilt`
  and `flood` (open everything, wait) win 0%.
- **A decay rate turns a puzzle into a speed test.** Plants only grow while
  their depth is right and never lose progress, so there's no clock. The
  one decay is the crack (garden 2). Slow thinkers leak more there (reader
  0.5× 159, 2× 131), but every reader still wins 100%.
- **Sweep reaction time.** Tilt eases in at `TILT_RATE` 2.5/s and water
  takes about a second to slosh across a terrace, both slow next to a
  0.3 s reaction. `slow-hands` (0.7 s reaction) wins 100%.
- **Bots model skilled play, not the first minute.** `novice` opens every
  gate at once and holds full tilt toward the gates for 3 s. It spills ~15
  and still wins 100%. Garden 1 has 4 terraces and ~25% spare water for a
  reader. The spring's valve pulses until it's first opened (the first move
  shown in play).
- **One round shows everything.** Each garden adds something: garden 2 a
  fifth terrace and the crack, garden 3 the cactus and a terrace whose two
  plants pull the tilt opposite ways.

## How it works

- Hillside: `n` terraces (4 or 5), each `NC` = 12 columns × `CW` = 21 px,
  stepping down to the right. Terrace `i`'s floor is at `TOP_Y + i ·
  (BOT_Y − TOP_Y)/(n−1)`. 1 unit of water = 1 px deep over one column.
- Water per terrace is a row of columns ("virtual pipes"). Flow between
  neighbours builds up by `PIPE · (level difference + SLOPE · tilt)` and
  decays at `FRICT`. It's limited so no column goes negative, with `SUB` = 4
  substeps per 1/60 s. At full tilt the settled surface slopes `SLOPE` px
  per column, and the drawing leans by `atan(SLOPE/CW)` (~15°) so the
  water looks level.
- Gates sit at the downhill (right) end of each terrace but the last:
  `gates[0]` is the spring's valve, `gates[k]` ends terrace `k−1`.
  Outflow = `GATE_K · (depth − edge) · (1 + 2 · max(0, tilt))` per second,
  where the edge is `SILL` when open and `WALL` when shut (a full terrace
  pours over a shut gate). The water lands on the terrace below at the
  column under the gate (column 10). The bottom terrace has a fixed `LIP`,
  and what goes over it is spilled.
- Spring: `SPRING_RATE` per s into column 0 of the top terrace while the
  valve is open and the tank isn't empty.
- Plants: `[terrace, column, lo, hi]`. While the depth over the plant is in
  `[lo, hi]` it grows (`GROW_T` s to bloom) and drinks `DRINK`/s from its
  column (28 water per plant). Outside its band it waits: too dry (brown
  stem) or too deep (bubbles). A bloom is permanent. The cactus
  (`dry: true`) grows while its column is under `DRY_MAX`, blooms after
  `DRY_T` s dry, and wilts back to nothing in `ROT_T` s wet. It has to be
  in bloom when the last thirsty plant blooms.
- Leak (garden 2): the cracked terrace loses `LEAK` of each column's water
  per second.
- Loss check (`hopeless()`): for each thirsty plant, the spring plus the
  water on its terrace and those above it must cover what it still drinks,
  plus the least standing water that can reach its band at full tilt
  (`minStand`). All the water together must cover everything still to
  drink. Stranded or wrong-place water that fails no check leaves the player
  to decide: "Restart garden" (reported as `reason: restart`).
- Tilt input: one target from −1 to 1. Keys set ±1 while held. The tilt bar
  (touch screens without motion only) follows the finger and springs back.
  Phone tilt is the component of gravity along the screen's width, from
  `deviceorientation` beta/gamma and the screen angle, so it works held
  upright (turn like a wheel) or flat (tip like a tray). It's zeroed at
  each garden's start, with a `MOTION_DEAD` 3° dead zone and full tilt at
  `MOTION_FULL` 20°. iOS shows an "Enable tilt" button. The mouse never
  tilts.

## Gardens

| # | Name | Terraces | Tank | Plants `[t, col, lo–hi]` | Twist |
|---|---|---|---|---|---|
| 1 | First steps | 4 | 300 | 0:5 6–18, 1:2 14–28, 2:8 3–10, 3:4 6–16 | – |
| 2 | The cracked terrace | 5 | 440 | 0:3 8–20, 1:1 18–32 + 1:9 2–7, 2:6 10–22, 3:8 4–12, 4:2 10–20 | terrace 2 leaks |
| 3 | The dry corner | 5 | 400 | 0:8 6–14, 1:2 12–26 + 1:9 cactus, 2:5 16–30, 3:1 3–8 + 3:9 12–24, 4:6 8–18 | cactus |

Tanks are before carry-over (a reader carries ~100 into garden 2 and ~150
into garden 3).

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

## Layout (400×600)

Spring tank top-left (a gauge of what's left) with its valve over column 0.
Terraces are planter shelves on a dark hill. Each gate is a valve drawn
above the terrace's right end (tap target radius 30). A tilt gauge sits at
the top centre. Under the canvas: the tilt bar (touch without motion),
then Garden n/3, Bloomed, Spring, Enable tilt (iOS) and Restart garden.

## Balance (v1, `node scripts/balance-terrace-garden.mjs 100`)

Each seed plays one run, with up to 3 tries per garden. Per garden:
first-try win % / any-try win %, median seconds for wins, median spilled,
median spring water left at a win.

| Bot | Run | Garden 1 | Garden 2 | Garden 3 |
|---|---|---|---|---|
| reader | 100% | 100/100 55 s, sp 0, left 102 | 100/100 90 s, leak 139, left 152 | 100/100 66 s, sp 12, left 229 |
| reader 0.5× / 2× | 100% / 100% | 100 | 100 (leak 159 / 131) | 100 |
| slow-hands (0.7 s react) | 100% | 100/100 61 s | 100/100 99 s | 100/100 71 s |
| keys (full tilt or level only) | 45% | 100/100 52 s, sp 8 | 95/95 | 41/47, sp 77, left 0 |
| novice (rush, then reader) | 100% | 100/100 51 s, sp 15, left 78 | 100/100 | 100/100 |
| thrifty (Gatekeeper plan) | 100% | 100/100 42 s, left 25 | 100/100 53 s | 100/100 57 s |
| no-tilt / flood / idle | 0% | 0 | – | – |

Achievements: No Spill reader 94%, novice 61%, keys 17%. Full Bloom =
run %. Gatekeeper: only the planned `thrifty` bot earns it (100%, with 150
of standing-water slack; with 100 it runs dry in gardens 2–3).

What decides a garden: reading depths and tilting to fit them (`no-tilt`
0%), then not wasting water (spills, puddles left behind sills). Speed
barely matters. The planned cascade (spring once, each gate once) is faster
than reacting, which makes Gatekeeper a planning challenge.

Harness: `TRACE=1` prints the first run's state every 5 s (tilt, gates,
water per terrace, each plant's depth/band/growth). The reader predicts
where water settles for each tilt and gate state (`settle()`) and picks
the best. That was needed: "tilt toward the plant" backfires with little
water, and tilting left to deepen one terrace holds the terrace above
away from its open gate.

## Telemetry

One `arcade:result` per garden, with `level` (1–3), `run`, `attempt`,
`reason` for a loss (`dry` = the water that can reach the plants can't
finish them; `restart` = Restart garden after the first input), `tilt`
(`motion`, `bar` or `keys`: the input used for most of the tilting, or the
device's default if the player never tilted) and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `spilled` | water off the bottom lip | `leaked` | water lost to the crack |
| `drunk` | water the plants drank | `left` | spring water left |
| `start` | spring water at the start (incl. carry) | `gate_taps` | gate/valve taps |
| `tilt_s` | seconds tilted (any input) | `bloomed` / `plants` | plants in bloom / total |
| `first_input` | seconds to the first tap or tilt (−1 if none) | | |

## Open ideas

- **PC keys are the weak spot in garden 3** (`keys` bot 47%): full tilt
  only, so terrace 4's two plants (3–8 at the left, 12–24 at the right) and
  the bottom lip get overshot. A real player can tap to feather, which the
  bot doesn't model. A slower ramp (`TILT_RATE` 1.2) and more water didn't
  help the bot. Watch `tilt: keys` results. If PC players lose garden 3,
  try Shift for half tilt or a gentler lip.
- Real phone tilt is untested. The private playtest page may block motion
  sensors, so the first playtest uses the tilt bar. After merging, check on
  the live site on Android: that tilt works in the cabinet (the iframe's
  `allow` attribute), that "level" feels right held upright, and whether
  20° for full tilt is too much or too little.
- Bots are likely optimistic (findings: humans lost 4 of 5 games the bots
  win 70–89%). The spare water in garden 1 (~25% for a reader) is the first
  number to check against telemetry (`left`, `spilled`, `reason`).
- A stuck garden (water stranded below every thirsty plant but the checks
  still pass) needs the player to press Restart. If telemetry shows long
  rounds ending in `restart`, tighten `hopeless()` (e.g. count only water
  above the sills as reachable).
- Plants are small on a phone (a 21 px column). If players misread the
  bands, make the stakes wider or show the target band as a tick on the
  terrace wall.
