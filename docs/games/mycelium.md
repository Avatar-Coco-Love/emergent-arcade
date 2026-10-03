# Mycelium: design notes

**v1** (2026-10-03) · playtest: https://claude.ai/artifact/JtevwSxyXLnDnbA9AeVd6e ·
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
  cost no upkeep, wither in ~12 s *without rot*. Holding a rival knot cuts
  it and everything it grew beyond; the rival rests `RIVAL_WAIT` s.
- **Sap:** knots within `K` threads of the spore or a connected patch with
  food refill; others lose `DECAY`/s. A knot that starves **while attached**
  rots the knot it grew from (rot: −`ROT`/s whatever the feeding), which
  rots its parent when it dies, up to the spore.
- **Pool:** connected patches pay `INCOME`/s until empty, the spore
  `SPORE_INC`/s; every connected knot costs `UPKEEP`/s (×`DRY_U` in dry
  soil, ×1.08ⁿ in endless season n). Short of upkeep: no refill, and the
  farthest tip withers (harmlessly) every `HUNGER_T` s. HUD shows −x/s.
- **Season:** win = goal mushrooms by the frost (`T`). Once every patch is
  used up the frost comes `FROST_LEFT` s later. Lost: retry from the season's
  start (+`RETRY_GIFT` per retry) or a new run. Next season: +`SPRING`, new
  patches; **winter** keeps only knots within `K` of the spore.

| # | Season | T s | Goal | Patches (food × FOOD, threads from spore) | Twist |
|---|---|---|---|---|---|
| 1 | First spores | 60 | 2 | 2 × 50, 3–4 | |
| 2 | Leaf litter | 70 | 3 | 4 × 45, 3–6 | |
| 3 | Old log | 75 | 3 | 1 × 60, 3–4; log 170 at 6–8, 3/s | far patch |
| 4 | Dry spell | 75 | 4 | 5 × 60, 4–7 | 1 dry zone on the network |
| 5 | Rival mould | 80 | 4 | 5 × 60, 4–7 | 1 rival |
| 6 | Stony ground | 80 | 5 | 4 × 55, 4–8 + 2 × 50 at 25/45 s | 25 stones, late patches |
| 7 | Two moulds | 80 | 5 | 6 × 55, 4–8 | 2 rivals |
| 8 | First frost | 80 | 6 | 6 × 55, 5–9 | dry, rival, 15 stones |
| 9+ | Endless n | 80 | 6+n | 6 × 55 × 0.93ⁿ, 4–9 | 2 random of dry/rival/stones/late |

## Key constants (`games/mycelium.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| K / DECAY / REFILL | 3 / 1/12 / 0.6 | ROT / HUNGER_T | 0.4 / 1.5 s |
| UPKEEP / DRY_U | 0.12 / 4 | GROW_C / GROW_V | 3 / 2.5 |
| PULSE / FRUIT / SAPN | 20 / 30 / 2 | POOL0 / POOL_MAX | 40 / 150 |
| FOOD / INCOME / SPORE_INC | 1.4 / 2 / 1.0 | SPRING / RETRY_GIFT | 25 / 15 |
| RIVAL_T / RIVAL_EAT / RIVAL_WAIT | 1.4 s / 4 / 5 s | FROST_LEFT | 8 s |
| ENDLESS_UP / ENDLESS_FOOD | 0.08 / 0.93 | HOLD_MS / DRAG_PX / HIT_R | 450 / 12 / 22 |

## Layout (400×540)

Lattice spacing 36 × 31, 17 rows of 11/10 sites, jitter ±4. Message strip
above the soil (never over it), HUD below: season, mushrooms/goal, pool
(meter, value, upkeep), frost meter, score (best from `arcade:best`).
Patches never sit next to each other or within 2 sites of the network.
Rivals start at an edge site near a corner (top-left, then bottom-right).

## Balance (v1, 100 runs, retries 2; ±5 pts)

| Bot | Seasons 1–8 won % | Median seasons | Run (1st loss) | Score | Per season |
|---|---|---|---|---|---|
| idle | 0 | 0 | 3.0 min | 0 | |
| greedy | 34/0/… | 0 | 3.0 min | 1 | 15 starved, 12 rotted, 1 pulse |
| timer | 100/72/50/24/24/20/20/7 | 3 | 9.3 (1.9) min | 14 | 44 pulses, 58 spilled |
| skilled | 100 × 8 | 10 | 13.9 (10.6) min | 88 | 15 pulses, 0 spilled, 5 cuts |
| noprune | 100 × 8 | 9 | 13.3 (9.1) min | 72 | 6 starved, 4 rotted |
| novice | 100/81/67/35/25/12/2/0 | 3 | 9.6 (2.2) min | 12 | 20 spilled, 3 cuts |
| novice, 4 retries | 100/96/96/71/67/51/25/8 | 6 | 20.6 min | 26 | season 8 reached by 26.7 min |

- Greedy (grow whenever affordable, explore when no patch, never cut or
  rescue) starves; timer pulses (every 1.5 s, round robin) spill ~4× what
  they fruit; skilled endless median ends at season 10–11 (~14 min).
- Action rate: skilled at 0.5 / 1 / 2 s per action scores 88 / 85 /
  88 and wins season 8 100 / 100 / 98%: no speed test.
- Achievements (skilled / novice): first-flush 100/100, long-reach 91/76,
  clean-cut 49/33, lean-season 100/15, fairy-ring 33/0, old-growth 100/0.

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

- Pruning is a margin verb: the never-cut bot scores 82% of skilled. If
  players rarely cut, raise `UPKEEP` (0.16 gives 72%, but the novice drops a
  season).
- Novice bot walls at seasons 4–5 (dry soil, rival) with 2 retries; the
  retry gift carries it further. Watch `attempt` per level in telemetry.
- Not hand-played on a phone yet; screenshots at 390×760, 800×400, 1200×800.
- Ideas: spores that fly to start a second hub; a mushroom that releases
  spores to the next season; patches that regrow where mushrooms stood.

History (brief, departures from it): `docs/history/mycelium.md`
