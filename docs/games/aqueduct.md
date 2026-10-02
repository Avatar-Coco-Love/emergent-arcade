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

## Prototype: current layout and constants

Vessel frame, y down, rotation centre `CEN` (0, 35). Chambers A and B
(150 x 240, centres (∓100, 35)), bridge (124 x 34, centre (0, -62)) over a
high sill. Water (600 particles) starts in A; bead at A's surface.
- **Cup** (44 x 65, centre (0, -106.5)) hangs from the bridge ceiling, mouth
  down (`VIAL.inv`). Reading region y -139..-84, capacity ~78 particles, band
  25-50%, `HOLD_T` 1.0 s, filter 0.3 s.
- **Valve** plate across the cup mouth at y -80 (`VALVE`), 0.15 s slide.
- **Exit** ring (70, 95) r 18, low in B near its left wall, `EXIT_T` 0.4 s.
- Sim: Clavet double-density, 2 substeps of 1/120 s, SDF walls; bead has
  explicit buoyancy (`LIFT` 3, probe `RING` 6 / `RING_FULL` 19) and drag
  toward local water velocity (`BEAD_DRAG` 8/s). Perf: 0.9 ms sim/frame at
  1x CPU; ~55 fps at 4x throttle, dpr capped 1.25 (headless, not a phone).
- Input: `← →` ramped turn (50-420 deg/s), drag dial, phone gravity (signs
  untested on a device), Space / on-screen button for the valve.

Open cup hold vs angle (cup full at 180°, then turned, reading after 2-4 s):
180-135° ~100%; 120° 83%; 105° ~55%; 90° 25-44%; 75° 2-15%; 60° and
upright 0%. Why the ring at (70, 95) needs it: at |θ| ≤ ~60° (where the bead
can sit there) an open cup is empty; at -90° B drains through the bridge
mouth on its left wall, so the bead can't rest near the ring.

## Step 3 results: the valve is required (2026-10-02)

Bots, `node scripts/balance-aqueduct.mjs` (20 seeds; planners as noted):
- idle 0%, sweeper 0%, greedy 0%, keys 0%, novice 5% (1/20), timer 5% (1/20).
- planner (valve) 5/5 (DEPTH 14 BEAM 14): median win 4.3 s, 5 moves, 360 deg.
- planner-nv (never touches the valve) 0/5 at DEPTH 22 BEAM 16. Gate met.
- Winning plan: `[-150,0] [-120,0] [-30,1] [-60,1] [0,1]` (1 s each): the
  tumble to -150 carries the bead over the bridge into B, at -120 the cup
  catches ~30%, shut, ease back so the bead floats down to the ring.

Rejected on the way (planner-nv wins = valve optional):
- Top-opening cup under the bridge, exit high in B: (50,-45) 1/2, (70,-55)
  2/2, (45,-30) 2/2, (100,-30) 1/2, (100,-45) 2/2, (125,-35) 2/2. The A↔B
  stream refills the open cup to an in-band equilibrium (~30%) at 60-90°
  and carries the bead past high rings; exits near the bridge mouth are on
  the stream path.
- Inverted cup, exit (60, 110): planner-nv 1/3 at DEPTH 22 BEAM 16 (at -60°
  B's water pools in its bottom-left corner, next to that ring).
- Lessons: an exit must be off every stream lane, not just off the static
  surface; check both turn directions (mirror) when gating by angle.

## Next (in order)

1. Human playtest of the inverted cup (is "turn upside down to fill" readable?
   hints updated for it). Band is still a thin strip; valve housing is tiny.
2. Level format (data-driven shapes, cups, valves, exit), a second cup so the
   pour/lock order matters, score (degrees turned + valve taps), levels 0-2,
   then register in `games.json`. Not before it carries a few levels (depth
   target 10+ minutes, `docs/ROADMAP.md`).
3. Phone tilt test after merge (iOS sign flipped, untested), real-phone fps.

Draft level ideas (older table in history): warm-up (turn only), two cups,
siphon, upside-down band, leak, tide room, two beads, seeded free play.
Achievements draft: First Drop, Banked, Upside Down, Light Touch, One Flick.
Telemetry: `arcade:result` with level id; pause freezes sim and HOLD timer.

## Workflow notes

- Planner runs take 2-11 minutes (valve doubles branching): background them
  and wait with an until-loop; stop by saved PID, never `pkill -f
  balance-aqueduct` (matches your own shell).
- `EXIT=x,y` overrides the exit for `balance-aqueduct.mjs` and
  `probe-aqueduct.mjs trace`; `TRACE=1` prints the planner's plan.
- Every sim or layout change invalidates bot numbers: rerun planner and
  planner-nv before claiming anything. Judge feel by probes, not screenshots.
- Playtest Artifact (republish with `url`):
  https://claude.ai/artifact/21dXA2QwrHe2QZqkM5HuZf, upload copy from
  `node scripts/probe-aqueduct.mjs publish-copy OUT.html`.
