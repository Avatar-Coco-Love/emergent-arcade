# Bubble Glass: design notes

Current: **v2** (playtest: https://claude.ai/artifact/Pe9SQ8QrH482T4iWv6jnUc). Mechanics: **turn** (drag
around the box, phone tilt opt-in, ← → keys), **melt** ({hold} on sand) and
**shatter** ({tap} glass), sharing the **grid** inside a sealed box (liquid,
wall, sand, glass, vent). Five hand-made levels, no clock, no loss: a level
ends with the bubble at the vent, or a Restart. 5 achievements (in
`games/games.json`).

Design from the maintainer (2026-09-29): a liquid-motion sand toy. The box
turns through 360° and gravity turns with it; sand falls, the bubble rises.
Melt fuses sand into a rigid shard for heat; shatter turns a shard back
into sand where it is. Level 1 teaches turning only, melt unlocks in level
2, shatter in level 3. A stuck hint after 3 s, an instant warning for
anything irreversible. Built to grow (see Evolution).

## How it works

- **Grid:** `N` = 48 × 48 cells. Levels are 24 × 24 ASCII maps, each
  character a 2 × 2 block of cells.
- **Materials are a table** (`MATERIALS`): `falls` (moves grain by grain),
  `rigid` (moves as one shard), `stops` (a wall for the bubble), `resist`
  (how much one cell slows the bubble), `melts`, `exit` (the vent), colour.
  The simulation reads only these flags, so a new sand or fixture is a new
  row plus a map character.
- **Gravity:** the box has one angle; gravity in the box frame is
  (sin a, cos a). Grains move along the two nearest of 8 directions, mixed
  by the angle, so a small turn makes a slope creep instead of nothing
  happening until 22.5°. When blocked, a grain slides to a diagonal
  neighbour (a diagonal step needs one of the two side cells free). Cells
  are scanned lowest first for each direction (precomputed orders).
- **Shards** fall as one piece along the nearest of 8 directions (on a
  diagonal they slide along a wall). They keep their shape in the box, so
  they tumble on screen as it turns. A shard being melted is held still.
- **Bubble:** a disc of radius `BR` = 2.2 cells at a sub-cell position. It
  just fills a 4-cell (2-character) gap; a 2-cell slit stops it and lets
  sand through. It moves against gravity at `BUBBLE_V`, trying straight up,
  then 45° either way, then sliding along whatever it's pressed against (a
  slight back-off stops a pixel circle catching on a flat wall). Grains in
  its way swap to the cells it leaves (sand is never lost).
- **Sand vs bubble:** the depth of sand ahead is the deepest of four lanes
  across its width, measured both straight up and along the move. Speed is
  `1 / (1 + depth / TRICKLE_D)`, and `DEEP` or more is a wall. With no
  liquid on either side (a tube it fills, or buried in sand) sand counts
  `TUBE_K` times as deep: sand gets past a bubble only through open water.
  The outline turns amber while slowed, red and dashed when walled.
- **Melt:** a still press on sand for `HOLD_DELAY_MS` starts a shard at the
  nearest sand cell. It grows `MELT_RATE` cells/s into the touching sand
  nearest the {finger} (so sliding draws a bar), up to `SHARD_MAX`, 1 heat
  per cell. A ring at the {finger} fills as it grows.
- **Shatter:** a quick {tap} within `TAP_R` cells of glass turns the whole
  shard back into what it was made of (`was` per cell), where it is.
- **Turn:** a press outside the box, or one that moves `DRAG_PX`, turns the
  box by the pointer's angle around the centre (the target never runs more
  than 90° ahead, so letting go stops it). The box follows at up to
  `ROT_MAX`. Keys turn at `KEY_RATE`. Tilt (opt in, iOS asks permission):
  real gravity from `deviceorientation`, the box drawn level on screen with
  a gravity arrow; dragging switches it off.
- **Pure simulation:** `simStep(world, dt)` plus actions `turnTo`,
  `meltStart/meltMove/meltStop`, `shatterAt` on a world object, which
  `cloneWorld` copies. Input and drawing only call these. The hint and the
  bots use the same functions on copies.
- **Stuck hint** (`watchStall`/`findHintG`): after `STALL_T` s (1.5 in level
  1) with nothing moving and no input, it looks ahead `LOOK_T` s on copies
  for each eighth of a turn and scores the bubble's shortest path to the
  vent (sand costs extra, `ventDistance`). Order: a melt level's marked
  spots while they're still unmelted sand; else the best turn (chevrons
  running round the ring); else a shard whose shattering helps (pulsing
  ring); else Restart (pulsing button). The search is a generator, 30
  simulation steps per frame, so it never stalls a frame. A hint stays up
  at least `HINT_MIN` s, then clears once anything has moved (a turn hint
  also clears when the box reaches its angle). In tilt mode "still" means
  the phone within `TILT_STILL`° of where the stall began and the bubble
  not moving (settling sand and hand wobble don't count).
- **Lid-first levels** (`lidFirst`, level 2): the melt hint (ring on the
  next marked spot, level note plus `hint` text) shows from the first
  frame and stays, whatever moves, until every spot is glass, poured away,
  or the heat is under 8.
- **Messages** stay up 1.5 s plus `MSG_MS_PER_CHAR` ms per character (at
  least the time asked). In tilt mode `#msg` turns in quarter turns to read
  upright against real gravity, along the stage edge that is on top
  (flips 55° past a quarter, not 45°, so it doesn't flicker).
- **Warnings** (once per level each): a shard being melted touches the
  bubble (glass is a wall; in level 2 it can't be broken yet), the heat
  runs out, a shatter with no heat left.

## Key constants (`games/bubble-glass.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| N / CH | 48 cells / 2 per character | BR | 2.2 cells |
| BUBBLE_V | 15 cells/s | SAND_V / SHARD_V | 45 / 30 cells/s |
| TRICKLE_D / DEEP / TUBE_K | 3 / 10 / 4 | ROT_MAX / KEY_RATE | 180 / 120 °/s |
| HOLD_DELAY_MS / DRAG_PX | 170 ms / 12 px | MELT_RATE / SHARD_MAX | 20 cells/s / 40 cells |
| STALL_T / LOOK_T | 3 s / 3.5 s | TAP_R | 3 cells |
| UMBRELLA_N / BREAKOUT_T / LIGHT_DEG | 30 grains / 4 s / 270° | HINT_MIN / TILT_STILL | 4 s / 6° |
| MSG_MS_PER_CHAR | 70 ms | | |

Performance: a step is ~0.03 ms settled; a look-ahead of 3.5 s ~13 ms and
the path search ~4 ms, spread over frames. At 390 × 700 with 4× CPU
throttling, every level renders at a 16.7 ms median frame (p95 16.8).

## Levels

Level ids are permanent (telemetry keys on them); add levels, never rename
or reuse one. Maps and data are the `LEVELS` array.

| # | id | Verbs | Heat | Teaches |
|---|---|---|---|---|
| 1 | first-turn | turn | – | The bubble sits under a shelf; turning ↺ slides it out and round to the vent, through a thin layer of sand (a delay, not a wall). |
| 2 | roof | + melt | 70 | Lid-first. Two sand shafts open into the bubble's tube. Any turn that moves the bubble toward the vent pours one of them onto it. Melt a lid on top of each, then flip. |
| 3 | the-plug | + shatter | 40 | A jammed glass plug blocks the only tube. Shattering it drops its sand onto the bubble: flip first, shatter, come back upright by way of 90° so the room's sand stays clear of the chimney. |
| 4 | lid-and-plug | all | 70 | Level 2's shafts over level 3's plug, with a room below whose chimney keeps the plug's sand off the tube. |
| 5 | hourglass | all | 60 | A glass shelf holds a bed of sand over the waist; shattering it floods the waist unless the box is turned first. |

## Telemetry

One `arcade:result` per level ended: `outcome` (win, or loss with
`reason` `restart` or `switch` when the level picker leaves it), `time`,
`level` (position), `level_id` (extra field), `run`, `attempt`. Stats:
`turns`, `deg` (degrees turned), `melted` (shards), `glass` (cells),
`shattered`, `heat_left`, `stuck_s` (s past the stall limit), `hints`,
`warns`, `first_input` (1 turn, 2 melt, 3 shatter, 4 a press that did
nothing), `tilt` (0/1), `buried_s` (s walled in by sand).

## Balance

`node scripts/balance-bubble-glass.mjs 8 [bots] [levels]` (8 seeded runs per
bot and level, each level on its own, up to 3 tries of 150 s). Cells:
first-try win % / median first-try win time.

| Bot | first-turn | roof | the-plug | lid-and-plug | hourglass |
|---|---|---|---|---|---|
| reader (all verbs, look-ahead) | 100% / 4 s | 92% / 7 s | 100% / 12 s | 100% / 17 s | 100% / 7 s |
| slow-hands (2 s think, 0.7 s react) | 100% / 5 s | 100% / 9 s | 100% / 19 s | 100% / 24 s | 100% / 7 s |
| keys (120°/s) | 100% / 4 s | 100% / 7 s | 100% / 13 s | 100% / 26 s | 100% / 8 s |
| hinted (novice + obeys hints) | 100% / 9 s | 100% / 11 s | 88% / 28 s | 88% / 56 s | 100% / 24 s |
| tilt-hinted (hinted, tilt mode, ±3° wobble) | 100% / 9 s | 100% / 11 s | 88% / 26 s | 75% / 43 s | 100% / 24 s |
| novice (spins 6 s, melts at the bubble, taps glass) | 100% / 9 s | 0% | 100% / 76 s | 88% / 73 s | 100% / 110 s |
| rotate-only (explores when stuck) | 100% / 4 s | 100% / 40 s | 0% | 0% | 0% (no-shatter is 0%) |
| no-melt | 100% / 4 s | 100% / 42 s | 100% / 11 s | 100% / 19 s | 100% / 5 s |
| no-shatter | 100% / 4 s | 100% / 7 s | 0% | 0% | 0% |
| habit ("turn so the vent is up") | 100% / 3 s | 0% | 0% | 0% | 0% |
| spinner (full speed, always) | 0% | 0% | 0% | 0% | 0% |
| idle | 0% | 0% | 0% | 0% | 0% |

Reading it:
- **Onboarding:** level 1 takes a novice 9 s; hinted and novice win it
  first time. The level-1 hint comes after 1.5 s.
- **Shatter is required** wherever there's a plug: rotate-only and
  no-shatter win 0% on levels 3–5.
- **Melt makes level 2 about 6× faster but isn't required** (the
  maintainer's call, see `docs/findings.md`, "When two things always move
  apart"): the melt reader wins in 7 s, turning alone by rocking in ~40 s,
  `habit` 0%. Melt is optional on levels 4 and 5 (no-melt is about as fast
  as the reader there): an open revision target.
- **Level 2 (v2):** the lid hint is up from the first frame, so the
  hint-follower lids first: 100% / 11 s (v1 63% / 25 s, where 6 s of
  spinning poured the shafts before any hint). The novice that ignores
  hints still never wins it (it melts next to the bubble, walling it in).
- **Tilt mode (v2):** `tilt-hinted` on v1 won level 2 13% first try with
  0 hints shown (the playtest below); v2 100%. Levels 3–5 in tilt match the
  touch hinted bot within noise (8 runs). Before/after:
  `SRC=<old copy> node scripts/balance-bubble-glass.mjs 8 tilt-hinted`.
- **Achievements:** Cold Hands is common from level 3 on (the no-melt route
  exists), Light Touch comes from hourglass, Breakout 13% and Umbrella
  13–88% (no-shatter bot on hourglass) show up in play without aiming for
  them. Glassblower needs the whole set.

## Playtest 2026-09-30 (v1, one player, phone, tilt mode)

Rated 1 star: "First level was way too easy … could not make it past the
second level no matter how hard I tried. No amount of tilt could get the
bubble that far through sand. It's too tight a fit and I see no clear
solution." Telemetry, 3 runs: level 1 won in 6–23 s (1 hint each); level
2 restarted twice (79 s and 50 s), **0 glass melted, 70 heat left**, 4,000–
5,400° turned, 0 and 1 hints, 11 s buried. The player never found melt,
and the hint that points at it waited for a stillness a phone in the
hand never gives. They also remembered a level-2 message that "appeared
super briefly then disappeared" (the level note, 5 s). v2 answers all
three: the lid hint from the start, tilt-tolerant hints with a minimum
time, longer messages that turn upright in tilt mode.

## Replay 2026-09-30 (v2, phone, tilt mode)

The pending phone replay of v2, from telemetry (2 players, 4 sessions,
all touch and tilt): **14 rounds, 14 wins, every level won on the first
try**, one run through all five boxes, Glassblower, Breakout and Cold
Hands unlocked.

| Level | v1 human | v2 human (first try) | Median win | Notes |
|---|---|---|---|---|
| first-turn | 3/3 | 3/3 | 11 s | 0.5 hints |
| roof | **0/2**, 0 glass | **2/2** | 16 s | 2 shards, 28 glass cells, 3 hints: the lid hint was found and used |
| the-plug | – | 2/2 | 9 s | shattered 1, no melt |
| lid-and-plug | – | 1/1 | 23 s | the longest; 2 s buried |
| hourglass | – | 1/1 | 16 s | no melt (the open idea below) |

The v2 fixes worked: level 2 went from never won to won first time. The
new problem is the one every game has (`docs/ROADMAP.md`, depth pass): a
whole run takes about 75 s of play, and the longest player spent 7:55 in
the game over all sessions. Levels 3–5 need less than the bots predicted
(humans won faster than `hinted`), so the next boxes can be harder.

## Achievements

| id | Needs |
|---|---|
| umbrella | 30 grains land on a shard touching the bubble's upper side. |
| breakout | A win within 4 s of shattering a shard that touched the bubble. |
| cold-hands | A win from level 3 on with no glass melted. |
| light-touch | A win from level 3 on, turning less than 270°. |
| glassblower | Every level won in this browser (kept in `localStorage`). |

## Open ideas

- **Depth pass (next):** more boxes, grouped in chapters, from the
  Evolution list; a chapter score (total time) with no ceiling. Now the
  score is the fastest escape per level (`docs/scores.md`).

- **Level 1 "way too easy"** (playtest): it's a 4–9 s tutorial. Could
  add a second beat (for example a sand bank the bubble must be rocked
  past) without adding a verb.
- **Level 5 doesn't need melt, or even a turn first:** `no-melt` shatters
  the shelf at once, tilts 45° and wins in 5 s. The side basins beside
  the waist hold all the shelf's sand. Fix by giving it more sand than
  the basins hold, or a longer, tighter waist the bubble has to be in
  while the sand comes down (a lid's job).
- **Level 4:** melt saves 2 s (reader 17 s, no-melt 19 s). The shafts
  only threaten the bubble upright, and the whole route runs flipped.
- Level 2 in tilt mode, a real phone: check the lid ring is easy to
  {hold} on while the other hand holds the phone steady.
- Real tumbling: shards rotating relative to the box (now they only
  translate).
- A level select that shows which levels are won.

## Evolution

Candidate expansions, each with the finding it must respect. All are
materials, fixtures or level rules: the verbs stay three.

- **A second bubble that merges with the first** (bigger rises faster and
  fits fewer gaps). *"One global verb against many local states"*: a turn
  moves both bubbles, so look for levels where the move that helps one
  traps the other.
- **Sand types:** wet sand that holds its shape (low `falls` rate, high
  `resist`), fine dust that trickles fast (low `resist`). New rows in
  `MATERIALS`. *"A player can know the verbs and miss the moment"*: each
  sand's threshold (how deep is a wall) must show on the bubble outline, not
  only in text.
- **Fixtures:** one-way valves, a heat vent that melts sand passing over it,
  fixed glass pins to pivot shards on. *"Passive systems that create more
  than they cost play themselves"*: a heat vent must not make free glass
  faster than sand arrives.
- **Coloured sand whose glass keeps its colour** (`was` already stores what
  each glass cell was). *"A general trick beats a set of levels"*: colour
  rules (only blue glass holds blue sand) are the kind that break a trick.
- **Daily puzzle or shareable level codes** (a level is 24 short strings
  plus a few fields). *"One round shows everything"*: a daily box is new
  content without new verbs.
- **No timer modes.** *"A decay rate turns a puzzle into a speed test"*.
