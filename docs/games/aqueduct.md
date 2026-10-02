# Aqueduct: design note (prototype, not registered)

Status: prototype `prototypes/aqueduct.html` (not in `games/`: `validate.mjs`
requires every file there to be registered). Id when built:
`aqueduct` (permanent feedback key). Older text, measurements and playtests:
`docs/history/aqueduct.md`.

Pitch: a sealed glass vessel of chambers and channels with a little water and
a glowing **bead** adrift in it. Turn the whole vessel through **360°** so
gravity points anywhere; carry the bead to the exit. The exit is a **level
lock**: open only while marked cups hold the right water. Route and water
volumes are one problem.

## Verbs and goals

- **Turn** (global, continuous): moves all water and the bead. **Valve**
  (local, tap): seals one cup's mouth so its volume survives turns. **Flick**
  (fast turn, same input): sloshes over lips a slow pour can't.
- **Bead** floats at the surface and rides currents: you steer by pouring.
- **Lock**: each cup has a band `[lo, hi]`; the door opens after `HOLD_T` s
  in band and closes when a reading leaves it. Win = bead in the exit ring
  `EXIT_T` s while the door is open. Loss (later): `hopeless()`, offer restart.
- The valve is required because the goals need disjoint angles (finding):
  fill upside down, shut, come back.

## Prototype: levels and constants

Levels are data (`LEVELS` in `§ levels`): `shapes` (rounded boxes),
`water` [{shape, n}], `bead`, `exit`, `cen` (drawing only), `cups` [{name,
color, read region, `mouth` up/down/left/right, `band` [lo, hi], `valve`
plate {x0, y0, x1, y1, from}, fill hint}], `low` (too little water on the
ring side), `goal` text. No cups = door always open. A new level needs no
code. Vessel frame, y down, angle 0 = upright.
- Shared vessel: chambers A and B (150 x 240, centres (∓100, 35)), bridge
  (124 x 34, centre (0, -62)) over a high sill. 600 particles start in A;
  bead at A's surface (-100, -10).
- **Amber cup** (44 x 65, centre (0, -106.5)) hangs from the bridge ceiling,
  mouth down. Reading y -139..-84, ~78 particles full, band 25-50%. Valve
  plate y -83..-77 from the left.
- **Violet cup** (level 2; 65 x 40, centre (202, -40)) on B's right wall,
  mouth left. Reading x 182..234.5, y -60..-20, band 25-50%. Valve plate
  x 176..182 from the top.
- Door: every cup in band for `HOLD_T` 1.0 s (filter 0.3 s); bead in the ring
  r 18 for `EXIT_T` 0.4 s. Valve slide `VALVE_T` 0.15 s.
- **Score** (higher is better; turning is free by design, the user enjoys
  watching the water): `CLEAR_PTS` 100 for the win +
  `PEARL_PTS` 100 per pearl + up to `BULL_PTS` 100 per cup **bullseye**.
  Bullseye: full within `BULL_TOL` ±2% of the band's centre line (drawn
  dotted), linear to 0 at the band edge, read at the moment of the win.
  Max 400 / 500 / 600 (levels 0-2). Bests in localStorage `aqueduct.v2`
  (`aqueduct.v1` read only as "cleared"). `arcade:result` adds `pearls`.
- **Pearls**: level data `pearls: [{x, y}]` (3 per level), collected when
  the bead's centre comes within `PEARL_PICK` 15 px. Corner pearls need the
  bead in a nearly empty chamber. Data order = the `pearls` bot's order.
- **Dye** (looks only): each particle is tinted by the half of its start
  chamber it began in (`DYE` blue / teal). No sim cost.
- Sim: Clavet double-density, 2 substeps of 1/120 s, SDF walls; bead has
  explicit buoyancy (`LIFT` 3, probe `RING` 6 / `RING_FULL` 19) and drag
  toward local water velocity (`BEAD_DRAG` 8/s). Perf: 0.9 ms sim/frame at
  1x CPU; ~55 fps at 4x throttle, dpr capped 1.25 (headless, not a phone).
- Input: `← →` ramped turn (50-420 deg/s), drag dial, phone gravity
  (untested on a device), valve buttons (Space, `1` `2`), `R`, `L`/Esc.

| level | id | cups | exit | intended solution |
|---|---|---|---|---|
| 0 Warm-up | `warmup` | none | (100, 120) | pour across the bridge |
| 1 The cup | `one-cup` | amber | (70, 95) | tumble to -150, catch ~30% at -120, shut, ease back |
| 2 Two cups | `two-cups` | amber, violet | (70, 95) | tumble to -150 (both fill), shut violet at -60, let amber drain 69 → 35%, shut it, ease back |

Cup hold vs angle (fill map) and why the ring needs the valve: history,
"Step 4 measurements".

## Bot results (2026-10-02, levels as data)

`LEVEL=i node scripts/balance-aqueduct.mjs` (20 seeds; planners as noted).

| level | idle | sweep | greedy | keys | novice | timer | planner (valve) | planner-nv D22 B16 |
|---|---|---|---|---|---|---|---|---|
| 0 | 0% | - | 70% | 20% | 40% (10 seeds) | - | 3/3, 4 moves | - |
| 1 | 0% | 0% | 0% | 0% | 5% | 5% | 5/5 (D14 B14), 4.3 s, 5 moves | 0/5 |
| 2 | 0% | 0% | 0% | 0% | 0% | 0% | 3/3 (D14 B14), 5.3 s, 6 moves | 0/3 |

Pearls and points (the sim is unchanged, so the win rates above stand).
`planner` = direct route, ignores pearls; `pearls` = visits them in data
order, then exits (D22 B12, 2 seeds). Score = clear + pearls + bullseye.

| level | pearls at | planner: pearls, score | pearls bot: win, s, moves, score | plan |
|---|---|---|---|---|
| 0 | A top-left, A bottom-left, B top-right | 1/3, 200 | 2/2, 5.3 s, 6, 400 | `180 270 90 30 30` |
| 1 | A top-left, A bottom-left, B bottom-right | 0/3, 169 | 2/2, 6.2 s, 7, 493 | `180 300 210 60 240a 270a 240` |
| 2 | A top-left, A bottom-right, A bottom-left | 0/3, 172 | 2/2, 7.6 s, 8, 567 | `150a 270 150a 120ab -30ab 30a` |

Pearls sit off the direct route (finding "off the solution's lanes"); the
warm-up's free pearl at 90° is on purpose. Placement notes: history.

Level 2: the lock order is the puzzle (shut violet first; history,
"Step 4 measurements").

## Next (in order)

1. **Next PR (agreed with the user, 2026-10-02): items 3, 5, 6** from the
   "least effort, most reward" list. Discuss each with the user first, then
   build in one PR:
   - **3. Water brought home**: at the win, count particles in a marked
     "home" region (same counting as the cup readings) and add points, so
     spilling water over the sill costs something. Open: which region per
     level, points per particle, does it fight the bullseye?
   - **5. Free pour**: a level with no exit and no cups (pure data, ~10
     lines), a calm toy for watching the water. Open: menu entry or level
     -1; never locked; no score or `arcade:result`.
   - **6. Bead trail**: a fading trail behind the bead (~15 lines), so a
     pearl run is satisfying to look back on. Open: length, colour by speed?
   Prompt to start it: "Aqueduct next PR: read `docs/games/aqueduct.md`
   ('Next' item 1) and discuss items 3, 5 and 6 with me before building:
   water brought home, a free-pour level, and a bead trail."
2. Human playtest of levels 0-2 (Artifact below): are pearls visible and
   wanted? Bullseye line readable? Warm-up too easy (novice 40%)? Does
   level 2's "which one first" read? Typical human scores for a par.
3. More levels until play reaches 10+ minutes (draft ideas below), each
   gated like level 2, each with 3 pearls off the direct route (check with
   `planner` vs `pearls`). Then register in `games.json` (manifest `score`
   higher-is-better, achievements, `howToPlay`).
4. Phone tilt test after merge (iOS sign flipped, untested), real-phone fps.
5. Known gap: the door stays open 0.3 s (filter lag) after a cup reopens.

Level ideas (table in history): siphon, upside-down band, leak, tide
room, two beads, seeded free play.
Achievements draft: First Drop, Banked, Upside Down, Light Touch (fewest
valve taps: an achievement now, not part of the score), One Flick, Pearl
Diver (all pearls on a level), Bullseye (100 on every cup).

## Workflow notes

- Planner runs take 1-22 min; run levels in parallel (4 CPUs) in the
  background, stop by saved PID, never `pkill -f balance-aqueduct`.
- Env: `LEVEL=i` (default 1), `SRC=file`, `EXIT=x,y`, `TRACE=1` (plan).
  `probe-aqueduct.mjs fillmap` = cup reading per held angle; `trace` also
  prints pearls collected.
- A sim or layout change invalidates bot numbers: rerun planner,
  planner-nv and pearls. Judge feel by probes, not screenshots.
- Playtest Artifact (republish with `url`):
  https://claude.ai/artifact/21dXA2QwrHe2QZqkM5HuZf, upload copy from
  `node scripts/probe-aqueduct.mjs publish-copy OUT.html`.
