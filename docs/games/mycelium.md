# Mycelium: design notes

**v2** (2026-10-03) · playtest: https://claude.ai/artifact/JtevwSxyXLnDnbA9AeVd6e ·
balance: `node scripts/balance-mycelium.mjs 100`
Verbs: **grow** (drag), **pulse** (tap), **prune** (hold), sharing **one
nutrient pool** and **sap per knot**. A run of seasons: 8 campaign seasons,
then endless; network and pool carry over. Score = mushrooms over the run.

## How it works

- **Soil:** a jittered hex lattice of knot sites (181), spore at the centre.
  The network is a tree rooted at the spore.
- **Grow:** drag from a connected knot; on release the thread routes through
  open soil (BFS) to the nearest site and grows `GROW_V` knots/s, paying
  `GROW_C` per knot as it goes (stalls, red dashes, while the pool is short).
  Growing into a stranded knot reconnects its branch. The preview shows the
  cost (red if above the pool). Up to 3 threads grow at once.
- **Pulse:** tap a knot: `PULSE` (or what's left) leaves the pool and runs
  out from the spore, refilling each knot's missing sap on the way (`SAPN`
  per full knot); what reaches a patch knot adds to its mushroom (`FRUIT`
  each), anything ending elsewhere is spilled.
- **Prune:** hold a knot `HOLD_MS`: cuts the thread into it. Stranded knots
  cost no upkeep, wither in ~12 s *without rot*. A pulse passes rotting
  knots without refilling them (v2): only a cut stops rot. Holding a rival knot cuts
  it and everything it grew beyond; the rival rests `RIVAL_WAIT` s.
- **Sap:** knots within `K` threads of the spore or a connected patch with
  food refill; others lose `DECAY`/s. A knot that starves **while attached**
  rots the knot it grew from (rot: −`ROT`/s whatever the feeding), which
  rots its parent when it dies, up to the spore.
- **Pool:** connected patches pay `INCOME`/s until empty, the spore
  `SPORE_INC`/s; every connected knot costs `UPKEEP`/s × the season's `up`
  (×`DRY_U` in dry soil; endless season n: `UP_END` × 1.08ⁿ). The season
  intro names the multiplier. Short of upkeep: no refill, and the
  farthest tip withers (harmlessly) every `HUNGER_T` s. HUD shows −x/s.
- **Season:** win = goal mushrooms by the frost (`T`). Once every patch is
  used up the frost comes `FROST_LEFT` s later. Lost: retry from the season's
  start (+`RETRY_GIFT` per retry) or a new run. Next season: +`SPRING`, new
  patches; **winter** keeps only knots within `K` of the spore.

| # | Season | T s | Goal | Patches (food × FOOD, threads from spore) | Upkeep | Twist |
|---|---|---|---|---|---|---|
| 1 | First spores | 60 | 2 | 2 × 50, 3–4 | ×1 | |
| 2 | Leaf litter | 70 | 3 | 4 × 45, 3–6 | ×1 | |
| 3 | Old log | 75 | 3 | 1 × 60, 3–4; log 170 at 6–8, 3/s | ×1 | far patch |
| 4 | Dry spell | 75 | 3 | 5 × 60, 3–6 | ×1 | 1 dry zone on the network |
| 5 | Rival mould | 80 | 4 | 5 × 60, 3–6 | ×1.3 | 1 rival, first knot after ~11 s (v1 ~5 s) |
| 6 | Stony ground | 80 | 5 | 4 × 55, 3–8 + 2 × 50 at 25/45 s | ×1.7 | 25 stones, late patches |
| 7 | Two moulds | 80 | 5 | 6 × 55, 4–8 | ×1.7 | 2 rivals |
| 8 | First frost | 80 | 6 | 6 × 75, 5–9 | ×1.7 | dry, rival, 15 stones |
| 9+ | Endless n | 80 | 6+n | 6 × 55 × 0.93ⁿ, 4–9 | ×1.7 × 1.08ⁿ | 2 random of dry (2 zones) / rival (2 from n=4) / 25 stones / late |

A late patch whose site a thread took before it fell lands on the nearest
open site instead (v2). Pool cap `POOL_MAX` in every season; the score in
`arcade:result` is the run total.

## Key constants (`games/mycelium.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| K / DECAY / REFILL | 3 / 1/12 / 0.6 | ROT / HUNGER_T | 0.4 / 1.5 s |
| UPKEEP / DRY_U | 0.12 / 4 | GROW_C / GROW_V | 3 / 2.5 |
| PULSE / FRUIT / SAPN | 20 / 30 / 2 | POOL0 / POOL_MAX | 40 / 150 |
| FOOD / INCOME / SPORE_INC | 1.4 / 2 / 1.0 | SPRING / RETRY_GIFT | 25 / 15 |
| RIVAL_T / RIVAL_EAT / RIVAL_WAIT | 1.4 s / 4 / 5 s | FROST_LEFT | 8 s |
| UP_END / ENDLESS_UP / ENDLESS_FOOD | 1.7 / 0.08 / 0.93 | HOLD_MS / DRAG_PX / HIT_R | 450 / 12 / 22 |

## Layout (400×540)

Lattice spacing 36 × 31, 17 rows of 11/10 sites, jitter ±4. Message strip
above the soil (never over it), HUD below: season, mushrooms/goal, pool
(meter, value, upkeep), frost meter, score (best from `arcade:best`).
Patches never sit next to each other or within 2 sites of the network.
Rivals start at an edge site near a corner (top-left, then bottom-right).

## Balance (v2, 100 runs, retries 2; ±5 pts)

| Bot | Seasons 1–8 won % | Median seasons | Run (1st loss) | Score | Per season |
|---|---|---|---|---|---|
| idle | 0 | 0 | 3.0 min | 0 | |
| greedy | 34/0/… | 0 | 3.0 min | 1 | 15 starved, 12 rotted |
| timer | 100/72/50/39/39/17/12/4 | 3 | 9.3 (1.9) min | 14 | 45 pulses, 49 spilled |
| skilled | 100 × 5/98/98/88 | 8 | 12.9 (9.2) min | 68 | 13 pulses, 0 spilled, 5 cuts |
| noprune | 100 × 5/52/51/30 | 7 | 10.4 (6.0) min | 43 (63%) | 5 starved, 3 rotted |
| novice | 100/82/69/62/56/6/0/0 | 5 | 12.1 (2.2) min | 19 | 20 spilled, 4 cuts |
| novice, 4 retries | 100/96/95/94/93/26/4/0 | 5 | 18.8 min | 23 | |

- Cutting now pays: never-cut scores 63% of skilled (v1 82%); it loses
  at season 6 (stones: long detours, dead branches at ×1.7 upkeep).
- Action rate: skilled at 0.5 / 1 / 2 s per action scores 68 / 68 / 68
  and wins season 8 88 / 86 / 88%.
- Achievements (skilled / novice): first-flush 100/100, long-reach 84/78,
  clean-cut 33/48, lean-season 100/35, fairy-ring 24/0, old-growth 88/0.
  Lean-season counts starved knots; rot only starts when an attached knot
  starves, so it is already counted.
- `scripts/balance-mycelium.mjs` starts with a self-test: a retry restores
  seasons 5–8 and 11 exactly (rivals, rot, dry soil, late patches, pool +
  gift, no jobs or fx left), and growing into a stranded branch with a side
  branch reverses it into one tree.
- Tried and dropped (v2): faster rot, hungrier or faster rivals (no
  effect: bots reach food first); 2–4× upkeep on knots out of feeding range
  (the hunger wither cuts dead tips for free; findings); a 45–60 pool floor
  each spring (rescued the timer bot to 68% of skilled; findings).

## Telemetry

One `arcade:result` per season: `level` (season), `run`, `attempt`,
`score` (mushrooms over the run), `reason` on a loss (`frost`, or `hunger`
if the pool ran dry 10+ s), and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `fruit` / `goal` | mushrooms this season / goal | `pulses` / `spilled` | pulses, nutrient spilled |
| `grown` | knots grown | `pruned` | cuts of own threads |
| `starved` / `rotted` | knots starved attached / rot started | `withered` | tips eaten by an empty pool |
| `hungry_s` | s with an empty pool | `pool` | pool at the end |
| `knots` | knots at the end | `rival_cut` | rival cuts |
| `first_input` | s to the first action (-1 none) | | |

`spilled / pulses` vs the timer bot (≈1.3 per pulse) shows whether players
read the pool; `rotted` vs `pruned` shows whether they learned the cut.

## Player data

None yet.

## Open ideas / known limits

- The novice's wall moved from seasons 4–5 to season 6 (56% → 6%; 26%
  with 4 retries), where the ×1.7 upkeep and stones hit. If players stall
  there, try ×1.5 in season 6 (noprune rises to ~70%) or nearer late
  patches. Watch `attempt` per level in telemetry.
- Rivals barely matter to bots (they reach the food first). A rival that
  can eat into a thread would make the rival cut a real decision.
- Not hand-played on a phone yet; screenshots at 390×760, 800×400,
  1200×800 with a 3-line hint are clean.
- Ideas: spores that fly to start a second hub; a mushroom that releases
  spores to the next season; patches that regrow where mushrooms stood.

History (brief, departures from it): `docs/history/mycelium.md`
