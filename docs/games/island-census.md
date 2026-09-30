# Island Census: design notes

**v1** (2026-09-29) · playtest: https://claude.ai/artifact/Tk9dtgZU1XGUsaB1vwFuGW ·
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

HUD panel at the top (season, strikes, one meter per species with its
green band). Meadow centres fall in an ellipse centred (200, 342), radii 122×180
(wider let the island's sand run off the canvas).
Paths: shortest non-crossing links under `PATH_MAX`, max 4 per meadow,
then the shortest link that joins any separate groups.


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
- Candidate third verb if the round feels thin: none planned; the brief
  allows 3, but the refuge tension may be enough.

History (older versions, balance tables, playtests): `docs/history/island-census.md`
