# Aqueduct: design note (prototype, not registered)

Status: prototype `prototypes/aqueduct.html` (not in `games/`: `validate.mjs`
requires every file there to be registered), draft PR #59. Id when built:
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
- Design rule (learned, step 3): a local verb is required only if the two
  goals need **disjoint angle ranges**. Here the cup can hold water only past
  ~90° and the ring is reachable only near upright, so the order is forced:
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
- **Score** = degrees turned (all input, dial included) + `TAP_COST` 30 per
  valve tap, lower is better. Best per level and progression in
  localStorage `aqueduct.v1`; a level unlocks when the one before is cleared.
  Win posts `arcade:result` with `level` and `score` (when framed).
- Sim: Clavet double-density, 2 substeps of 1/120 s, SDF walls; bead has
  explicit buoyancy (`LIFT` 3, probe `RING` 6 / `RING_FULL` 19) and drag
  toward local water velocity (`BEAD_DRAG` 8/s). Perf: 0.9 ms sim/frame at
  1x CPU; ~55 fps at 4x throttle, dpr capped 1.25 (headless, not a phone).
- Input: `← →` ramped turn (50-420 deg/s), drag dial, phone gravity (signs
  untested on a device), one button per valve (Space = first, `1` `2` per
  cup), `R` restart, `L`/Esc or the Levels button for level select.

| level | id | cups | exit | intended solution |
|---|---|---|---|---|
| 0 Warm-up | `warmup` | none | (100, 120) | pour across the bridge |
| 1 The cup | `one-cup` | amber | (70, 95) | tumble to -150, catch ~30% at -120, shut, ease back |
| 2 Two cups | `two-cups` | amber, violet | (70, 95) | tumble to -150 (both fill), shut violet at -60, let amber drain 69 → 35%, shut it, ease back |

Open cup hold vs angle (cup full at 180°, then turned, reading after 2-4 s):
180-135° ~100%; 120° 83%; 105° ~55%; 90° 25-44%; 75° 2-15%; 60° and
upright 0%. Why the ring at (70, 95) needs it: at |θ| ≤ ~60° (where the bead
can sit there) an open cup is empty; at -90° B drains through the bridge
mouth on its left wall, so the bead can't rest near the ring.

## Bot results (2026-10-02, levels as data)

`LEVEL=i node scripts/balance-aqueduct.mjs` (20 seeds; planners as noted).

| level | idle | sweep | greedy | keys | novice | timer | planner (valve) | planner-nv D22 B16 |
|---|---|---|---|---|---|---|---|---|
| 0 | 0% | - | 70% | 20% | 40% (10 seeds) | - | 3/3, 4 moves, score 330 | - |
| 1 | 0% | 0% | 0% | 0% | 5% | 5% | 5/5 (D14 B14), 4.3 s, 5 moves, score 420 | 0/5 |
| 2 | 0% | 0% | 0% | 0% | 0% | 0% | 3/3 (D14 B14), 5.3 s, 6 moves, score 390 | 0/3 |

Level 1 numbers are identical to step 3 (the refactor kept the sim
bit-for-bit). Level 2 plan: `[-150,0] [-150,0] [-60,violet] [-30,both]
[-30,both] [-30,amber]`. Reverse order (shut amber first at -60) traps
amber at 76% while violet drains to 0%: the lock order is the puzzle.
Level 1 step-3 detail: the valve is required because the cup holds water
only past ~90° and the ring is reachable only near upright (finding
"disjoint angles").

## Next (in order)

1. Human playtest of levels 0-2 (Artifact below): is the warm-up too easy
   (novice 40%)? Does level 2's "which one first" read without the bot plan?
   Typical human scores to set a par.
2. More levels until play reaches 10+ minutes (draft ideas below), each
   gated like level 2. Then register in `games.json` (manifest `score` as
   lower-is-better, achievements, `howToPlay`).
3. Phone tilt test after merge (iOS sign flipped, untested), real-phone fps.
4. Known gap: the door stays open 0.3 s (filter lag) after a cup is
   reopened; the level-2 planner ends with violet reopened. Harmless now.

Draft level ideas (older table in history):
siphon, upside-down band, leak, tide room, two beads, seeded free play.
Achievements draft: First Drop, Banked, Upside Down, Light Touch, One Flick.
Telemetry: `arcade:result` with level id; pause freezes sim and HOLD timer.

## Workflow notes

- Planner runs take 2-22 minutes (each valve adds a branch); run levels
  in parallel (4 CPUs): background them
  and wait with an until-loop; stop by saved PID, never `pkill -f
  balance-aqueduct` (matches your own shell).
- `LEVEL=i` picks the level (default 1), `SRC=file` tries a scratch copy;
  `probe-aqueduct.mjs fillmap` prints each cup's reading per held angle.
- `EXIT=x,y` overrides the exit for `balance-aqueduct.mjs` and
  `probe-aqueduct.mjs trace`; `TRACE=1` prints the planner's plan.
- Every sim or layout change invalidates bot numbers: rerun planner and
  planner-nv before claiming anything. Judge feel by probes, not screenshots.
- Playtest Artifact (republish with `url`):
  https://claude.ai/artifact/21dXA2QwrHe2QZqkM5HuZf, upload copy from
  `node scripts/probe-aqueduct.mjs publish-copy OUT.html`.
