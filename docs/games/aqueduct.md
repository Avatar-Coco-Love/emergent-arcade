# Aqueduct: design note (proposal, not built)

Status: **prototype built** (`prototypes/aqueduct.html`, not in `games/`, not registered), 2026-10-01; see "Prototype results" at the end. Id when built:
`aqueduct` (permanent feedback key). Check `docs/findings.md` and
`docs/ROADMAP.md` before starting: the roadmap favors depth and revisions,
so build only after a one-screen prototype (below) feels good.

Pitch: a sealed glass vessel full of channels, chambers and a little water,
with a glowing **bead** adrift in it. Rotate the whole vessel through a full
**360°** so gravity points anywhere. Carry the bead to the exit. The exit is
a **level lock**: it opens only when marked vials hold exactly the right
water ("Spirit Level"). So the route and the water volumes are one problem.

## Verbs (shared state: where the water is)

1. **Turn**: rotate the vessel, any angle, continuous. Global: moves all
   water, the bead and floaters at once.
2. **Stopcock** (tap): toggle one valve between chambers (shut / open).
   Local: freezes a volume in place while you turn away from it.
3. **Flick** (hold the Turn input past ~120°/s): a fast swing sloshes water
   over lips a slow pour can't clear. Not a button; the same input, a
   different speed. Counts as an orthogonal skill, not a third control.

Why they conflict (design rule, `docs/findings.md` "global verb"): Turn helps
one chamber and hurts another, so the Stopcock is the only way to bank
progress. A level solves when the player finds the order: pour A, lock A,
turn, pour B, unlock.

## The two goals, one vessel

- **Bead route**: the bead floats at the surface, sinks if no water. Water
  current (flow through a channel) pushes it; gravity alone does not move it
  in air except by falling. It rides currents through channels, so you steer
  by *pouring*, not dragging.
- **Level lock (Spirit Level)**: each vial `v` has a target fill band
  `[lo, hi]`, drawn as a notch on the glass. The exit door is open only
  while **all** vials are in band for `HOLD_T` s at the *current* angle. The
  bead must be at the exit during that window.
- Integration: some vials sit on the bead's route, so draining one to
  "match" starves the current the bead needs. Some bands are angle-specific
  ("reads right only upside-down"), so the final move is a turn to a given
  angle with the water already set.

A round ends in a win (bead through the open door) or loss (bead stranded:
no water path can reach it, see `hopeless()` below), or restart.

## Water and bead simulation

Arbitrary gravity breaks Terrace Garden's per-column virtual pipes. Use a
**small particle fluid** (PBF-lite or cell-grid), target 400–800 particles,
fixed 1/60 s step, seeded and deterministic so bots can run headless.
- Chambers and channels are static polygons; collision by signed distance
  field baked at level load.
- Vial reading = particle count inside the vial polygon / capacity, low-pass
  filtered (0.3 s) so sloshing doesn't flicker the lock.
- Bead: one circle, density below water (floats), above air (falls). Drag
  from the local particle velocity gives the "carried by current" feel.
- Stopcock: a sensor-gated barrier segment in the SDF.
- Air is implicit (empty space). Trapped-air effects come free from
  incompressibility only if the sim is dense enough; do not promise air
  pockets as a mechanic in v1.
- Stuck detection `hopeless()`: flood-fill from the bead over channels at
  every angle in 15° steps; if the exit is unreachable with the water
  available, offer "Restart level" (same as Terrace Garden's `reason:
  restart`). Keep every warning-to-failure delay above reaction time.

## Input

- Phone: gravity vector from the accelerometer in **screen space**
  (`devicemotion` gravity), not Euler angles (flip near vertical). Rotate
  the **vessel** (not the page) so the frame stays fixed, avoiding motion
  discomfort. Zero at level start, small dead zone (3°), as Terrace Garden.
  iOS shows "Enable tilt". Fall back to a drag dial when no sensor.
- PC: `← →` turn at a ramped speed (hold = faster, ≈ Flick), `Q E` snap
  15°, `Space` toggles the nearest stopcock (or click it).
- Manifest text: `{tap}` for the stopcock, `{hold}` for the dial; PC keys in
  the optional `keyboard` line (`docs/adding-a-game.md`).

## Levels (draft)

| # | Name | New idea | Bead route | Vials |
|---|---|---|---|---|
| 0 | Warm-up | Turn only, no stopcock | 1 channel, 1 lip | 1, wide band |
| 1 | Two vials | Stopcock banks a volume | pour A, lock, pour B | 2 |
| 2 | The siphon | U-bend drains only past ~110° | needs a started siphon | 2 |
| 3 | Upside-down | a band reads right only at 180° | flip as the last move | 3 |
| 4 | The leak | one vial leaks; act fast or lock it | short window | 3 |
| 5 | Tide room | repeated same-way turns build a wave | alternate directions | 3 |
| 6 | Two beads | both must reach the exit together | shared current | 3 |
| 7 | Free play | seeded random vessels | endless | scaled |

Replay hooks for the 10+ minute target: seeded endless vessels (level 7),
par-turns and par-time stars per level, daily seed.

## Scoring (`docs/scores.md`)

Manifest `score`: fewer **degrees turned** plus **stopcock taps** is better
(a "tidy" route is short). Ceiling-free in endless mode: levels cleared before
a restart. Bump `score.epoch` if the formula changes.

## Achievements (3+ in the manifest)

- **First Drop**: carry the bead through the exit for the first time.
- **Banked**: win a level with every vial locked by a stopcock when the door opens.
- **Upside Down**: open the exit while the vessel is past 150°.
- **Light Touch**: win a level in under one full turn (360° total).
- **One Flick**: clear a lip with a swing that a slow pour could not.

## Telemetry

Post `arcade:result` on win/loss with time; level id in the payload
(`docs/telemetry.md`). Handle `arcade:pause` / `arcade:resume` (pause freezes
the sim and the HOLD timer).

## Balance and bots (`scripts/balance-aqueduct.mjs`)

Copy the closest harness (`balance-terrace-garden.mjs`), adapt `buildDebug()`.
One line per bot:
- `idle`: should lose 100% (nothing moves it).
- `sweeper`: rotates at constant speed; expect low, to show Turn alone is not enough.
- `greedy`: turns toward the bead's exit; test the "conflict" finding, it should strand the bead.
- `keys`: quantized turn at 15° steps, no analog; compare with analog (Terrace Garden dropped 47% vs 100%).
- `novice`: random Turn + random stopcock; target 10–30%.
- `planner`: search over angle sequences (BFS on 15° steps); target 100% on levels 0–4 to prove solvability.

Gate: `novice` must not clear levels 2+ by chance; `planner` must solve every
level in a seed range.

## Risks

1. **Sim feel**: particle water can look jittery or leak through thin walls.
   Mitigation: fat channels, CCD on the bead, SDF walls, filter vial readings.
2. **Readability**: odd angles hide what will happen next. Add the stuck
   hint (gold chevrons showing where the water goes next) after `STALL_T`.
3. **Phone performance**: 60 fps in a sandboxed iframe with ~600 particles;
   budget it in the prototype first.
4. **Motion comfort**: only the vessel rotates; the toolbar and panels stay fixed.
5. **Single-solution levels**: avoid; a vial band wide enough gives the player room.

## First step: the prototype (before any manifest entry)

One screen, one vessel, one channel, one bead, no vials, no stopcock. Done
when: (a) 600 particles hold 60 fps on a mid-range phone; (b) sloshing the
bead through the channel feels good in 30 seconds; (c) a `planner` bot can
solve it headless. If (b) fails, stop. Otherwise add vials, then the
stopcock, then levels 0–2 as one PR.

## Open ideas (not in v1)

Oil over water (two liquids); float valves; clockwork gates; salt layers;
fish tank (stranded-fish lose state); water wheels driving inner gates.

## Prototype results (2026-10-01)

Files: `prototypes/aqueduct.html` (one vessel: chambers A and B joined by a
bridge channel over a sill; exit pocket on B's floor; one bead; ~600 particles;
no vials, no stopcock), `scripts/balance-aqueduct.mjs`. Not in `games/`
because `validate.mjs` requires every file there to be registered.

Sim: Clavet double-density relaxation, 2 substeps of 1/120 s, one neighbor
search per substep, SDF walls (3 rounded boxes), gravity rotated into the
vessel frame (the vessel is drawn rotated, no inertial forces). The bead is a
two-way body of mass 7 (the water it displaces is ~14), so it floats from
pressure alone, no buoyancy code. Constants are at the top of the file.
Input: `← →` ramped turn (50 to 420 deg/s), grab-and-turn drag dial,
phone gravity in screen space (Android sign convention; iOS flipped; **not
tested on a device**).

Measured (headless Chromium, 390x740, sloshing through the real rAF loop):
- Sim 0.9 ms/frame, draw 0.3 ms at 1x CPU; 4.3 + 2.3 ms at 4x throttle.
- Frames: 1x 60 fps; 4x CPU ~54-58 fps (p95 33 ms); 6x ~34 fps. Canvas dpr is
  capped at 1.25 (raster cost dominated at dpr 2: 21-50 fps at 4x).
  Software raster here, not a phone: re-measure on a real device.
- Water: 0 particles outside walls in all runs; at rest rms speed ~1 px/s;
  stream through the channel looks like water. Bead floats at the surface and
  is held at the sill by the draining stream, so sloshing matters.

Bots (45 s limit, seeded):
- idle 0%, sweeper 0%, novice (random angles) 50% of 10, keys 20% of 10,
  planner 8/8 (beam search on 30-deg turns, replayed open-loop: 4 moves, ~330
  deg turned, median win 3.6 s).
- The vessel is too easy as a puzzle (random play wins half the time). Fine
  for a prototype; the vials and a higher sill are what make it a level.

Not verified: how the bead and water *feel* in a hand (that is the gate (b);
needs a human playtest). Snapshots must include the pair list (the viscosity
pass reuses the previous substep's pairs) or planner replays diverge.
