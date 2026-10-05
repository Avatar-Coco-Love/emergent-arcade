# Terrace Garden: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/terrace-garden.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## Moved from the notes (2026-10-05): open idea

- Phone tilt: one v1 round reported `tilt: motion` (6 s), then the player
  restarted after 10 s and used the bar. To check live: "level" feels right
  held upright; whether 20° for full tilt is too much.

## v2: why and what (2026-09-29)

v1 telemetry (4 players, 5 rounds, garden 1 only): 1 win in 5 tries, 0 of
4 on the first try, 4 of 6 sessions left mid-round (median 46 s in). Every
loss looked the same: `drunk` ≈ 56 (2 of 4 bloomed), `left` 0, `spilled`
0, ~14 gate taps, 0–6 s of tilt. The PC player never tilted (the mouse
couldn't). The one winner tilted 0.8 s on try 1 and 73 s on try 2.

New bot `masher-0` plays that habit: the spring runs while any plant looks
dry, and a gate opens while a plant below it looks dry, unless one right
above does. It reproduces the loss exactly (2 bloomed, spring 0, spill 0,
6 taps). The spring's pulsing valve gets opened first and empties the 300
in ~17 s. By 39 s the hillside is frozen for good. 60 sits behind terrace
0's open sill, terrace 1's 111 is 9 px deep under a plant wanting 14–28,
and 55 sits behind terrace 2's sill above the dry bottom plant. There's
plenty of water; only a tilt moves it. `hopeless()` rightly calls it
winnable, so the game never ended or said why. `masher` (tilting on 10% of
its decisions) wins but takes 121 s with 0 left, like the human win.

v2 adds (maintainer picked 1 + 2 of 3 options; a slower spring was left
out, since water wasn't short):

- **Warm-up garden** (level 1 in telemetry, like Ant Trails' day 1): 2
  terraces (floors at y 300 and 470), 130 water already on the top one, no
  spring. Plant `0:1 16–34` needs a left tilt (level gives 10.8 px; any
  left tilt past ~0.3 fits, full left gives ~32). The gate stays locked
  (dim, a tap says "First tilt ◀...") until that plant blooms, then
  pulses. Plant `1:9 8–26` below needs the gate plus a right tilt to bring
  the 60 behind the sill down. No spring, so nothing carries into garden
  1. No Spill and Gatekeeper don't count it. The reader finishes it in 18 s.
- **Stuck hint** (`watchStall`/`findHint`): after `STALL_T` 3 s (1.5 s in
  the warm-up) with no gate flowing, no slosh (every |flow| ≤ 3) and no
  plant growing, it points at a move for the topmost thirsty plant (else
  the cactus). Too deep: its own gate if shut and the terrace's average
  depth is over the band, else tilt away. Too dry with enough water on its
  terrace (`minStand` + 5): close its gate if the plant is on the gate
  side and the gate is open, else tilt toward the plant. Otherwise the
  nearest terrace above with 8+ water: its first shut gate on the way
  down, else tilt ▶. Otherwise the spring or a shut gate below it, or
  "Restart" if the spring is empty. Shown as gold chevrons over the
  terrace (plus a pulsing tilt bar), a pulsing ring on the gate, or a
  pulsing Restart button, with a line of text that names the input
  ("hold ← → or drag the bar", "slide the bar", "tip your phone").
  Water spilling off the bottom while tilted right warns at once ("Ease
  off ▶"): a hint-follower that held full tilt spilled 307 without it.
- **Tilt bar on PC too** (the mouse drags it), with ◀ ▶ at its ends, and
  a **white tick on each plant's stake** at the current depth, so "too
  shallow" shows against the green band. The Spring readout hides in the
  warm-up.
- Telemetry: new stat `hints` (hints shown in the round).


## Original design intent (v1) and findings

# Terrace Garden: design notes

Current: **v2** (playtest: https://claude.ai/artifact/HJwSo4d4qB6wGrm4RUZhEV). Mechanics: **tilt** (phone
tilt, tilt bar, or ← → / A D) and **gate** (tap), sharing the **water depth
in every column** of a stepped hillside. A run is a warm-up and three
gardens. Win a
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


## Notes before the split (2026-09-30)

Original full text of sections shortened in the current file.

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

## Balance (v2, `node scripts/balance-terrace-garden.mjs 100`)

Each seed plays one run, with up to 3 tries per garden. Per garden:
first-try win % / any-try win %, median seconds for wins, median spilled,
median spring water left at a win. The last column is the first try in
telemetry terms (compare `fetch-telemetry`'s medians).

| Bot | Run | Warm-up | Garden 1 | Garden 2 | Garden 3 | Garden 1, try 1 |
|---|---|---|---|---|---|---|
| reader | 100% | 100 18 s | 100/100 55 s, left 103 | 100/100 87 s, leak 135 | 100/100 66 s, sp 11 | 15 taps, 36 s tilt |
| reader 0.5× / 2× | 100% | 100 | 100 | 100 | 100 | |
| slow-hands | 100% | 100 20 s | 100 60 s | 100 99 s | 100 70 s | |
| keys | 56% | 100 17 s | 100/100 53 s | 98/98 | 41/57, sp 100 | |
| novice | 100% | 100 22 s | 100/100 55 s | 100/100 | 100/100 | |
| thrifty | 100% | 100 19 s | 100/100 43 s, left 25 | 100/100 53 s | 100/100 57 s | |
| **hinted** (masher that obeys hints at full tilt) | 0% | 100 23 s | **83/99 52 s**, sp 96, left 0 | 0 (leak 468) | – | 10 taps, 12 s tilt, 3 hints |
| **hinted-.5** (same, half tilt) | 0% | 100 23 s | **100/100 51 s**, left 0 | 0 (leak 275) | – | |
| masher (tilts on 10% of decisions) | 0% | 91 191 s | 97/97 117 s, left 0 | 0/2 | – | 12 taps, 12 s tilt |
| learner (masher on try 1, reader after) | 83% | 91 | 97 | 0/100 | 20/94 | |
| masher-0 / no-tilt / flood / idle | 0% | 0 (stuck) | – | – | – | |

v1 for comparison: masher-0 garden 1 0% (stuck from 39 s, 2 bloomed, left
0), hinted-style play 0%, reader 100% 54 s. The skilled bots' numbers for
gardens 1–3 didn't move.

Achievements: No Spill reader 89%, novice 88%, keys 14%. Full Bloom = run
%. Gatekeeper: `thrifty` 100%.

What decides a garden: reading depths and tilting to fit them, then not
wasting water. Players who only tilt when told (`hinted`) now get through
the warm-up and garden 1, then lose garden 2 to the crack: their gate
habit parks everything on the leaky terrace. That's the garden's twist,
so it stays. A player who reads depths after one loss (`learner`) wins
it on a retry.

Harness: `TRACE=1` prints the first run's state every 5 s (tilt, gates,
water per terrace, each plant's depth/band/growth). The reader predicts
where water settles for each tilt and gate state (`settle()`) and picks
the best. The debug build exposes the game's `hint` for the `hinted`
bots.

## Telemetry

One `arcade:result` per garden, with `level` (v2: 1 = warm-up, 2–4 = gardens 1–3; v1: 1–3), `run`, `attempt`,
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
| `first_input` | seconds to the first tap or tilt (−1 if none) | `hints` | stuck hints shown (v2) |

## Open ideas

- **Did v2 fix the first minute?** Watch v2 telemetry: warm-up win rate and
  time (bots 18–23 s), garden 1 (level 2) first-try wins, `tilt_s` (v1
  median 6 s), `hints`, and mid-round quits. If players still quit in the
  warm-up with `hints` > 0, the hint isn't read: make the chevrons bigger
  or put them on the bar itself.
- **Garden 2 is the next wall** for hint-followers (0%, all to the crack).
  If telemetry shows it, show the crack's loss rate (drips already), or
  have the hint point at the crack's gate when most water sits on it.
- The spring still empties in ~17 s if left open. Slowing it
  (`SPRING_RATE` 18 → ~10) was the third option, held back because water
  wasn't short. Revisit if `left` stays 0 at garden 1 wins.

- **PC keys are the weak spot in garden 3** (`keys` bot 47%): full tilt
  only, so terrace 4's two plants (3–8 at the left, 12–24 at the right) and
  the bottom lip get overshot. A real player can tap to feather, which the
  bot doesn't model. A slower ramp (`TILT_RATE` 1.2) and more water didn't
  help the bot. Watch `tilt: keys` results. If PC players lose garden 3,
  try Shift for half tilt or a gentler lip.
- Phone tilt: one v1 round reported `tilt: motion` (6 s tilted), so motion
  events do reach the playtest page on at least one phone. That player
  restarted after 10 s and used the bar afterwards. Still to check on the
  live site: that "level" feels right held upright, and whether 20° for
  full tilt is too much.
- Bots were optimistic (v1: reader/novice 100%, humans 0/4 first tries).
  The v1 `novice` already knew tilt was the verb. `masher-0` is the one
  that matched the humans. Keep comparing its line with each new batch
  of telemetry.
- A stuck garden now shows a hint (and "Restart" when nothing can reach the
  plants). If telemetry still shows long rounds ending in `restart`,
  tighten `hopeless()` (count only water above the sills as reachable).
- Plants are small on a phone (a 21 px column). If players misread the
  bands, make the stakes wider or show the target band as a tick on the
  terrace wall.

## Gardens

| # | Name | Terraces | Tank | Plants `[t, col, lo–hi]` | Twist |
|---|---|---|---|---|---|
| 0 | Warm-up | 2 | 0 (130 pre-placed) | 0:1 16–34, 1:9 8–26 | gate locked until the first bloom |
| 1 | First steps | 4 | 300 | 0:5 6–18, 1:2 14–28, 2:8 3–10, 3:4 6–16 | – |
| 2 | The cracked terrace | 5 | 440 | 0:3 8–20, 1:1 18–32 + 1:9 2–7, 2:6 10–22, 3:8 4–12, 4:2 10–20 | terrace 2 leaks |
| 3 | The dry corner | 5 | 400 | 0:8 6–14, 1:2 12–26 + 1:9 cactus, 2:5 16–30, 3:1 3–8 + 3:9 12–24, 4:6 8–18 | cactus |

Tanks are before carry-over (a reader carries ~100 into garden 2 and ~150
into garden 3).

## Layout (400×600)

Spring tank top-left (a gauge of what's left) with its valve over column 0.
Terraces are planter shelves on a dark hill. Each gate is a valve drawn
above the terrace's right end (tap target radius 30). A tilt gauge sits at
the top centre, the message line under it. Under the canvas: the tilt bar
(everywhere but phones with working motion), then Garden (warm-up or
n/3), Bloomed, Spring (not in the warm-up), Enable tilt (iOS) and Restart
garden.

