# Mycelium: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/mycelium.md`. Add new entries at the top of the relevant
section; sessions don't read this file by default.

## History

- v1 (2026-10-03): first version, from the brief below.

## v1: departures from the brief and why

- **Prune is a hold on a knot, not a tap on a thread.** Tap a knot (pulse)
  and tap a thread (prune) are too close on a phone; every verb now starts
  on a knot (drag = grow, tap = pulse, hold = cut), as the brief's own risk
  note asked ("nodes, not freehand pixels").
- **Upkeep doesn't make a speed test.** Every verb is paid from the pool,
  so tapping faster buys nothing (findings: "A decay rate turns a puzzle into
  a speed test"). The one real-time opponent, rival mould, was a speed test
  at first (skilled bot at 1 action / 2 s won season 8 13% vs 100%); a 5 s
  rest after a cut fixed it.
- **Pruning is made a decision by rot, not by a fee.** The brief suggested
  charging pool for a cut. Bots showed the real problem: a dead branch
  starved and vanished by itself, so a never-cut bot matched skilled (score
  50 vs 55). Now a knot that starves *while attached* rots the knot it grew
  from, and rot climbs to the spore, stranding every branch past it. A cut
  branch withers harmlessly. Cutting is free; what it costs is the branch.
- **Fruit grows where a pulse ends on a patch**, not when a patch is "fed
  enough" passively: that makes the pulse the scoring verb and gives it two
  jobs (rescue a fading branch vs fruit), which is what the pool must be read
  for.
- **Deadlocks removed** (findings: "A still screen that's still winnable
  reads as broken"): an empty pool with a stalled thread froze novices for
  a whole season. The spore trickles 1/s, an empty pool eats the farthest tip
  every 1.5 s instead of starving everything, each season after the first
  adds 25, each retry adds 15 more, and the season ends 8 s after the last
  patch is used up.
- **Winter:** only knots within 3 of the spore carry over; old branches die
  back harmlessly (carrying them rotted every novice at the start of
  season 2, before rot had been explained).
- **Seasons are a campaign of 8, then endless** (goal +1 per season, upkeep
  +8%, food −7%), as the brief proposed.

## The original brief (2026-10-03, `docs/ideas/mycelium.md`)

Category: simulation, spatial growth under a budget. Rank: **first** of the
2026-10-03 batch (build before `lighthouse-keeper.md`). Status: proposed.

- **Premise:** a fungal network under forest soil. Nutrients are scattered
  in the ground; the player grows a network to reach them and fruit.
- **Verbs (3):** *grow* a thread (drag from any tip), *prune* a thread
  (tap it), *pulse* (tap a node: sends a nutrient surge along existing
  threads only).
- **Shared state:** one nutrient pool. Every thread draws upkeep from it
  each tick (the passive cost; see findings, "Passive systems that create
  more than they cost play themselves"). Growing spends it. Pulses move
  nutrient to where it is needed but only along threads that exist.
  Pruning stops a thread's upkeep and reroutes flow, but strands the tips
  beyond the cut (they starve unless reconnected).
- **Why it needs all three:** growing alone over-extends and starves;
  pruning alone cannot reach new food; pulses are wasted unless the player
  reads the pool level and where the starving tips are (check with a bot
  that pulses on a timer; findings: "A verb only shares state if
  succeeding needs to read it").
- **Win/progress:** nutrient patches fruit when fed enough; each fruiting
  body scores. Rounds are "seasons": soil layout and rival organisms
  (competing hyphae, drought patches) change per season, carry-over of
  pool surplus between seasons.
- **Endless mode:** after the campaign, seasons keep coming with rising
  upkeep and rarer food. Score = fruiting bodies over the run (no ceiling).
  Target 10+ minutes (docs/ROADMAP.md, depth pass).
- **Risks:** make pruning a real decision, not free cleanup (cost it a
  little pool, or make regrowth slow); keep touch targets large on phones
  (nodes, not freehand pixels); avoid a tap-speed test.
- **Bots to write first:** greedy-grow (should starve), timer-pulse (should
  do worse than reading), novice, skilled. Copy the closest
  `scripts/balance-*.mjs` (ant-trails or terrace-garden).
