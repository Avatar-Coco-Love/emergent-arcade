# Island Census: design notes

**v3** (2026-10-05, accessibility; v2 canvas label; v1 2026-09-29) · playtest: https://claude.ai/artifact/Tk9dtgZU1XGUsaB1vwFuGW ·
balance: `node scripts/balance-island-census.mjs 300`
Mechanics: **release** (tap) and **fence** (drag), sharing **rabbits, foxes
and grass per meadow** on a 7-meadow island. Turn-based: 2 moves per season,
then Next season plays it out (no clock). Win: get through 8 seasons (two
years). A season that ends with either total outside its census band is a
strike; 3 strikes, or either species at 0, loses. 6 achievements (in
`games/games.json`). Every round is a new island and one of 4 second-year
events, announced a season ahead.

## How a season works

Each season runs `SUB` = 8 small steps. Per meadow: grass regrows
(`GROW[season] · (K − G)`), rabbits eat `EAT` each (fed share = grass
eaten / wanted), breed at `BREED[season] · fed`, die at `RDIE + STARVE ·
(1 − fed)`; foxes catch `HUNT · R / (R + HALF)` each, turn `FCONV` of each
catch into cubs, and die at `FDIE[season]`. Then movement along every path:
rabbits flow toward the meadow with less crowding per grass and fewer
foxes (`(R+1)/(G+2) + FEAR · F`, rate `RMIG`), fences or not; foxes flow
toward more rabbits per fox (`R / (F+1)`, rate `FMIG`), never across a
fence. Fewer than `F_GONE` foxes in a meadow rounds to none.

Fox arrows on the paths (planning only) are the next step's fox flow from
the current numbers, shown when it's over 0.3 foxes a season.

The refuge is the emergent strategy the verbs create: fence every path of
one grassy meadow and it keeps a breeding stock through a fox boom. Seal it
too long and the foxes outside starve, so the player opens it (free) when
foxes run low. That is the tension the game is about.

## Key constants (`games/island-census.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| N_MEADOWS / K_MIN–K_MAX | 7 / 22–38 grass | MIN_D / PATH_MAX | 108 / 175 px |
| SEASONS / MOVES | 8 / 2 | MAX_FENCES / RELEASE | 3 / 8 |
| R band / F band | 20–150 / 4–16 | MAX_STRIKES | 3 |
| START_R / START_F | 60 / 7 (den 5 + 2 next door) | LANDING | 4 foxes |
| GROW | 1.0, 0.7, 0.5, 0.3 | BREED | 0.9, 0.6, 0.3, 0 |
| FDIE | 0.4, 0.4, 0.5, 0.6 | EAT / RDIE / STARVE | 1.0 / 0.1 / 0.8 |
| HUNT / HALF / FCONV | 8.5 / 8 / 0.15 | FEAR / RMIG / FMIG | 0.3 / 0.5 / 3 |
| SUB / F_GONE | 8 / 0.2 | ANIM_S | 1.6 s |

Second-year events (one per round, random): drought (summer grass ×0.3),
landing (autumn, +4 foxes on the meadow farthest from the centre), hard
winter (fox deaths ×1.5, rabbit deaths ×2), bumper spring (breeding ×1.5).

## Layout (400×600)

HUD panel at the top, y 8–98 (season, strikes, one meter per species with
its band). Meadow centres fall in an ellipse centred (200, 342), radii 122×180
(wider let the island's sand run off the canvas).
Paths: shortest non-crossing links under `PATH_MAX`, max 4 per meadow,
then the shortest link that joins any separate groups.


## Accessibility (v3, `node scripts/a11y-audit.mjs island-census`: all 6 pass, 3/3 runs)

Each surface has its own lightness band (Lab L), so they hold under
deuteranopia/protanopia (v2: turf, paths and grazed meadows all one olive):

| surface | colour | L |
|---|---|---|
| sea / turf | `#0f2d3d` / `#1e3019` (blue vs olive) | 17 / 18 |
| meadow, bare → full | `rgb(97,77,52)` → `rgb(134,196,96)`, + a tuft per eighth of grass | 34 → 73 |
| path / sand | `#d2bd92` / `#e3d3a4` | 77 / 85 |

- Marks by shape: fox arrows and hopping rabbits outlined dark; counts
  after a dot (rabbits) or a triangle (foxes); strikes filled with a ✕ vs
  rings; meter numbers say "low"/"high" outside the band; Next season
  turns light (not green) when moves are used. Meter band `#5f8784`, low
  saturation: a teal band matched anti-aliased text grey for deutan
  (findings, "A saturated colour…").
- Text from `fs(n)` (≥ 12.5 CSS px; 15 board units at 360 px wide), HUD
  backing 0.92, count backings 0.88, `#msg` on a backing under the HUD.
- Keys (`// § keys`): arrows move a cursor between meadows (nearest
  within 80° of the arrow), Enter/Space release, F starts fencing, an arrow
  picks a path (each path gets its own arrow: the least-turn assignment
  over ≤ 24 orders; same arrow again cycles), F or Enter fences or takes
  it down, Esc cancels, N next season, Enter after the end = new island.
  Same `release()` / `toggleFence()` as the pointer. Checked on 500
  islands: every meadow and every path reachable by keys.
- Live region `#say` (hidden): meadow readout ("Meadow 4, centre: 10
  rabbits, 2 foxes, grass 80%. Paths to 1, 3, 5. Foxes heading here from
  3."), release/fence results, one line per season, the end. Meadows are
  numbered in reading order, labels only (array order unchanged).
- Balance bots reproduce v2 exactly (no render `Math.random`).

## Balance (v1, `node scripts/balance-island-census.mjs 300`)

| Bot | Win | Lost (all 3 strikes unless noted) | Strikes per run: few rabbits / few foxes / many rabbits | Moves |
|---|---|---|---|---|
| idle | 25% | 72% (+3% rabbits died out) | 1.69 / 0.86 / 0.07 | 0 |
| release only | 69% | 31% | 1.32 / 0.15 / 0.32 | 6 |
| fence only | 63% | 36% | 1.22 / 0.63 / 0.09 | 2 |
| reader (both) | **88%** | 11% | 0.87 / 0.12 / 0.18 | 8 |
| novice | 58% | 41% | 1.18 / 0.53 / 0.15 | 6 |

- Both verbs count: each alone is 63–69%, together 88%. Idle 25%.
- The fence-only bot's weak spot is foxes (0.63 strikes): a sealed refuge
  starves them. The release-only bot's is rabbits: without a refuge the
  fox wave eats its releases.
- The novice's first guess, "fence the foxes in", costs it 0.53 fox
  strikes; it learns to open fences after the first one.
- Too many foxes almost never happens (0.01): fox totals peak at 12–15.
- Achievements (reader / novice): Census Taken 88 / 58%, Perfect Count 32 /
  20%, Long Winter 74 / 71%, Light Touch 54 / 54% (idle 25%), Comeback 27 /
  22%, Safe Haven 98 / 0%. Safe Haven needs a deliberately fenced-in
  meadow, which only the refuge strategy produces.
- Tuning path (HUNT, BREED, START_R experiments, paradox of enrichment): history.

## Telemetry

One `arcade:result` per round, `reason` for a loss (`census` = 3 strikes,
`foxes` / `rabbits` = died out) and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `seasons` | seasons played | `strikes` | strikes at the end |
| `rabbits` / `foxes` | totals at the end | `releases` | rabbits released (moves) |
| `fences` | fences put up | `unfences` | fences taken down |
| `standing` | fences up at the end | `first_input` | s until the first move or Next season (-1: none) |

## Open ideas / known limits

- Accessibility: done in v3 (above). Not tried with a screen reader or by
  a colour-blind player; do keyboard players find F? Meadow numbers exist
  only in speech: draw them if sighted keyboard players ask "which is 4?".
- Not hand-played on a real phone yet (only rendered headlessly).
- Too many foxes (band top 16) almost never triggers: fox totals peak
  around 12–15. It is there so the meter reads as a band, and for the
  landing event. If players never see it, drop it or make fox booms bigger.
- Novice 58% is below the ~75% Ant Trails aims for on day 1. Humans can
  read the fox arrows, which the novice bot ignores, so check telemetry
  (`reason`, `strikes`, `fences`/`unfences`) before easing it. Easiest
  levers: `R_BAND_LO` 15 or a 4th strike (on the wider v1 draft these
  moved novice 45% → 51% and 56%, idle 13% → 17% and 28%).
- Light Touch is earned by idle play on a lucky island (25%). Fine as a
  hint that doing less can work; tighten to 4 moves if it feels free.
- Idea for depth: carry the island into a third year with a new event per
  year (Ant Trails-style carry-over), or let the player choose which
  meadow to survey (hide counts elsewhere).

History (older versions, balance tables, playtests): `docs/history/island-census.md`
