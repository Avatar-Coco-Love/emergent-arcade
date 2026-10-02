# Aqueduct: history

Superseded design-note text, prototype measurements and playtest logs.
Current design: `docs/games/aqueduct.md`. Add new entries at the top;
sessions don't read this file by default.

## v6 tilt (2026-10-02)

User on a phone: tilt "super glitchy and cannot be turned off". v5 read
`devicemotion` gravity with a UA-guessed iOS sign, set `angle` straight from
each raw sample (no smoothing, 3° dead zone only) and still drew the vessel
rotated by `angle`, so the vessel turned on screen *and* with the phone
(double turn, water falling toward the screen's bottom, not the real
down). The button hid itself once on. v6 copies Bubble Glass's playtested
model: `deviceorientation` beta/gamma + screen angle give real gravity on
screen (`tiltA`, dead zone `DEAD`, 0.5 smoothing), the vessel is drawn level
(rotation 0), `angle` follows `tiltA` at `TARGET_RATE`, level settle runs
upright. The button toggles Tilt on/off; drag or ← → switch it off.
Headless check (synthetic events): on/off, 40° roll followed, ±1.5° jitter
ignored, drag turns it off.

## Prototype to game (2026-10-02, moved from the design note at registration)

Status before: prototype `prototypes/aqueduct.html`, unregistered. The
"Next" item that became the registration PR: register once playable (user,
2026-10-02: 10+ minutes not required first; players' feedback from the
site is the point). Move to `games/aqueduct.html`; manifest (`goal`,
`howToPlay`, `keyboard`, accent), `score` (higher, per-level `boards`,
epoch 1), 3+ achievements. Launch `version` 5, `changes` agreed
2026-10-02 (dates 10-01, 10-01, 10-02, 10-02, merge): 1 first vessel,
turn to pour; 2 cup lock and valve; 3 levels, two cups; 4 pearls,
bullseye; 5 water home, free pour, trail + the colours batch (colours,
levels 3-5, restart). Drop HUD debug; repoint bot scripts.

Prototype HUD (dropped): two lines, `level. name · pearls · score/max ·
best · key help`, then angle, each cup's reading (`amber cup 34% (25-50,
aim 37.5)`, foreign share, TOO MIXED), DOOR OPEN, fps and sim ms. The
level menu opened with a paragraph of instructions (now the manifest's
`howToPlay`). Results posted `level` as the level id and `pearls` at the
top level.

Stuck check counts (moved from the note): reachability is unknown, so
the clean-water counts overlap (rescuable 59, lost 63); `MIX_NEED` 2×
flags a full spin (31), no rescuable state measured.

Achievement ideas not used at launch: Banked, Upside Down, Light Touch
(fewest valve taps), One Flick, and Sorted as "a colour level with both
homes full" (feasibility never measured; it fights the win, so Sorted
became "clear Sorting").

## Bot results, levels 0-2 (2026-10-02, moved from the design note)

`LEVEL=i node scripts/balance-aqueduct.mjs` (20 seeds; planners as noted).

| level | idle | sweep | greedy | keys | novice | timer | planner (valve) | planner-nv D22 B16 |
|---|---|---|---|---|---|---|---|---|
| 0 | 0% | - | 70% | 20% | 40% (10 seeds) | - | 3/3, 4 moves | - |
| 1 | 0% | 0% | 0% | 0% | 5% | 5% | 5/5 (D14 B14), 4.3 s, 5 moves | 0/5 |
| 2 | 0% | 0% | 0% | 0% | 0% | 0% | 3/3 (D14 B14), 5.3 s, 6 moves | 0/3 |

Water home at the win (share of free water in B; before `HOME_FULL`
scaling, measured 2026-10-02): planner L0 14-28%, L1 8-39%, L2 14-39%
(3 seeds); pearls bot L0 39-48% (2); greedy L0 24-65% (14 wins). Spread
well over 20 points, so it scores; nothing passed 65%, hence full at 60%.

Pearl routes and pre-home scores per level (planner 0-1 pearls, pearls bot
3/3 on every level): history, "Pearl routes".

## Free pour (moved from the design note, 2026-10-02)

- **Free pour**: last entry in `LEVELS` (`free: true`, id `free`): no exit,
  cups, pearls, score or `arcade:result`; split dye; bead in; always
  unlocked, shown after the numbered levels, never the "Next level".

## Sim and input (current as of 2026-10-02)

- Sim: Clavet double-density, 2 substeps of 1/120 s, SDF walls; bead has
  explicit buoyancy (`LIFT` 3, probe `RING` 6 / `RING_FULL` 19) and drag
  toward local water velocity (`BEAD_DRAG` 8/s). Perf: 0.9 ms sim/frame at
  1x CPU; ~55 fps at 4x throttle, dpr capped 1.25 (headless, not a phone).
- Input: `← →` ramped turn (50-420 deg/s), drag dial, phone gravity
  (untested on a device), valve buttons (Space, `1` `2`), `R`, `L`/Esc.

## Pearl routes (2026-10-02, before water home scored)

`planner` = direct route, ignores pearls; `pearls` = visits them in data
order, then exits (D22 B12, 2 seeds). Score = clear + pearls + bullseye.

| level | pearls at | planner: pearls, score | pearls bot: win, s, moves, score | plan |
|---|---|---|---|---|
| 0 | A top-left, A bottom-left, B top-right | 1/3, 200 | 2/2, 5.3 s, 6, 400 | `180 270 90 30 30` |
| 1 | A top-left, A bottom-left, B bottom-right | 0/3, 169 | 2/2, 6.2 s, 7, 493 | `180 300 210 60 240a 270a 240` |
| 2 | A top-left, A bottom-right, A bottom-left | 0/3, 172 | 2/2, 7.6 s, 8, 567 | `150a 270 150a 120ab -30ab 30a` |

## Plan for the trail / free pour / water-home PR (done 2026-10-02)

Agreed then: dye as level data (levels 0-2 one colour); home scored only if
bots spread over 20 points (they did); free pour as a separate menu entry,
same vessel, bead in; short live trail + whole path at the win. The plan as
written before:

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

## Pearl placement (2026-10-02)

Level 2's first draft (B top-right, B bottom-right) gave the direct route
2/3 pearls for free: tumbling to -150 sweeps the bead along B's right
wall. Pearls must sit off the solution's lanes (same lesson as the exit).
The warm-up's free pearl (A top-left at 90°) is kept on purpose: it shows
what a pearl is. Random play (30 runs, 40 s) passes almost every chamber
cell, cup interiors never: every chamber spot is reachable, so the only
question is whether the direct route grazes it.

## Step 4 measurements (moved 2026-10-02)

Open cup hold vs angle (cup full at 180°, then turned, reading after 2-4 s):
180-135° ~100%; 120° 83%; 105° ~55%; 90° 25-44%; 75° 2-15%; 60° and
upright 0%. Why the ring at (70, 95) needs it: at |θ| ≤ ~60° (where the bead
can sit there) an open cup is empty; at -90° B drains through the bridge
mouth on its left wall, so the bead can't rest near the ring.

Level 1 numbers are identical to step 3 (the refactor kept the sim
bit-for-bit). Level 2 plan: `[-150,0] [-150,0] [-60,violet] [-30,both]
[-30,both] [-30,amber]`. Reverse order (shut amber first at -60) traps
amber at 76% while violet drains to 0%: the lock order is the puzzle.
Level 1 step-3 detail: the valve is required because the cup holds water
only past ~90° and the ring is reachable only near upright (finding
"disjoint angles").

## Step 4 score: degrees turned (replaced 2026-10-02)

Score was degrees turned (all input, dial included) + `TAP_COST` 30 per
valve tap, lower is better (localStorage `aqueduct.v1`). Planner scores:
level 0 330, level 1 420, level 2 390. Dropped after the first playtest:
the user enjoys just watching the water, so turning must not cost anything.
Replaced by clear + pearls + cup bullseye (higher is better).

## Step 3: layouts rejected before the inverted cup (2026-10-02)

Moved from the design note when levels became data (step 4).

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

## Design note as of 2026-10-02, before step 3 (inverted cup), verbatim

Everything below was the whole of `docs/games/aqueduct.md` until the inverted
cup layout replaced the top-opening cup. Bot numbers in it were measured on
the old layouts and do not hold for the current file.

### Aqueduct: design note (proposal, not built)

Status: **prototype built** (`prototypes/aqueduct.html`, not in `games/`, not registered), 2026-10-01; see "Prototype results" at the end. Id when built:
`aqueduct` (permanent feedback key). Check `docs/findings.md` and
`docs/ROADMAP.md` before starting: the roadmap favors depth and revisions,
so build only after a one-screen prototype (below) feels good.

Pitch: a sealed glass vessel full of channels, chambers and a little water,
with a glowing **bead** adrift in it. Rotate the whole vessel through a full
**360°** so gravity points anywhere. Carry the bead to the exit. The exit is
a **level lock**: it opens only when marked vials hold exactly the right
water ("Spirit Level"). So the route and the water volumes are one problem.

### Verbs (shared state: where the water is)

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

### The two goals, one vessel

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

### Water and bead simulation

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

### Input

- Phone: gravity vector from the accelerometer in **screen space**
  (`devicemotion` gravity), not Euler angles (flip near vertical). Rotate
  the **vessel** (not the page) so the frame stays fixed, avoiding motion
  discomfort. Zero at level start, small dead zone (3°), as Terrace Garden.
  iOS shows "Enable tilt". Fall back to a drag dial when no sensor.
- PC: `← →` turn at a ramped speed (hold = faster, ≈ Flick), `Q E` snap
  15°, `Space` toggles the nearest stopcock (or click it).
- Manifest text: `{tap}` for the stopcock, `{hold}` for the dial; PC keys in
  the optional `keyboard` line (`docs/adding-a-game.md`).

### Levels (draft)

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

### Scoring (`docs/scores.md`)

Manifest `score`: fewer **degrees turned** plus **stopcock taps** is better
(a "tidy" route is short). Ceiling-free in endless mode: levels cleared before
a restart. Bump `score.epoch` if the formula changes.

### Achievements (3+ in the manifest)

- **First Drop**: carry the bead through the exit for the first time.
- **Banked**: win a level with every vial locked by a stopcock when the door opens.
- **Upside Down**: open the exit while the vessel is past 150°.
- **Light Touch**: win a level in under one full turn (360° total).
- **One Flick**: clear a lip with a swing that a slow pour could not.

### Telemetry

Post `arcade:result` on win/loss with time; level id in the payload
(`docs/telemetry.md`). Handle `arcade:pause` / `arcade:resume` (pause freezes
the sim and the HOLD timer).

### Balance and bots (`scripts/balance-aqueduct.mjs`)

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

### Risks

1. **Sim feel**: particle water can look jittery or leak through thin walls.
   Mitigation: fat channels, CCD on the bead, SDF walls, filter vial readings.
2. **Readability**: odd angles hide what will happen next. Add the stuck
   hint (gold chevrons showing where the water goes next) after `STALL_T`.
3. **Phone performance**: 60 fps in a sandboxed iframe with ~600 particles;
   budget it in the prototype first.
4. **Motion comfort**: only the vessel rotates; the toolbar and panels stay fixed.
5. **Single-solution levels**: avoid; a vial band wide enough gives the player room.

### First step: the prototype (before any manifest entry)

One screen, one vessel, one channel, one bead, no vials, no stopcock. Done
when: (a) 600 particles hold 60 fps on a mid-range phone; (b) sloshing the
bead through the channel feels good in 30 seconds; (c) a `planner` bot can
solve it headless. If (b) fails, stop. Otherwise add vials, then the
stopcock, then levels 0–2 as one PR.

### Open ideas (not in v1)

Oil over water (two liquids); float valves; clockwork gates; salt layers;
fish tank (stranded-fish lose state); water wheels driving inner gates.

### Prototype results (2026-10-01)

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

### Step 1 results: vial and level lock (2026-10-01)

Added to `prototypes/aqueduct.html` (still no stopcock, one level):
- Chambers A and B are taller (240 px) and the channel sits higher, so the
  sill is 56 px above the starting water. A **vial** (28 px wide, 200 px
  tall, open at the top into the bridge) hangs between them: water crossing
  the bridge drops in. Reading = particles inside `VIAL` / capacity (~179),
  low-pass 0.3 s (`FILT`). Target band 25-50% (`BAND`), drawn as a green
  strip on the glass.
- **Lock**: the exit door opens after `HOLD_T` 1.0 s in band and closes if
  the reading leaves it. Win = bead inside the exit circle (right wall of B)
  for 0.4 s with the door open. HUD shows the vial %, band and door state.
- A vial open only at the top banks its water: it holds until tilted past
  roughly atan(2*(L-d)/w), about 80 deg when half full. That is
  hysteresis with no stopcock, and is what makes this more than a dial.

Bots (45 s limit, 20 seeds; planner 5, DEPTH=14 BEAM=10):
- idle 0%, sweeper 0%, keys 0%, novice 5%, greedy (bead toward exit, ignores
  vial) 15%, planner 5/5 (median win 5.3 s, ~390 deg turned, ~530 rollouts).
- Planner at DEPTH=10 BEAM=6 won 2 of 3: the search needs the deeper default.
- Gate met: novice well under 30%, planner wins every seed. Greedy's 15%
  is luck (a sweep happens to bank the vial); not a design problem yet.

Open: all bots here turn only, since the stopcock does not exist, so the
"Turn alone must not win" finding is not testable until step 2. Exit and
band positions were picked by one planner pass, not tuned; a player may find
the 25-50% band hard to read. Phone feel and tilt direction still untested.

### Step 2 results: the stopcock (2026-10-02)

Changed in `prototypes/aqueduct.html` (still one level):
- **Valve** at the vial's neck: a 44 px plate (`VALVE`) slides across in 0.15 s,
  solid in the SDF. Space or the fixed on-screen button toggles it; the
  harness uses `setValve()`. Snapshots include the valve.
- **Vial is now a short wide cup** (44 x 55 px, ~78 particles, band 25-50%).
  The tall tube from step 1 let a no-valve bot bank water through
  hysteresis; the cup spills past about 55-60 deg.
- **Exit moved to (100, 0)**, mid-height in B (`__EXIT` overrides it for
  bots: `EXIT=x,y node scripts/balance-aqueduct.mjs ...`).

What I learned (this changed the design, so it is worth keeping):
- A particle vial does not spill where tube geometry predicts: at exactly
  90 deg the water lies along a wall and stays. The first valve test
  (exit on B's right wall, or near the bridge) was won by `planner-nv`
  (planner that never touches the valve) 3/3, so the valve was optional.
- The bead sits on the water surface, so an exit pins *where the surface is*
  (volume and angle together), not just a spot. The vessel is left-right
  symmetric, so a bot can also tilt the other way. Exit candidates tried,
  `planner-nv` wins (3 seeds): (152,40) 3, (152,100) 3, (40,-30) 3,
  (40,-10) 3, (100,135) 3, (45,130) 3, (152,-60) 2, (45,-60) 1, (152,-45) 1,
  **(100,0) 0**. Only (100,0) needs the valve.
- Solution that needs it: tilt -120, shut the valve with the cup in band,
  turn through to -270 (=90 deg) with the cup sealed.

Bots at the shipped exit (20 seeds; planner 5, DEPTH=14 BEAM=14):
- idle 0%, sweeper 0%, greedy 0%, novice (random turns, 30% valve toggles)
  0%, timer (valve toggled every 2 s, random turns) 0%, keys 0%.
- planner (uses the valve) 5/5: median 4.2 s, 270 deg turned, ~1100 rollouts.
- planner-nv (no valve): 0/3 at DEPTH=14 BEAM=10 and 0/3 at DEPTH=22 BEAM=16.
- Gates met: the valve is required (planner-nv loses), reading it matters
  (timer loses), planner solves every seed. The planner needed a bonus for
  "banked and valve shut" to find the plan at BEAM=10 (1 of 3 before, 4 of 4
  after at BEAM=14).

Open: novice 0% is harsh for a first level; the 25-50% band is a thin strip
(14 px) on the cup and hard to read; the winning plan is one idea, so this is
level-1 depth, not a puzzle yet. Cost of misuse: shutting at the wrong
fill is undone by opening and re-filling, so the penalty is time and
degrees (the future score), not failure. Phone tilt and feel: untested.
Next: level format with data-driven shapes, a second vial (so the pour/lock
order matters), the score, levels 0-2.

Readability pass (2026-10-02, after a first look said the valve's purpose was
unclear): an on-screen hint changes with state (goal; "shut the valve to keep
it" when the cup reaches the band; "too much water"; "door open, carry the
bead"), and the cup glows green (gold once the door is open) with a dotted
link to the exit ring. No sim change, so the bot numbers above still hold.
If the valve still does not read in a playtest, redesign the lock instead.

### Playtest 1: "not enough water to get the bead into the gold ring" (2026-10-02)

First human feedback on the exit at (100, 0). Cause, from tracing the
planner's win: the exit is high (y=0), the bead only rides the surface, and
the planner flips the vessel upside-down to pour *almost all* the water into
B (577 of 600 particles at the end). At 90 deg most water stays in A (its right
wall holds it; only the bridge-height row drains), so a person who banks the
cup and tilts to 90 never gets B deep enough. Nothing on screen said so.

Changes: exit lowered to **(100, 35)**; a hint ("not enough water on the ring
side... pour most of it across the bridge") when the cup is banked but under
70% of the loose water is in B.

Bots at (100, 35) (20 seeds; planner 3, DEPTH=14 BEAM=14):
- idle, sweeper, greedy, novice, timer, keys: all 0%.
- planner (valve) 3/3 but a long plan: 12 moves, median 11.5 s, 1140 deg.
  planner-nv 0/3. At (100, 70) the plan is short (4 moves, 4 s) but
  planner-nv won 1/3, so the valve was not strictly required.
- Trade-off to revisit: a lower exit is easier to reach but lets the no-valve
  route in; the valve only forces an order while the exit needs a lot of water
  in B. A second vial or a valve in the bridge is the better way to force
  order than raising the ring.

### Playtest 2: the bead hangs in mid-water (2026-10-02), and what it undid

Feedback: "the bead doesn't always ride the surface and can get stuck in the
middle." Reproduced: a bead put 55-60 px under the surface at upright did
not rise at all in 3 s. The earlier claim that it "floats from pressure
alone" was wrong; it only looked right because it started at the surface.
Particle pressure is too soft to lift a light body.

Fix: explicit buoyancy and drag in `substep()`. Probe = particles within
`RING` 6 px of the bead's edge (19 = fully submerged, `RING_FULL`);
submerged fraction f; net acceleration g(1 - `LIFT` f) with `LIFT` 3, plus
drag toward the local water velocity (`BEAD_DRAG` 8/s). A bead 60 px deep now
reaches the surface in 1-2 s at every angle tried and stays there
(`node scripts/probe-aqueduct.mjs float`).

**This invalidates the "valve is required" results above.** They were
measured with a bead that could hang mid-water. With the fixed bead
(planner-nv = planner that never touches the valve, 3 seeds, DEPTH 14 BEAM 10):
exits (100,35) 3/3, (100,-10) 3/3, (152,-60) 3/3; with a shallower cup
(spills near 35 deg, band 30-70%): (100,35) 3/3, (152,40) 3/3. So today the
valve is **optional**: the planner wins by filling the cup last, while the bead
already waits at the ring. Valve planner at (100,35): 3/3, 4.1 s, 5 moves.
Dumb bots (20 seeds) at (100,35): idle 0, sweeper 0, greedy 0, novice 5%
(1/20), timer 0, keys 0.

Lesson (findings candidate): a local verb is only required if the other
goal can't be reached *after* it. Filling the cup and reaching the exit
must pull in opposite directions (feed the cup tilting one way, bead exit
reachable only tilting the other), or a bot just does them in the lucky
order. Constants (exit height, cup depth) did not fix that; layout will.
Candidate: exit in chamber A's far wall while the cup is fed by the
bridge's A-to-B flow, so the tilt that feeds the cup is the one that
spills it. Second vial or a valve in the bridge are the other options.

### Handoff for the next session (2026-10-02)

State: draft PR #59 (branch `ccr-919a22bc-mf1990`), prototype only, nothing in
`games/` or `games.json`. Private playtest Artifact (republish with `url`):
https://claude.ai/artifact/21dXA2QwrHe2QZqkM5HuZf (make the upload copy with
`node scripts/probe-aqueduct.mjs publish-copy OUT.html`).

Owner's direction: wants this to grow into complicated, intricate puzzles;
accepted my step order. Cannot test phone tilt until the PR merges (the
artifact sandbox), so tilt direction (Android signs; iOS flipped) is
**untested**. Feedback so far: flow looks great; valve purpose unclear (hints
added); ring unreachable (exit lowered to (100,35)); bead hung mid-water
(real buoyancy added).

Open, in order:
1. **The valve is optional** (planner-nv wins 3/3 with the fixed bead). Find a
   layout where it is required: filling the cup and reaching the exit must pull
   opposite ways. Candidate: exit on A's far wall, cup fed by the A-to-B
   bridge flow. Gate: planner-nv 0/N at DEPTH 22 BEAM 16, planner 3/3, novice
   under 30%, timer ~0. Do this before anything else.
2. Level format (data-driven shapes, vials, valves, exit), a second vial so the
   pour/lock order matters, score (degrees turned + valve taps), levels 0-2,
   then register in `games.json`. Do not register before it can carry a few
   levels; depth target is 10+ minutes (`docs/ROADMAP.md`).
3. Band readability (cup band is a ~14 px strip), valve housing is tiny,
   phone tilt test after merge, real-phone fps (4x CPU slowdown held ~55 fps).

Workflow gotchas learned: planner runs take 1-11 minutes (valve doubles the
branching), run them in the background and poll with an until-loop; never
`pkill -f balance-aqueduct` (the pattern matches your own shell, run it by saved
PID); every sim change invalidates bot numbers and exit tuning, rerun
planner and planner-nv before claiming anything; judge "feel" claims by
probing (float, trace), not by what a screenshot looks like.
