# Mycelium (idea, not built)

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
