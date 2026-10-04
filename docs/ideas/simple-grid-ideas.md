# Simple, easy-to-iterate games (2026-10-04 discussion)

Why: big continuous games (physics, real-time decay, hold verbs) cost the
most tuning; most findings on speed tests, reaction time and noisy input
come from them. Files grew to 50–90K.

## What to optimize for

1. **Turn-based, small grid**: one tap = one move, nothing happens between
   moves. No speed-test or reaction-time findings apply; pause is free.
2. **Levels as ASCII strings**: expanding means adding rows, not code. An
   endless mode is a generator that emits the same strings.
3. **Exact solver as the balance harness**: BFS gives par moves, "does the
   habit bot win?", "is verb B required?" as exact answers.
4. **One new tile/rule per revision** plus ~5 levels that break the old
   habit (findings: "A general trick beats a set of levels").
5. **Size budget ~25K per file.**

Possible shared starter: `games/_template-grid.html` + a generic grid
solver; each game copies it (games stay self-contained).

## Ideas

- **Surprise Party** (contagion): whisper + door, news spreads as a wave.
  Picked; full brief in `surprise-party.md`.
- **Sheepdog** (collective behaviour): *step* (sheep within 2 cells flee 1
  cell, sidestep at walls) + *bark* (sheep within 4 slide until blocked and
  panic 3 turns; panicked sheep run 2 cells and won't enter the pen).
  Bramble (sheep enter, dog can't) makes bark required; the gate rule makes
  step required. Later tiles: ram (only moves on bark), ewe + lamb chain,
  stream, wolf on a loop. Endless trial with carried-over turn budget.
- **Kiln** (thermodynamics): *coal* (+2 cell, +1 neighbours) + *vent*
  (halve a cell, round down); fire each pot to its exact number, over =
  crack. Halving makes order matter (findings: "Additive amounts make the
  order free"). Cheapest to build; risk: dry.
- **River Crossing** (planning): *load* (boat holds 2) + *row*; generated
  eat-rules per animal. Tiny state; risk: the classic is well known.
- **Shade Garden** (ecology): *plant* (tree grows 1 size/turn, longer
  shadow) + *fell*; crops need light bands, the sun angle sweeps. Calm and
  systemic; hardest to keep readable on a phone.
