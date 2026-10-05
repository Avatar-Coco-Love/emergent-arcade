# Island Census: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/island-census.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## History

- v3 (2026-10-05): accessibility (keys, live region, lightness bands,
  `fs()` text); see the notes file. What v2 drew, for comparison: sand
  `#c9b27a`, turf `#5f7a45`, paths `#a88b5a`, meadows `rgb(122,98,58)` →
  `rgb(78,150,66)` (Lab L 43 → 56, flat: grazed meadows, turf and paths
  all one olive for deuteranopes), meter band `rgba(124,197,106,0.45)`,
  Next season ready = green border, HUD 78 tall with 11 px text (9.4 CSS
  px at 360 px wide), counts 12 px on a 0.65 backing, `#msg` at 15% with a
  text shadow only (it sat over the meters). Audit v2: text fail, keyboard
  fail, colour partial (sand ≈ green accent, deutan).
- Open idea dropped from the notes in v3: a third verb if the round feels
  thin (none planned; the brief allows 3, the refuge tension may be enough).
- v2 (2026-10-05): canvas label only.
- v1: first version.

## Tuning path and ecology findings (v1 build)

- Tuning path: first draft (BREED 1.6, HUNT 6) had rabbits ×3.5 in one
  spring; every bot lost in 3 seasons. HUNT 12–14 made foxes eat the island
  by autumn (idle 0–5%, reader 6–8%, fences can't hold). HUNT 9 on the wider
  island: idle 13 / reader 92 / novice 45%. The tighter layout has more paths
  per meadow, so foxes spread faster; HUNT 8.5 brought it back.
- **More rabbits make it harder.** START_R 75 (vs 60, wider draft island,
  HUNT 9): idle 13 → 8%, reader 92 → 81%, novice 45 → 30%. Extra rabbits feed a bigger fox boom, which then eats more
  than the extra (the "paradox of enrichment" from ecology). Releasing
  rabbits at the wrong moment works the same way.

## Design rationale (v1)

Built against `docs/findings.md`:

- **Passive systems must lose something.** Rabbits die of age (`RDIE`) and
  starve without grass; foxes die every season (`FDIE`) and only replace
  themselves by eating. Nothing passive creates animals from nothing.
- **A verb only shares state if success needs to read it.** Release reads
  where foxes and grass are (rabbits dropped next to foxes feed them; on
  bare grass they starve). Fences read the fox arrows (which meadow the
  foxes head for next) and fox numbers (a sealed refuge starves foxes).
  One-verb bots win about half as often as the two-verb reader (below).
- **A decay rate turns a puzzle into a speed test.** No clock: the
  simulation only runs when the player presses Next season, so think time
  is free. `time` in telemetry is still unpaused seconds, for comparison.
- **One round shows everything.** Every round is a new island (meadow
  positions, sizes, paths, fox den) and one of 4 second-year events,
  announced a season ahead.
- **Bots model skilled play, not the first minute.** A `novice` bot
  (random moves, never takes a fence down) is in the harness from v1.


## Notes before the split (2026-09-30)

Original header text:

# Island Census: design notes

Current: **v1** (playtest: https://claude.ai/artifact/Tk9dtgZU1XGUsaB1vwFuGW). Mechanics: **release** (tap) and
**fence** (drag), sharing **rabbits, foxes and grass per meadow** on a
7-meadow island. Turn-based: 2 moves per season, then Next season plays it
out. Win: get through 8 seasons (two years). A season that ends with either
total outside its census band is a strike; 3 strikes, or either species at
0, loses. 6 achievements (in `games/games.json`).

