# Ripple Tank: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/ripple-tank.md`. Add new entries at the top; sessions don't read
this file by default.

## Pre-build: free water vs lily pads (2026-11-27)

The brief placed dippers anywhere in the water (a 20×20 lattice) with one
source on round 1. Two bot runs changed that before v1:

- One dipper alone has no interference: retiming it changes nothing, and a
  calm spot needs a second ripple. Round 1 got a second dipper already in
  the water; every pond has 2-3.
- Free water (400 spots, greedy best-move bots, 100 runs): `skilled` 17
  ponds, `noTune` (never retimes) also 17. A fine position verb stands in
  for the timing verb: moving a dipper a step shifts its phase at every
  light. Restricting dippers to ~10 lily pads per pond: `noTune` fails pond 2
  and every pond after, `tuneOnly` fails pond 4. Pads also gave an exact
  solver (par is the optimum, not an upper bound) and a pad picker for keys.
- A perfect solver never loses when every pond grants par plus spare, so
  the `skilled` bot is a two-ply lookahead (the best move whose best
  follow-up leaves least to fix); one-ply `greedy` stalls from pond 4.
