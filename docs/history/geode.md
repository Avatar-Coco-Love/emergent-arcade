# Geode: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/geode.md`. Add new entries at the top of the relevant
section; sessions don't read this file by default.

## History

- v1 (2026-10-04): first version, from the brief below
  (`docs/ideas/geode.md`, PR #83).

## v1: departures from the brief and why (bot evidence)

Each change was forced by `scripts/balance-geode.mjs` (100-200 seeded runs
per bot); the brief's constants were starting guesses.

1. **Impurities swap into the crystal instead of landing on the frontier.**
   With frontier landings an impurity added a site and its cleave removed
   it: cleaving was mass-free and instant, so careful bots never lost and
   the never-cleave bot was the only one in danger. Swapping into an
   existing ion makes each cleave cost a site that growth must refill.
   Landing anywhere first made the skilled bot cut whole branches (a
   dendrite's base), so impurities now take **embedded** sites only
   (`IMP_K` = 4+ neighbours, ring ≥ 2, weighted toward the rim): a cleave
   leaves a clean vacancy, which is the brief's chip-and-heal loop.
2. **Impurities creep up instead of sitting at a floor.** The brief's
   `IMP_FLOOR` 0.45 plus `SPREAD` made a halo that annealing contained
   (ring 1 at ~0.2), so the never-cleave bot survived in the glow. Now an
   impurity's strain rises `IMP_RISE`/s from 0.65 (anneal can't touch it)
   and bursts at 1 with `IMP_SHOCK` 0.5: a fuse of ~29 s, visible as an arc.
3. **The pool ages by impurity rate, not mostly by income.** `AGE` cutting
   income to 15% made every careful bot stall below quota from geode 5 (a
   soft lock: the quota became unreachable). Income now floors at 50%, and
   the impurity interval divides by `1 + age/IMP_AGE` (aging faster each
   geode), so staying late costs cleaves and risk instead.
4. **Pool life and a second loss reason (`thin`).** Even then a careful
   player could stall (cleaves eating growth), and the brief's model had
   no end for that. After `POOL_LIFE` (200 s) the geode seals: harvested if
   at quota, else lost as `thin`. The brief rejected a second loss for
   legibility; the alternative was a still-winnable-looking soft lock
   (findings: a budget that can stall freezes the round). The ring around
   the pool shows the time left.
5. **Growth economy.** With the brief's `G` 0.5, growth was always limited
   by the pool, never by temperature, so annealing cost nothing and the
   anneal-park bot banked as well as skilled. Now `c(T) = (1 - T/0.8)^2`
   (the glow grows at ~6% of cold), `SIG_CAP` 0.5 so annealing fills the
   pool and overflows, and seeds cost 3× an auto ion (`SEED_ION` 0.18, was
   = `ION`): seeding spends what annealing saves, and all-anneal play is
   pool-bound and slow. At `SEED_ION` 0.12 the never-seed bot beat skilled.
6. **Strain can crack without impurities.** At `INHERIT` 0.5 / `SPEED` 0.3
   cold growth settled below fracture and a 15 s/15 s timer thermostat beat
   the strain reader (g15 vs g10). `INHERIT` 0.7, `SPEED` 0.45 and a slower
   `ANNEAL` (0.10, was 0.20: it erased everything in 10 s) make long cold
   spells crack and cascade; the cold bot now shatters in 30 s.
7. **Escalation by rules.** Income scales with the quota only as
   `(quota/46)^0.5` (bigger geodes take longer), impurities come in pairs
   from geode 4, annealing weakens 13% per geode (floor 30%), events from
   geode 2 with `EV_OFF` 0.3 every 30-50 s. Quota +10 per geode (was +8).
8. **Topics:** `timing` instead of `planning` (adding-a-game: planning is
   moves worked out ahead under a budget; Geode is acting at the right
   moment in a moving system).
9. **Harvest is a plain button** (not a 0.6 s hold): an early harvest only
   banks less, and a hold on the button would read as a fourth verb.
10. **No `reason: thin` from an exhausted budget mid-geode**; `thin` means
   only "the pool's life ran out below quota".

## Tuning path (skilled / timer / annealPark, median geode)

| Step | skilled | timer | annealPark | note |
|---|---|---|---|---|
| brief constants | 5 (stall) | 4 | 3 | every cleaving bot stalls |
| income floor 50%, impurity aging | 17 (cap) | 15 | 13 | nobody loses |
| impurities swap in (embedded) | 1 | 1 | 1 | income too low, all stall |
| `SIG_R` 0.04 | 23 | 21 | 16 | income-bound: too easy |
| `G` 0.2 + pairs + anneal weakens | 4 (stall) | 4 | 4 | pairs stall |
| `POOL_LIFE` 300 (`thin`) | 6 | 4 | 4 | noSeed > skilled |
| `INHERIT` 0.7, `SPEED` 0.45 | 8 | 7 | 6 | strain cracks |
| `c(T)` squared, `G` 0.4 | 10 | 11 | 4 | timer = skilled |
| events `EV_OFF` 0.3, income ^0.5, `SEED_ION` 0.18, `POOL_LIFE` 200, `IMP_AGE` 160 | 7 | 8 | 4 | current (carats 545 / 457 / 254) |

## The original brief (2026-10-04)

### Geode: design brief for implementation

Status: idea, approved by the maintainer, not built. `id`: `geode`
(permanent feedback key). Planned 2026-10-04 in a design conversation; build
it in a fresh one. Verbs: **tap** + **drag** + **hold**, all tried pairs
(`node scripts/mechanic-map.mjs`), but the topic is new: **thermodynamics**
has one game (Hot Iron) and has never been played with `drag`.

Read first: `docs/PROJECT_BRIEF.md`, `docs/findings.md` (every rule applies;
the ones that bite hardest are listed under "Findings checklist"),
`docs/adding-a-game.md`, `docs/scores.md`, `docs/telemetry.md`,
`docs/games/tidewright.md` (closest shape: endless, season/round results,
own `score`, hint-on-first-event teaching), and
`scripts/balance-tidewright.mjs` as the base for `scripts/balance-geode.mjs`.
`games/tidewright.html` is the template for the report/unlock/pause/end-card
plumbing.

#### Pitch

You grow a crystal in a cooling pool. Every bond that forms rings a soft
note, and the notes are tuned to the lattice: a clean crystal sounds like a
calm chord, a strained one beats out of tune. Seed ions exactly where you
want them, steer the pool's temperature to anneal the strain out, and chip
off damaged corners before a crack runs to the core. Bank each crystal when
it is as big and as clear as you dare: keep growing and it is worth more,
but the pool ages and the flaws pile up. Score = carats banked over the
run, no ceiling.

The calm comes from the feel and the sound (no timers shouting, nothing
twitchy, every action has a soft musical answer). The stakes come from
**strain**, a value that spreads by itself and only the player's three verbs
can clear.

#### Why this satisfies the brief

- **3 orthogonal verbs, each a different gesture** (not variations of one):
  - **Seed** (`tap`, local): place an ion on a frontier site.
  - **Temperature** (`drag`, global): slide a thermostat; the pool follows
    with a lag.
  - **Cleave** (`hold`, local): hold on a damaged site to snap it off.
- **Shared state** (each verb reads a value another writes):
  - Per-site **strain** `s`. Growth (auto and seeded) writes it, spread
    writes it, temperature reads it (anneals or melts by it), cleave reads
    it (which site is worth the mass) and clears it, seeding reads it
    (new ions inherit neighbours' strain).
  - **Pool saturation** `σ`: auto growth and seeds spend it, temperature
    sets how fast auto growth spends it, so warming also *saves* σ for
    seeds.
  - **Temperature** `T` (actual, lagging the setpoint): written by the
    thermostat and by events (cold snap, heat wave), read by growth speed,
    anneal, dissolve.
- Single scene, primitives only (canvas 2D, WebAudio synthesis, no assets),
  one HTML file.

#### Layout (400×600, scaled to fill; no scrolling)

- Top strip: `Geode 3 · quota 60 · banked 142 ◆`, three small cracked-geode
  icons for chambers left (see "Run structure").
- Pool: a hex disc of radius `R = 8` in a triangular lattice (217 sites,
  cell pitch ~21 px), centered at y ~250. The 7-site **core** (centre + its
  6 neighbours) starts occupied. Pool background tints cool (blue) to warm
  (amber) with `T`.
- Thermostat: a horizontal strip under the pool (y ~475, ≥ 56 px tall for a
  thumb), `cold ◂ ▸ hot`, a bright thumb for the setpoint and a thin ring
  for the actual `T` chasing it. Labelled zones: *grow* (low), *anneal*
  (middle, a calm glow), *melt* (high, red edge).
- Bottom bar: **Harvest** button (disabled, dimmed, until mass ≥ quota),
  clarity meter, sound toggle. One status line for hints.
- Instructions stay out of the game file (manifest only), per the repo rule.
  Short contextual hints are fine (below).

#### Model (starting constants; tune with the bots, record in the notes file)

Simulation step `STEP = 0.1 s`. All `[0..1]` unless stated. Sites are axial
hex coords; "neighbours" = the 6 adjacent sites; `k` = occupied neighbours.

- **Temperature.** Setpoint `Ts` (the thumb, start 0.35). Actual `T` moves
  toward `Ts + eventOffset` with time constant `T_TAU = 2.5 s` (this lag is
  why the player must read the ring, not the thumb). Zones (guide numbers):
  grow `T < 0.4`, anneal `0.4–0.75` (peak ~0.6), melt `> MELT = 0.82`.
- **Growth speed** `c(T) = clamp(1 − T/0.8, 0, 1)`: cold is fast, 0 at
  `T ≥ 0.8`.
- **Frontier** = empty site with `k ≥ 1`. Auto growth: each frontier site
  attaches at rate `G · σ · c(T) · w(k)`, `w = {1: 0.25, 2: 1, 3+: 1.6}`
  (kinks fill first; lone tips are rare), `G = 0.5/s`. Each attach costs
  `ION = 0.012` σ.
- **Pool `σ`**: recharges `SIG_R = 0.05/s` toward a cap of
  `SIG_CAP · (1 − AGE · t)` (`AGE = 0.003/s`: the pool ages and thins, the
  push to harvest). Stalled-pool guard: never below `SIG_FLOOR = 0.15` of
  recharge, so a still screen is impossible (findings: a budget at zero
  freezes the round).
- **Seeding** (tap): snaps to the nearest frontier site within 1.4 cells;
  needs `σ ≥ ION`, else a soft "the pool is thin" hint and a dull tick.
  Attaches instantly, **no speed strain**. Seeds fill kinks cleanly and let
  the player pick the shape; auto growth is faster but sloppy when cold.
- **Strain on attach**: `s = F(k) + INHERIT · avg(s of occupied neighbours)
  + (auto ? SPEED · c(T) : 0)`, with `F = {1: 0.30, 2: 0.08, 3+: 0.0}`,
  `INHERIT = 0.5`, `SPEED = 0.30`. So: cold auto growth locks in strain,
  tips are weak, and building next to a flaw copies the flaw.
- **Spread** (the passive cost: findings, "passive systems must lose
  something each cycle"): every second each site gains
  `SPREAD · max(0, maxNeighbourStrain − s − MARGIN)`, `SPREAD = 0.35`,
  `MARGIN = 0.12`. A flaw leaks into its surroundings until it is cleaned.
- **Anneal**: `ds = −ANNEAL · a(T) · s` per second, `a(T)` a bump over the
  anneal zone (0 below 0.35, peak 1 at ~0.6, 0 above `MELT`), `ANNEAL =
  0.20`. Smooths but cannot clear a flaw faster than it spreads at the
  wrong temperature.
- **Melt**: above `MELT`, an occupied site with `k ≤ 3` dissolves at
  `MELT_R · (T − MELT) · (0.4 + s)` per s (tips and strained sites go
  first). A dissolved site returns half an ion to σ. Core sites never melt.
  This is the cost of over-annealing: you lose mass, and it is the
  thermostat's way of being a one-way trap if left hot.
- **Impurities**: every `IMP_T` s (`geode 1`: first at 25 s, then 14 s;
  `−1 s` per geode, floor 5 s) a foreign ion lands on a random frontier
  site: `s = 0.65`, flagged. Its strain **cannot anneal below
  `IMP_FLOOR = 0.45`** (it keeps leaking via SPREAD) and it only melts at
  `T ≥ 0.95`. Burying it in new growth does not clear it. Only **cleave**
  cleans it (findings: a cleanup verb is optional if the mess clears
  itself, so it must not).
- **Events** (from geode 2; two kinds at first, more later): *cold snap*
  (offset −0.2 for 12 s: growth boosts and strain spikes unless the player
  raises the thumb), *heat wave* (+0.2 for 12 s: melts the tips unless the
  player lowers it). Announced 3 s ahead by a hue shift and a soft rising
  tone; never twice in a row.
- **Cleave** (hold): press and hold ≥ `HOLD_MS = 450` on an occupied
  non-core site; a ring fills, then the site and every site no longer
  connected to the core (flood fill) drop off (mass lost: a tip costs 1, an
  embedded flaw leaves a vacancy). Neighbours' strain `−0.2`. A vacancy has
  `k = 5` so auto growth refills it **cleanly** (chip-and-heal is the
  satisfying loop). Cooldown `0.6 s`. Releasing early is a tap on an
  occupied site: ignored, with the hint "hold to cleave".
- **Fracture**: any site reaching `s ≥ 1` cracks: it is removed, its
  neighbours get `+0.25` shock, disconnected sites drop, and a jagged crack
  line is drawn. If the cracked site is in the **core**, the geode
  **shatters** (the only loss). Cracks near the rim cost mass; a strain
  front creeping toward the core is the real threat and is visible as a red
  tide.
- **Quota and harvest**: a geode's quota is `Q = 36 + 8·g` sites (cap 120).
  At `mass ≥ Q` the Harvest button lights. Banking: `carats = round(mass ·
  (0.5 + clarity))` where `clarity = 1 − min(1, mean(s)/0.5)`: between
  0.5× and 1.5× mass. Keep growing past the quota and each extra site is
  worth more, but σ thins (`AGE`), impurities keep coming, and an unbanked
  crystal that shatters is worth **0**. That is the dilemma.

#### Run structure (endless, 10+ minutes)

- A **run** is a chain of **geodes** (chambers). Harvesting is a `win` round
  and starts geode `g+1` with a fresh seed. Shattering is a `loss`; you have
  **3 chambers** (shatters) per run, then the run ends (end card: "New run").
  Within the run, a shattered geode is retried (a fresh one at the same `g`,
  `attempt` 2+).
- Escalation per geode: quota up, impurity interval down, a new event type
  at geode 3 (*salt flush*: σ halves for 10 s) and geode 5 (*double snap*:
  cold snap then heat wave back to back), pool ages faster.
- Target round length 2-3 min; run length for a skilled player 10+ min and
  finite (their median run past 10 min but not forever; findings and
  `ROADMAP.md`, depth pass).
- Geode 1 is gentle and teaches by contact. Hints appear **on the first
  occurrence**, in the status line, once each: first tap-eligible frontier
  ("tap beside the crystal to seed an ion"), first strain over 0.3 ("drag
  the thermostat to the glow to anneal"), first impurity ("hold on the dark
  ion to cleave it"). No impurity before 25 s, and the first has a ring
  marker.

#### Score, telemetry, achievements

- Manifest `score`: `{ "label": "Carats banked", "better": "higher",
  "format": "count", "from": "score", "wins": false, "max": 20000,
  "epoch": 1 }`. The game posts its own cumulative `score` (carats banked
  this run) in every `arcade:result`, so a lost last geode still shows the
  run's total (same as Tidewright's `waves`). Round to 0.1.
- `arcade:result` at each harvest (`win`) and shatter (`loss`): `time`,
  `level` = geode number, `run`, `attempt`, `score`, `reason` on loss
  (`shatter`, or `thin` if you ever add a pool-exhausted loss), `stats`:
  `mass`, `clarity` (percent), `carats`, `cleaves`, `seeds`, `cracks`,
  `peak_s` (peak max strain ×100), `anneal_s` (seconds in the anneal zone).
- Achievements (≥ 3, reward interplay, not grinding):
  1. **First Light**: harvest geode 1.
  2. **Perfect Pitch**: harvest with clarity ≥ 90%.
  3. **Chip and Heal**: cleave an embedded flaw and have the vacancy
     refilled by growth (seed + cleave + auto).
  4. **Cool Head**: ride out a cold snap with the crystal's mean strain
     staying below 0.25 (temperature reading strain).
  5. **Window Seat**: harvest a geode with mass ≥ 1.5 × quota.
  6. **Deep Time**: reach geode 6.
  Ids are permanent; pick final ones in the build session.

#### Manifest text (draft; use the tap/finger placeholders)

- blurb: "Grow a crystal that rings like a bell: seed, warm and chip away
  the flaws before they crack it."
- goal: "Grow each crystal to its quota and harvest it, as big and as clear
  as you dare. Flaws spread by themselves; a crack that reaches the core
  shatters it and you lose what was unbanked. Three shatters end the run."
- howToPlay: "{Tap} beside the crystal to place an ion. Drag the thermostat:
  cold grows fast but strains the crystal, the middle glow heals strain
  without growing much, and too hot melts your corners. {Hold} on a
  damaged or dark ion to snap it off. Listen: a clear crystal sounds like a
  chord, strain sounds out of tune."
- keyboard: "← → set the temperature · H harvest · M sound".
- topics: `["thermodynamics", "planning"]`. mechanics: seed (tap), warm
  (drag), cleave (hold). sharedState: per-site strain, pool saturation,
  temperature.

#### Look and sound (primitives only)

- **Look.** Hex gems drawn as filled polygons with a lighter facet and a
  soft additive glow (`globalCompositeOperation = 'lighter'`). Colour by
  strain: clean = cool white-cyan, mid = amber, near-crack = red with a
  slight jitter. Strain must also show **without colour** (jitter amplitude,
  outline thickness, a hatch line) so colour-blind players and a muted phone
  both work. Pool ions are slow drifting motes that curve toward the frontier
  sites most likely to grow; their density shows `σ`. Cracks are dark
  jagged lines that fade slowly. The core breathes gently. A heat shimmer
  when `T` is high. Honour `prefers-reduced-motion` (no shimmer or jitter,
  keep colour).
- **Sound** (WebAudio, started on the first gesture, suspended on
  `arcade:pause`, a visible mute toggle persisted in `localStorage` with
  try/catch). Each attach plays a soft bell (sine + quiet octave partial,
  ~1.2 s decay) from a **pentatonic** set mapped by site: `pitch =
  scale[(q − r) mod 3 + 3·ringBand]`, so growth plays a lattice-shaped
  melody that is always consonant when clean. Detune in cents = `strain ·
  60`, so strained bonds beat. A slow two-oscillator pad beats at a rate
  proportional to mean strain (tension you can hear). Filtered noise hiss
  scales with `T`. Cleave = soft tick + falling glass tone; fracture = low
  thud + short noise burst; harvest = rising arpeggio; shatter = a falling
  cluster. Cap polyphony (8 voices), rate-limit to ~12 notes/s, master gain
  ≤ 0.25. The game must be fully playable muted.
- Gallery card art in `assets/thumbs.js` (a tiny hex crystal with one red
  cell) and `node scripts/make-og-images.mjs geode`.

#### Input

- Pointer events only. Tap = seed (snap to nearest frontier site; no need
  to hit exactly). Hold ≥ `HOLD_MS` (move < `HOLD_SLOP` 10 px) on an
  occupied site = cleave. Dragging on the thermostat strip sets `Ts`.
  Because `Ts` is a setpoint with lag, nothing needs two fingers at once;
  one thumb can alternate.
- Touch targets ≥ 44 px (the strip and button); site hit radius generous
  (snap).
- Keyboard (PC): ← → move the thumb, H harvest, M mute; mouse for seed and
  cleave.
- Handle `arcade:pause` / `arcade:resume` (also suspend audio). Ignore input
  for ~1 s after an end card (`END_LOCK_MS`).

#### Findings checklist (run these in the bots, not just in your head)

1. *Passive systems that create more than they cost play themselves.* Idle
   bot (never touches anything, harvests at quota): must shatter or bank
   little by geode 3. Check auto growth + spread alone.
2. *A verb only shares state if succeeding needs to read it.* Run a bot that
   sees only what a player sees, and a **timer** bot that moves the
   thermostat on a fixed schedule and never reads strain. It must do worse
   than the reader.
3. *A global verb against local states makes the order matter.* Temperature
   helps strained sites and costs growth/tips at the same time; check there
   is a real moment where annealing now hurts something.
4. *A cleanup verb is optional if the mess clears itself.* Run a
   never-cleave bot; `IMP_FLOOR` must make it lose by geode 3-4. Also test
   an anneal-hard bot (parks at 0.6) and a melt-all bot (parks hot): the
   second must pay mass.
5. *A floor/gift on a shared budget rescues the habit that wastes it.*
   `SIG_FLOOR` and the early gentle geode must not let a seed-spam bot win.
6. *A budget that can hit zero with no income freezes the round.* σ
   recharge must always be > 0; verify no still-screen state with a probe
   (no event, no growth, no spread for 20 s).
7. *A strength verb is only read if full strength can't win.* The
   thermostat's extremes (full cold, full anneal) must both lose; check a
   bot parked at each end of the strip.
8. *A decay rate turns a puzzle into a speed test.* Spread and impurity
   cadence must leave room: a skilled bot with 1.5 s think time should lose
   at most ~1 geode vs a 0.4 s bot. (Sweep `think`, `lag` like Tidewright.)
9. *One round shows everything.* Escalation (events, quota) must produce
   new situations after geode 2, not only bigger numbers.

#### Balance harness and targets

Copy `scripts/balance-tidewright.mjs`; adapt `buildDebug()` (state on
`window`, seeded `Math.random`, no animation loop; call `step()`
directly) and the bots. One line per bot, never per-run logs. Bots act on
what the player sees, `think` s apart, with `lag` s between decision and
action.

| Bot | Rule | Expected |
|---|---|---|
| idle | does nothing, harvests at quota | shatters by geode 2-3 |
| spam | seeds as fast as σ allows, never touches thermostat or cleave | loses by geode 3-4 |
| cold | thermostat at 0, auto growth only, harvests at quota | low clarity, loses by geode 4 |
| anneal-park | thermostat parked at ~0.6 | stalls, thin pool, small crystals; loses |
| timer | thermostat cycles on a schedule, never reads strain | worse than skilled |
| noCleave | skilled except never cleaves | loses by geode 3-4 (impurities) |
| novice | seeds mostly kinks, ignores strain until red, thermostat nudges, 2-3 wrong holds, slow lag | reaches geode 3-5, first harvest ≥ 80% on geode 1 |
| skilled | reads strain: seeds kinks, thermostat toward anneal when max strain > 0.35 and back to grow, cleaves flaws by priority, banks near quota + margin | median run 10-14 min, geode 6-9 |

Targets: novice harvests geode 1 and reaches geode 3 in most runs; no
one-rule bot passes geode 4; skilled median run between 10 and 20 minutes;
the 10th percentile skilled run still > 6 min (not a coin flip). Report
median minutes, geode reached p10/p50/p90, loss reasons. Find the knob that
moves `skilled` vs `noCleave` and `timer` apart before polishing.

#### Build plan (suggested order for the implementing session)

1. **Sim first, no art.** `step()` + state in a minimal HTML with `§` section
   markers; seeded `Math.random`. Get `scripts/balance-geode.mjs` running
   with idle/spam/skilled before drawing anything.
2. **Tune** until the target table holds; record the constants and the
   table in `docs/games/geode.md` (< 8 KB).
3. **Input and layout** (scale to fill, no scroll, the thermostat strip,
   Harvest button, pause handling, end card with input lock).
4. **Look and sound** (strain visible without colour; audio last, muted by
   default until the first gesture, mute persisted).
5. **Teaching hints** on first occurrence; play geode 1 as a novice would,
   with the real UI, in a headless screenshot at 360×640 and 800×600.
6. **Manifest entry** (`games/games.json`: id `geode`, `version` 1, `added`
   today, `score`, `achievements`, `topics`, `keyboard`, `changes`), card
   art, og image.
7. `node scripts/validate.mjs`, then `node scripts/smoke-gallery.mjs` once at
   the end.
8. Notes file `docs/games/geode.md`; add the row to `docs/ROADMAP.md`;
   move this brief to `docs/history/geode.md` as a stub pointer; update
   `docs/ideas/README.md` (status: built v1).
9. Open the PR (template checklist), publish the game file as a private
   playtest Artifact, link it in the PR body and the notes file.

#### Risks and open decisions

- **Plays-itself risk is highest here** (calm genre). The idle and spam
  bots are the gate; if they bank, raise `SPREAD` or `IMP_FLOOR`, not
  difficulty by speed.
- **Heat as a free fix.** If the middle of the thermostat clears everything,
  temperature makes seeding and cleaving optional. The cost must be real:
  annealing barely grows (σ and quota pressure from `AGE`), it can't touch
  impurities, and the melt edge is close.
- **Cleave could be spammed.** The hold time, cooldown and mass loss keep
  it a decision; check a cleave-spam bot.
- **Audio is a feature, not a requirement.** Test muted. Browsers block
  audio until a gesture and iframes may restrict it; never throw.
- **Hex hit-testing on a phone.** Snap to the nearest legal site; test a tap
  that lands between two frontier sites.
- **Performance.** 217 sites and a spread pass at 10 Hz is trivial; keep
  the draw loop cheap (no per-frame allocation, one offscreen glow pass).
- **Open (decide while building, note in the notes file):** whether tilt
  could drive temperature as an optional input (rejected for v1: Terrace
  Garden owns tilt and a slider is precise on every device); whether Harvest
  should also need a short hold to avoid accidents (probably: 0.6 s hold on
  the button); whether `reason: 'thin'` (pool exhausted) is worth a second
  loss path (rejected for v1: one loss keeps the stakes legible).

Rejected variants: **Succession** (garden: most overlap with Terrace and
Orbit Garden, highest plays-itself risk) and **Rockpool** (tide pool: a
fourth water game next to Tidewright, Terrace Garden and Aqueduct, and a
weak third verb).
