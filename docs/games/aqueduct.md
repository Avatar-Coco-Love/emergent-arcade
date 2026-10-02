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
  `EXIT_T` s while the door is open. Loss (later): `hopeless()`, offer restart.
- The valve is required because the goals need disjoint angles (finding):
  fill upside down, shut, come back.

## Prototype: levels and constants

Levels are data (`LEVELS` in `§ levels`; fields documented in the comment
above it). A new level needs no code. Vessel frame, y down, angle 0 = upright.
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
  Plus water home (above). Max 500 / 600 / 700 (levels 0-2). Bests in
  localStorage `aqueduct.v3` (`v1`, `v2` read only as "cleared"). `arcade:result` adds `pearls`.
- **Pearls**: level data `pearls: [{x, y}]` (3 per level), collected when
  the bead's centre comes within `PEARL_PICK` 15 px. Corner pearls need the
  bead in a nearly empty chamber. Data order = the `pearls` bot's order.
- **Water home**: level data `home` {x0, x1, y0, y1, pts} (levels 0-2:
  chamber B, `HOME_B`). At the win, the share of free water (not in any
  cup's read region) inside it scores `HOME_PTS` 100 × min(1, share /
  `HOME_FULL` 0.6). Cup water is excluded, so it never fights the bullseye.
  It fights the win instead: a full B floats the bead above the low ring
  (pour everything over and the bead is left behind in A).
- **Dye** (looks only so far): level data `water[].dye` = `DYE` index
  (default 0, blue) or `'split'` (left/right half of the start chamber,
  blue / teal). Levels 0-2 are one colour; the second colour is kept for
  levels where it means something (colour sorting, below).
- **Bead trail** (looks only): last `TRAIL_N` 48 frames (0.8 s), fading and
  narrowing. The whole path (a point per `PATH_EVERY` 3 frames, thinned
  past `PATH_MAX` 2400) is drawn at the win with dots on the pearls
  collected; the win card waits 1.2 s and dims less (`#menu.won`).
- **Free pour**: last entry in `LEVELS` (`free: true`, id `free`): no exit,
  cups, pearls, score or `arcade:result`; split dye; bead in; always
  unlocked, shown after the numbered levels, never the "Next level".
- Sim, perf and input details: history, "Sim and input".

| level | id | cups | exit | intended solution |
|---|---|---|---|---|
| 0 Warm-up | `warmup` | none | (100, 120) | pour across the bridge |
| 1 The cup | `one-cup` | amber | (70, 95) | tumble to -150, catch ~30% at -120, shut, ease back |
| 2 Two cups | `two-cups` | amber, violet | (70, 95) | tumble to -150 (both fill), shut violet at -60, let amber drain 69 → 35%, shut it, ease back |

Cup hold vs angle (fill map) and why the ring needs the valve: history,
"Step 4 measurements".

## Bot results

Levels 0-2 (one colour, 2026-10-02): planner wins all (4.3-5.3 s, 4-6
moves), planner-nv 0, every simple bot ≤ 5% (warm-up: greedy 70%,
novice 40%). Tables, water-home spreads and pearl routes: history, "Bot
results, levels 0-2".

Pearls sit off the direct route (finding "off the solution's lanes"); the
warm-up's free pearl at 90° is on purpose. Placement notes: history.

## Next (in order)

1. Human playtest of levels 0-2 and free pour (Artifact below): are pearls
   visible and wanted? Bullseye line readable? Does "water home" read, and
   does the bead-vs-water trade feel fair or fiddly? Warm-up too easy
   (novice 40%)? Does level 2's "which one first" read? Human scores for a par.
2. More levels until play reaches 10+ minutes (draft ideas below), each
   gated like level 2, with 3 pearls off the direct route (check with
   `planner` vs `pearls`) and a `home` region where spilling tempts.
   **Colour sorting** (user, 2026-10-02): the second dye first appears in
   the level that uses it; later levels keep the colours apart and fill
   cups with their own colour. Plan: a cup counts only its own dye, with a
   purity limit (e.g. ≤15% foreign); mixing can't be undone (same
   density, no diffusion), so build `hopeless()` + one-key restart first.
3. Register (move to `games/aqueduct.html`, `validate.mjs` then applies):
   manifest (`goal`, `howToPlay`, mechanics, `keyboard`, accent), `score`
   (higher, per-level `boards` + `boardList`, epoch 1), 3+ achievements
   with `unlock()`; launch at `version` 5 with `changes` (agreed with
   the user 2026-10-02; dates 10-01, 10-01, 10-02, 10-02, merge date):
   1 first vessel: one bead, water, turn to pour; 2 cup lock and valve;
   3 levels, level select, two cups; 4 pearls and cup bullseye score;
   5 water home, free pour, bead trail (+ any later level batch). Drop the fps/sim
   debug from the HUD and move in-file instructions to the manifest; point
   `balance-`/`probe-aqueduct.mjs` at the new path; `smoke-gallery.mjs`.
4. Phone tilt test after merge (iOS sign flipped, untested), real-phone fps.
5. Known gap: the door stays open 0.3 s (filter lag) after a cup reopens.

Level ideas: history (siphon, leak, tide room, two beads…).
Achievements draft: First Drop, Banked, Upside Down, Light Touch (fewest
valve taps), One Flick, Pearl
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
