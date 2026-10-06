# Bubble Glass: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/bubble-glass.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## Perf (v3)

Perf: step ~0.03 ms; 390×700 at 4× throttle, 16.7 ms median frame.

## Older open ideas (parked in v7)

- A wet-sand level that needs a lid: hold the box at an angle for long (diagonal corridor).
- Merging as a tool: notches a small bubble rises into and the big one slides past.
- Real tumbling: shards rotating relative to the box.

## Levels (per-level notes, moved from the notes in v7)

Format: # id (verbs, heat): note. "all" = turn+melt+shatter.
1 first-turn (turn): shelf; vent in a sand pocket that must pour out first.
2 roof (+melt, 70): lid-first; melt a lid over each of two shafts, then flip.
3 the-plug (+shatter, 40): shatter the jam, flip first, return via 90°.
4 lid-and-plug (all, 70): lid-first, 4-wide shafts, tube, plug, room.
5 hourglass (all, 60): melt the waist jam into one shard, turn out.
6 mud (turn): wet sand over the vent; let it settle first.
7 dust-shafts (all, 70): roof with dust, lid-first.
8 sieve (all, 40): grate tube; tilt and sand leaves.
9 landslide (all, 40): the-plug with wet sand room.
10 sump (all, 60): grate tube, 2-cell sumps; lid keeps one full.
11 sand-timer (all, 60): hourglass with dust.
12 quicksand (all, 70): lid dust shafts, wet last stretch, grate sump; lid, hold tilt, flip.
13 twins (all, 40): two bubbles, wide vent, second shelf with 3-char side gaps (v5: up the sides, then across). 14 mud-twins (all, 40): wet piles on shelf 1 plus wet beds (v5).
15 narrow-door (all, 40): 4-cell tube, free one at a time. 16 dust-door (all, 40): tube plus two rows of dust on shelf 1 and dust beds (v5; melt now helps, reader 7 s).
17 shared-sand (all, 40): grated tubes, two small sumps.
18 upstairs (all, 40): the-plug plus bubble above it. 19 two-plugs (all, 40).
20 convoy (all, 70): roof, two bubbles, lid-first. 21 last-box (all, 70): level 4 with two bubbles.

## v5 balance (moved from the notes in v7)

13 twins: 100/14 s vs 75/44 s. 14 mud-twins: 100/12 s vs 75/58 s. 16 dust-door: 100/7 s vs 50/38 s
(was 5 s / 20 s). Melt is still unused on 13 and 14; reader finishes them in 12-14 s. Level 16 pitfall:
a map must be exactly 24 rows (validate.mjs does not check), a 25-row draft was unwinnable.

Chapter 1 fixes in v3 (were open ideas): level 1 second beat (novice 9→44 s, reader 5 s);
  level 4 rewards lids (lid-reader 12 s vs no-melt 32 s); level 5 rewards melt (13 vs 37 s).

v6 accessibility line (done in v7): Accessibility (`docs/accessibility.md`, 2026-10-05): keys turn the box only (hold, tap need a pointer); ignores reduced motion (small).

## Player data

2026-09-30 (v2 replay, 2 players, phone/tilt): 14 rounds, 14 wins, all first try;
one full run (~75 s of play), longest player 7:55 total. Levels 3–5 won faster than
`hinted`. v1's roof 0/2 became 2/2. v3 not yet played by humans.

## Balance (v3)

Per-level v3 table (reader vs hinted, 8 runs): `docs/history/bubble-glass.md`. Reader wins
~100% in 4-12 s; hinted is 38-100%, 11-47 s (level 21: 38%).

10-minute check (`CAMPAIGN=1 ... 16 hinted,reader`): hinted 88% all won, **10:39**
median (IQR 9:17–11:28; ch 2:14/2:39/5:09); reader 100%, 3:36. Melt matters on
roof, lid-and-plug, hourglass, dust-shafts, convoy; shatter required at plugs.

## v4 levels 13, 14, 16 (replaced in v5)

Plain two-shelf box, vent top centre, beds only (sand/wet/dust). Reader 5 s on all three, hinted 33 s,
45 s, 20 s (1st try 100/100/50%). v5 added the second shelf (13, 14) and shelf piles (14, 16).

## v3 per-level balance table

Per level first-try win % / median time, reader vs hinted (8 runs; full table,
other bots, in history): 1: 100/5 s vs 100/19; 2: 100/7 vs 100/11; 3: 100/11 vs 63/34;
4: 100/30 vs 50/21; 5: 100/9 vs 75/31; 6: 100/4 vs 75/30; 7: 100/7 vs 88/14;
8: 100/4 vs 100/16; 9: 100/12 vs 100/34; 10: 100/9 vs 100/17; 11: 100/5 vs 88/29;
12: 100/8 vs 100/17; 13: 100/5 vs 100/31; 14: 100/5 vs 100/47; 15: 63/10 vs 75/35;
16: 100/5 vs 50/20; 17: 100/4 vs 100/14; 18: 100/7 vs 100/35; 19: 100/10 vs 63/46;
20: 100/7 vs 75/14; 21: 100/29 vs 38/24.


v2's playtest: https://claude.ai/artifact/Pe9SQ8QrH482T4iWv6jnUc

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


## Evolution (candidate expansions)

Candidate expansions, each with the finding it must respect. All are
materials, fixtures or level rules: the verbs stay three.

- *(v3)* **A second bubble that merges with the first** (bigger rises faster and
  fits fewer gaps). *"One global verb against many local states"*: a turn
  moves both bubbles, so look for levels where the move that helps one
  traps the other.
- *(v3: wet sand and dust)* **Sand types:** wet sand that holds its shape (low `falls` rate, high
  `resist`), fine dust that trickles fast (low `resist`). New rows in
  `MATERIALS`. *"A player can know the verbs and miss the moment"*: each
  sand's threshold (how deep is a wall) must show on the bubble outline, not
  only in text.
- *(v3: the grate)* **Fixtures:** one-way valves, a heat vent that melts sand passing over it,
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

## Retired levels

Also retired before shipping: `dust-bowl` (two-plugs under a room of
dust): hinted won it 25% in 3 tries, and it repeated two-plugs; and
`twin-glass` (the hourglass with two bubbles): they merge in the open
bulb and the big one can't enter the waist, so even the reader won 0%.
Retired before shipping: `dry-lid` (roof's shafts of wet sand under a dry
top layer, lid the dry layer). Wet sand only drains when the box is held at
an angle, so a quick flip beat it in 5 s whatever the shafts' position: a
slow material is no threat to a fast turn (see Findings).

## Notes before the split (2026-09-30)

Original full text of sections shortened in the current file.

### Header (original)

Current: **v3**, the depth pass (playtest: https://claude.ai/artifact/BXC2MQc3e4rf6x2wPUxZVR). v2's playtest:
https://claude.ai/artifact/Pe9SQ8QrH482T4iWv6jnUc. Mechanics: **turn** (drag
around the box, phone tilt opt-in, ← → keys), **melt** ({hold} on sand) and
**shatter** ({tap} glass), sharing the **grid** inside a sealed box (liquid,
wall, sand, wet sand, dust, glass, grate, vent). 21 hand-made levels in
three chapters, no clock on a level, no loss: a level ends with every bubble
out through the vent, or a Restart. The score is a chapter's total time.
7 achievements (in `games/games.json`).

Design from the maintainer (2026-09-29): a liquid-motion sand toy. The box
turns through 360° and gravity turns with it; sand falls, the bubble rises.
Melt fuses sand into a rigid shard for heat; shatter turns a shard back
into sand where it is. Level 1 teaches turning only, melt unlocks in level
2, shatter in level 3. A stuck hint after 3 s, an instant warning for
anything irreversible. Built to grow (see Evolution).


### v3: chapters and the chapter clock

| Chapter | id (leaderboard board) | Levels | New |
|---|---|---|---|
| 1 | `sand` | 1–5 | the three verbs (v2's levels; 1, 4, 5 reworked) |
| 2 | `wet-and-dry` | 6–12 | wet sand, dust, grates |
| 3 | `two-bubbles` | 13–21 | a second bubble; bubbles that touch merge |

- **Score** (`score.epoch` 2): a chapter's play time, from starting its
  first level to winning its last, in order, restarts included (a lost try
  is retried from its start, and its time counts). Posted as `score` with
  `board: <chapter id>` in the last level's `arcade:result`; no other
  result carries a score. Skipping a level with the picker, or starting
  mid-chapter (a returning player resumes at the level they reached),
  leaves the chapter untimed until its first level is started again; the
  level note says where the clock starts. The HUD shows the clock (⏱) and
  the best from `arcade:best`; the chapter's end card shows both.
- **Progress** is kept by level id now (`reachedId`); v2's `reached`
  position still loads (chapter 1 kept its positions).

### How it works

- **Grid:** `N` = 48 × 48 cells. Levels are 24 × 24 ASCII maps, each
  character a 2 × 2 block of cells.
- **Materials are a table** (`MATERIALS`): `falls` (moves grain by grain),
  `speed` (relative to sand), `slides` (slips diagonally off a pile),
  `rigid` (moves as one shard), `stops` (a wall for the bubble), `resist`
  (how much one cell slows the bubble), `melts`, `exit` (the vent), `sieve`
  (grains fall through it), colour. The simulation reads only these flags,
  so a new sand or fixture is a new row plus a map character. Append rows
  (the bots know sand as 2 and the vent as 4).

  | Material | Map | falls / speed | resist | melts | Other |
  |---|---|---|---|---|---|
  | sand | `s` | 1 (45 cells/s) | 1 | yes | |
  | wet sand | `w` | 0.25 | 2.5 | no | doesn't slide: sits on a bubble instead of trickling off |
  | dust | `d` | 2 | 0.3 | yes | |
  | grate | `%` | – | – | – | a wall for the bubble and glass; grains pass straight through (up to 3 cells thick, not diagonally) |

- **Grain passes:** `2 × SAND_V` a second; a grain moves every
  `EVERY = round(2 / speed)`-th pass (sand every 2nd, dust every one, wet
  every 8th). A box without dust skips the odd passes.
- **Gravity:** the box has one angle; gravity in the box frame is
  (sin a, cos a). Grains move along the two nearest of 8 directions, mixed
  by the angle, so a small turn makes a slope creep instead of nothing
  happening until 22.5°. When blocked, a grain slides to a diagonal
  neighbour (a diagonal step needs one of the two side cells free). Cells
  are scanned lowest first for each direction (precomputed orders).
- **Shards** fall as one piece along the nearest of 8 directions (on a
  diagonal they slide along a wall). They keep their shape in the box, so
  they tumble on screen as it turns. A shard being melted is held still.
- **Bubbles** (`w.bubs`, each `{ x, y, r, flow }`, one `o` each on the
  map): moved highest first. Two pressed together (centres closer than
  r1 + r2 + 1) **merge** into one with both areas (r = √(r1² + r2²), 3.1
  for two), centred between them where it fits; sand under it goes to the
  nearest liquid. Where the big one doesn't fit (a 4-cell tube) they stay
  apart. A bigger bubble rises √(r / BR) faster, and needs a 6-cell gap. A
  bubble at the vent leaves; the level is won when none is left. The path
  search runs per radius, and the look-ahead score sums the bubbles'
  distances plus `BUB_LEFT` (40) per extra bubble still in the box.
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
  ring); else Restart (pulsing button). The search is a generator that works
  at most `LOOK_MS` (4 ms) per frame (v3; v2 ran 30 steps a frame), so it
  never stalls a frame. A hint stays up
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
- **Confirm before burying** (v3): the first {tap} on glass that holds
  sand back only warns, and the second breaks it: a lid at a lid-first
  level's marked spot ("That lid holds the sand back"), or any shard whose
  shattering walls a bubble in within 1.5 s, checked on a copy of the box
  ("Its sand would bury the bubble"). Counts in `warns`. With it the
  hinted bot's first-try wins on the-plug went 75% → 100%, two-plugs any
  win 75% → 88%.

### Key constants (`games/bubble-glass.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| N / CH | 48 cells / 2 per character | BR | 2.2 cells |
| BUBBLE_V | 15 cells/s | SAND_V / SHARD_V | 45 / 30 cells/s |
| TRICKLE_D / DEEP / TUBE_K | 3 / 10 / 4 | ROT_MAX / KEY_RATE | 180 / 120 °/s |
| HOLD_DELAY_MS / DRAG_PX | 170 ms / 12 px | MELT_RATE / SHARD_MAX | 20 cells/s / 40 cells |
| STALL_T / LOOK_T | 3 s / 3.5 s | TAP_R | 3 cells |
| UMBRELLA_N / BREAKOUT_T / LIGHT_DEG | 30 grains / 4 s / 270° | HINT_MIN / TILT_STILL | 4 s / 6° |
| MSG_MS_PER_CHAR | 70 ms | LOOK_MS (v3) | 4 ms of hint search per frame |
| BUB_LEFT (v3) | 40 (score per extra bubble left) | merged bubble | r = √2 · BR ≈ 3.1 |

Performance: a step is ~0.03 ms settled; a look-ahead of 3.5 s ~13 ms and
the path search ~4 ms, spread over frames. At 390 × 700 with 4× CPU
throttling, every level renders at a 16.7 ms median frame (p95 16.8).

### Levels

Level ids are permanent (telemetry keys on them); add levels, never rename
or reuse one. Maps and data are the `LEVELS` array.

| # | id | Verbs | Heat | Teaches |
|---|---|---|---|---|
| 1 | first-turn | turn | – | The bubble sits under a shelf; turning slides it out. v3: the vent is at the bottom of a pocket full of sand, which has to pour out before the bubble can get in (a second beat). |
| 2 | roof | + melt | 70 | Lid-first. Two sand shafts open into the bubble's tube. Any turn that moves the bubble toward the vent pours one of them onto it. Melt a lid on top of each, then flip. |
| 3 | the-plug | + shatter | 40 | A jammed glass plug blocks the only tube. Shattering it drops its sand onto the bubble: flip first, shatter, come back upright by way of 90° so the room's sand stays clear of the chimney. |
| 4 | lid-and-plug | all | 70 | v3, lid-first: roof's shafts (4 wide) over a long tube, then a plug and a small room. The shafts pour into the tube on the way down. |
| 5 | hourglass | all | 60 | v3: twice the sand on the shelf, more than the basins beside the waist hold. Melting the jam in the waist into one shard and turning it out is the fast way. |
| 6 | mud | turn | – | Wet sand intro: level 1's shape, with a pocket of wet sand over the vent right beside the bubble. Flip at once and the slow wet sand lands on the bubble; let it settle first. |
| 7 | dust-shafts | all | 70 | Roof with dust: it pours in a flash, so rocking past it (roof's no-melt route) mostly fails. Lid-first. |
| 8 | sieve | all | 40 | Grate intro: a tube full of sand with grate walls; tilt and the sand leaves through them. |
| 9 | landslide | all | 40 | The-plug with a room of wet sand: slow, so coming back upright by way of 90° has time, but a thin layer stops the bubble. |
| 10 | sump | all | 60 | The grate tube with 2-cell sumps: neither holds all the sand. A lid keeps one full while the other fills. |
| 11 | sand-timer | all | 60 | Hourglass (v3) with dust on the shelf: it floods faster, but the bubble slips through it. |
| 12 | quicksand | all | 70 | Lid-first dust shafts over a tube whose last stretch is wet sand, with a grate to a sump beside it: lid, then hold a tilt while the mud drains, then flip. |
| 13 | twins | all | 40 | Two bubbles under two shelves, a wide vent: tilt one way, then the other. Merging is harmless here. |
| 14 | mud-twins | all | 40 | Twins over beds of wet sand: a bubble that ends up under the mud is pinned. |
| 15 | narrow-door | all | 40 | Twins with a 4-cell tube to the vent: a merged bubble can't get in. Free one bubble at a time. |
| 16 | dust-door | all | 40 | Narrow door over beds of dust. |
| 17 | shared-sand | all | 40 | Two tubes with grates between them and two small sumps: the sand that leaves one tube goes into the other. |
| 18 | upstairs | all | 40 | The-plug with a second bubble above the plug. |
| 19 | two-plugs | all | 40 | Two bubbles, each under a plug, one room of sand above both. |
| 20 | convoy | all | 70 | Roof with two bubbles in the tube, lid-first. |
| 21 | last-box | all | 70 | Level 4 (v3) with two bubbles: lid-first, then the plug; they usually merge in the room and leave as one. |

Also retired before shipping: `dust-bowl` (two-plugs under a room of
dust): hinted won it 25% in 3 tries, and it repeated two-plugs; and
`twin-glass` (the hourglass with two bubbles): they merge in the open
bulb and the big one can't enter the waist, so even the reader won 0%.
Retired before shipping: `dry-lid` (roof's shafts of wet sand under a dry
top layer, lid the dry layer). Wet sand only drains when the box is held at
an angle, so a quick flip beat it in 5 s whatever the shafts' position: a
slow material is no threat to a fast turn (see Findings).

### Telemetry

One `arcade:result` per level ended: `outcome` (win, or loss with
`reason` `restart` or `switch` when the level picker leaves it), `time`,
`level` (position), `level_id` (extra field), `run`, `attempt`. Stats:
`turns`, `deg` (degrees turned), `melted` (shards), `glass` (cells),
`shattered`, `heat_left`, `stuck_s` (s past the stall limit), `hints`,
`warns`, `first_input` (1 turn, 2 melt, 3 shatter, 4 a press that did
nothing), `tilt` (0/1), `buried_s` (s walled in by sand); v3 adds `out`
(bubbles out), `merged`, `ch_t` (the chapter clock so far, 0 if untimed),
the extra field `chapter` (chapter id), and on a chapter's last win
`score` (chapter time) and `board` (chapter id).

### Balance

`node scripts/balance-bubble-glass.mjs 8 [bots] [levels]` (8 seeded runs per
bot and level, each level on its own, up to 3 tries of 150 s). `SEED=n`
starts at another seed (to trace a failing run with `TRACE=1`).

### The 10-minute check (v3)

`CAMPAIGN=1 node scripts/balance-bubble-glass.mjs 16 hinted,reader`: every
level in order, each tried until won (up to 6 tries), total play time
including restarts.

| Bot | All 21 won | Total, median (IQR) | Ch 1 | Ch 2 | Ch 3 |
|---|---|---|---|---|---|
| hinted (16 runs) | 88% | **10:39** (9:17–11:28) | 2:14 | 2:39 | 5:09 |
| reader (16 runs) | 100% | 3:36 (3:12–6:22) | 0:59 | 0:51 | 1:49 |
| slow-hands (12 runs, 19 levels) | 100% | 4:37 | 1:25 | 0:58 | 2:17 |
| novice (8 runs, 14 levels) | 0% | 67:48 | never wins roof or two-plugs without hints | | |

v2's five levels took hinted 2:44 and the reader 0:48. Humans won v2's
levels 3–5 faster than hinted, so the human total may be shorter: that's
the telemetry question.

#### Per level (v3, 8 runs): first-try win % / median first-try win time

| # | Level | reader | lid-reader | hinted | no-melt | rotate-only |
|---|---|---|---|---|---|---|
| 1 | first-turn | 100 / 5 s | | 100 / 19 s | 100 / 5 s | 100 / 5 s |
| 2 | roof | 100 / 7 s | | 100 / 11 s | 100 / 37 s | 100 / 37 s |
| 3 | the-plug | 100 / 11 s | | 63 / 34 s (any 100) | 100 / 10 s | 0 |
| 4 | lid-and-plug | 100 / 30 s | 100 / 12 s | 50 / 21 s (any 88) | 100 / 48 s | 0 |
| 5 | hourglass | 100 / 9 s | | 75 / 31 s | 100 / 44 s | 0 |
| 6 | mud | 100 / 4 s | | 75 / 30 s | 100 / 4 s | 100 / 4 s |
| 7 | dust-shafts | 100 / 7 s | 100 / 10 s | 88 / 14 s | 63 / 38 s | 50 / 41 s |
| 8 | sieve | 100 / 4 s | | 100 / 16 s | 100 / 4 s | 100 / 4 s |
| 9 | landslide | 100 / 12 s | | 100 / 34 s | 100 / 11 s | 0 |
| 10 | sump | 100 / 9 s | | 100 / 17 s | 100 / 9 s | 100 / 9 s |
| 11 | sand-timer | 100 / 5 s | | 88 / 29 s | 100 / 5 s | 0 |
| 12 | quicksand | 100 / 8 s | 100 / 11 s | 100 / 17 s | 100 / 14 s | 100 / 14 s |
| 13 | twins | 100 / 5 s | | 100 / 31 s | 100 / 5 s | 100 / 5 s |
| 14 | mud-twins | 100 / 5 s | | 100 / 47 s | 100 / 5 s | 100 / 5 s |
| 15 | narrow-door | 63 / 10 s | | 75 / 35 s | 75 / 27 s | 100 / 21 s |
| 16 | dust-door | 100 / 5 s | | 50 / 20 s (any 75) | 100 / 5 s | 100 / 5 s |
| 17 | shared-sand | 100 / 4 s | | 100 / 14 s | 100 / 4 s | 100 / 4 s |
| 18 | upstairs | 100 / 7 s | | 100 / 35 s | 100 / 7 s | 0 |
| 19 | two-plugs | 100 / 10 s | | 63 / 46 s | 100 / 10 s | 0 |
| 20 | convoy | 100 / 7 s | 100 / 10 s | 75 / 14 s | 50 / 88 s | 50 / 99 s |
| 21 | last-box | 100 / 29 s | | 38 / 24 s (any 75) | 88 / 32 s | not run |

Reading it:
- **Melt matters** where lids are the point: roof, lid-and-plug (lid-reader
  12 s vs no-melt 48 s), hourglass (9 vs 44 s), dust-shafts and convoy
  (no-melt 50–63% first try). Elsewhere in chapters 2–3 melt is optional;
  those boxes are about turning order, grates and two bubbles.
- **Shatter is required** wherever there's a plug (rotate-only 0%).
- **Skilled play is short** (reader 3:36 for everything); the length comes
  from boxes a newcomer needs hints and retries for. The chapter clock is
  the reason to replay.
- `habit` ("turn so the vent is up") wins narrow-door: tilting toward one
  bubble first is the intended move.
- `lid-reader` is the reader that first melts the lids a lid-first level
  rings (a player who reads the note); `hinted` now {taps} glass only when
  stuck (see the bot notes in the script).

v2's full table (12 bots × 5 levels) is in git history
(`git show 17b131f:docs/games/bubble-glass.md`).

### Achievements

| id | Needs |
|---|---|
| umbrella | 30 grains land on a shard touching the bubble's upper side. |
| breakout | A win within 4 s of shattering a shard that touched the bubble. |
| cold-hands | A win from level 3 on with no glass melted. |
| light-touch | A win from level 3 on, turning less than 270°. |
| glassblower | Every level won in this browser (kept in `localStorage`). v3: all 21. |
| big-bubble | A merged bubble leaves through the vent (v3). |
| clockwork | A chapter finished on the chapter clock (v3). |

### Open ideas

- **v3 playtest (next):** does anyone play a whole chapter? The 10-minute
  line per version comes from `fetch-telemetry.mjs`; chapter scores from
  the leaderboard. Humans were faster than `hinted` in v2, so the real
  total may be shorter than the bot's.
- **Chapter 1 fixes in v3** (were open): level 1 got a second beat (the
  sand pocket over the vent: novice 9 s → 44 s, reader still 5 s); level 4
  now rewards lids (lid-reader 12 s vs no-melt 32 s, was 17 vs 19); level 5
  now rewards melt (reader 13 s vs no-melt 37 s, was 7 vs 5).
- A wet-sand level that needs a lid (see "Retired" under Levels): hold the
  box at an angle for long, e.g. a diagonal corridor.
- Merging as a tool (a level that needs the big bubble): notches a small
  bubble rises into and the big one slides past.
- The HUD bar wraps to two lines on a 390 px phone while the chapter
  clock shows.
- Several chapter 2–3 boxes are 4–5 s for the reader (sieve, sand-timer,
  dust-door, shared-sand, twins): fine as steps for a newcomer, but the
  next pass could make the skilled route longer. Sand-timer lost level
  5's melt value (dust is light: no-melt 5 s).
- Level 2 in tilt mode, a real phone: check the lid ring is easy to
  {hold} on while the other hand holds the phone steady.
- Real tumbling: shards rotating relative to the box (now they only
  translate).
- A level select that shows which levels are won.

