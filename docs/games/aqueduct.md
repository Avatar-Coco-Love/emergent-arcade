# Aqueduct: design note (prototype, not registered)

Status: prototype `prototypes/aqueduct.html` (unregistered). Id when
built: `aqueduct`. Older text and measurements: `docs/history/aqueduct.md`.

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
  `EXIT_T` s while the door is open. No loss: a stuck vessel offers ↻ (colour, below).
- The valve is required because the goals need disjoint angles (finding):
  fill upside down, shut, come back.

## Prototype: levels and constants

Levels are data (`LEVELS` in `§ levels`; fields documented in the comment
above it). A new level needs no code. Vessel frame, y down, angle 0 = upright.
- Shared vessel: chambers A and B (150 x 240, centres (∓100, 35)), bridge
  (124 x 34, centre (0, -62)) over a high sill. Levels 0-2: 600 particles
  in A, bead (-100, -10).
- **Top cup** (`TOP_CUP`, amber in 1-2; 44 x 65, centre (0, -106.5)) hangs
  from the bridge ceiling, mouth down, ~78 particles full. **Side cup**
  (`SIDE_CUP`, violet in 2; 65 x 40, centre (202, -40)) on B's right wall,
  mouth left, ~67 full. Bands 25-50%; valve plates over the mouths.
- Door: every cup in band for `HOLD_T` 1.0 s (filter 0.3 s); bead in the ring
  r 18 for `EXIT_T` 0.4 s. Valve slide `VALVE_T` 0.15 s.
- **Score** (higher is better; turning is free by design): `CLEAR_PTS`
  100 + `PEARL_PTS` 100 per pearl + up to `BULL_PTS` 100 per cup
  **bullseye** (full within `BULL_TOL` ±2% of the band's dotted centre
  line, 0 at the band edge, read at the win) + `HOME_PTS` 100. Bests in
  localStorage `aqueduct.v3`. `arcade:result` adds `pearls`.
- **Pearls** (3 per level): within `PEARL_PICK` 15 px of the bead's
  centre; corners need a nearly empty chamber. Order = `pearls` bot's.
- **Water home** (levels 0-2: chamber B, `HOME_B`): share of free water (not
  in a cup) inside it × 100, full at `HOME_FULL` 0.6. It fights the win: a
  full B floats the bead above the low ring.
- **Colour** (levels 3-5): `dye` 0 blue / 1 orange (colour-blind safe;
  was teal). A cup with `dye` counts only its colour toward the band; the
  door also needs foreign ≤ `PURITY` 20% of its contents (filtered).
  Bullseye needs a pure cup. Shown by a solid own-colour line in the cup
  (the water line counts both), a red dashed frame when mixed, and a
  valve-button gauge (own vs band, foreign striped after it).
- **Colours layer, they don't blend**: blue poured onto orange stays on
  top (level 3 pour-first habit: still 10% via upside down). A full spin
  at 90°/s interleaves them for good (43% foreign at best).
- **Stuck check** `stuckCup()`: own-colour water in cells ≥ 80% that
  colour under `MIX_NEED` 2 × the band floor for `HOPE_T` 2 s → hint, ↻
  pulses. Reachability is unknown, so counts overlap (rescuable 59, lost
  63); 2× flags a full spin (31), no rescuable state measured. Misses are
  fine: ↻ (`R`) is always in the toolbar.
- **Colour homes** (`home` as a list, one region per `dye`, `full` 0.9,
  sharing `HOME_PTS`): blue in A, orange in B. The bead still needs blue
  poured across, so it fights the win as before.
- **Bead trail** (looks only): last `TRAIL_N` 32 frames (0.53 s, user: "a bit less"; was 48), alpha `TRAIL_A` 0.35, fading and
  narrowing. The whole path (a point per `PATH_EVERY` 3 frames, thinned
  past `PATH_MAX` 2400) is drawn at the win with dots on the pearls
  collected; the win card waits 1.2 s and dims less (`#menu.won`).
- **Free pour**: last in `LEVELS`, a toy (no exit or score); history.
- Sim, perf and input details: history, "Sim and input".

| level | id | cups | exit | intended solution |
|---|---|---|---|---|
| 0 Warm-up | `warmup` | none | (100, 120) | pour across the bridge |
| 1 The cup | `one-cup` | amber | (70, 95) | tumble to -150, catch ~30% at -120, shut, ease back |
| 2 Two cups | `two-cups` | amber, violet | (70, 95) | tumble to -150 (both fill), shut violet at -60, let amber drain 69 → 35%, shut it, ease back |
| 3 Second spring | `second-spring` | orange (side) | (70, 95) | tip ~50° (orange first: 37%, 4% blue), shut, pour the bead across |
| 4 Wrong way round | `wrong-way` | orange (top) | (70, 95) | level 1's -150 is 59% blue; -90 for 3 s (peak 67%, 39% at 3 s, pure), shut |
| 5 Sorting | `sorting` | blue (top), orange (side) | (70, 95) | orange at ~50 first, shut; blue from A's pour |

Levels 3-5 start with 450 blue in A, 250 orange in B, bead in A.

Fill maps, why the valve is needed: history, "Step 4 measurements".

## Bot results

Levels 0-2 (one colour, 2026-10-02): planner wins all (4.3-5.3 s, 4-6
moves), planner-nv 0, every simple bot ≤ 5% (warm-up: greedy 70%,
novice 40%). Tables, water-home spreads and pearl routes: history, "Bot
results, levels 0-2".

Levels 3-5 (2026-10-02): planner 3/3 (6.4 / 5.8 / 6.4 s; 7 / 6 / 7
moves), L3 planner-nv 0/3; idle, greedy, novice, timer, keys 0/20 each.
Direct route 0 pearls on each; pearls bot 3/3 pearls on L3 and L5. L4's
pearls bot mixed the orange away (`OPENING` cup-first rerun pending).

Pearls sit off the direct route (finding "off the solution's lanes"); the
warm-up's free pearl at 90° is on purpose. Placement notes: history.

## Next (in order)

1. Human playtest of levels 0-2 and free pour (Artifact below): are pearls
   visible and wanted? Bullseye line readable? Does "water home" read, and
   does the bead-vs-water trade feel fair or fiddly? Warm-up too easy
   (novice 40%)? Does level 2's "which one first" read? Human scores for a par.
   Levels 3-5: is the own-colour line / gauge readable? Does level 4's
   "other way round" land? Is ↻ found when mixed? Trail length now OK?
2. Register next PR (user, 2026-10-02: deploy once playable; 10+ minutes
   is not required first, players' feedback from the site is the point).
   Move to `games/aqueduct.html`; manifest (`goal`, `howToPlay`,
   `keyboard`, accent), `score` (higher, per-level `boards`, epoch 1), 3+
   achievements. Launch `version` 5, `changes` (agreed 2026-10-02; dates
   10-01, 10-01, 10-02, 10-02, merge): 1 first vessel, turn to pour;
   2 cup lock and valve; 3 levels, two cups; 4 pearls, bullseye; 5 water
   home, free pour, trail + this batch (colours, levels 3-5, restart). Drop HUD debug; repoint bot scripts; `smoke-gallery.mjs`.
3. Phone tilt test after merge (iOS sign flipped, untested), real-phone fps.
4. Known gap: the door stays open 0.3 s (filter lag) after a cup reopens.

Level ideas: history (siphon, leak, tide room…). User,
2026-10-02: differently shaped and open vessels; a **separator** in the
middle that splits mixed water, one colour each way, past a one-way line
it can't fall back over (a later colour level: undoes mixing at a cost).
Achievements draft: First Drop, Banked, Upside Down, Light Touch (fewest
valve taps), One Flick, Pearl Diver (all pearls on a level), Bullseye
(100 on every cup), Sorted (a colour level with both homes full).

## Workflow notes

- Planner runs take 1-22 min: run levels in parallel (4 CPUs), stop by
  PID, never `pkill -f balance-aqueduct`.
- Env: `LEVEL=i` (default 1), `SRC`, `EXIT=x,y`, `TRACE=1`. Probe
  `fillmap` / `trace` print cup readings, pearls, colours per chamber.
- A sim or layout change invalidates bot numbers (rerun planner,
  planner-nv, pearls).
- Playtest Artifact (republish with `url`):
  https://claude.ai/artifact/21dXA2QwrHe2QZqkM5HuZf, upload copy from
  `node scripts/probe-aqueduct.mjs publish-copy OUT.html`.
