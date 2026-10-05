# Ant Trails: design notes

**v6** (2026-10-05, canvas label; v5 2026-09-29) · playtest: https://claude.ai/artifact/K2UDULvJEUsesLU2949whG ·
balance: `node scripts/balance-ant-trails.mjs 200`
Verbs: **trail** (drag) and **wash** (hold), sharing **scent per ground cell**
(40×60 grid, 10 px cells, 0–1). A run of six days, each a round with its own
food layout, twist and bonus; ants alive at sundown start the next day.

## How it works

- Win a day: bring its crumbs home before sundown (60 s day 1, then 90 s).
  Lose: sundown, colony below 8 ants, or too many crumbs dropped/raided to
  reach the goal. A lost day can be retried with the dawn colony, or the run
  restarted. 12 achievements (in `games/games.json`).

| Day | Name | Goal | Food (crumbs) | Twist | Bonus (+3 ants) |
|---|---|---|---|---|---|
| 1 | First crumbs (v5) | 20 in 60 s | 25, one pile near the nest | no spider | win with 20 s to spare |
| 2 | First light | 50 | 15 near, 25 middle, 40 far | 1 spider (v1 layout) | clear the far pile |
| 3 | Scattered crumbs | 50 | 6 piles of 8–12 | spider from the other corner | lose 3 ants or fewer |
| 4 | Storm | 50 | 2 piles, 32 + 38 | storm clouds drift across and wash scent | win with 20 s to spare |
| 5 | Two spiders | 55 | 20 + 25 + 30 | second spider | rain on each spider while it hunts |
| 6 | Rival colony | 60 | 5 piles, 102 total | 22 red ants from a nest at the top | (last day) |

- **Day 1:** warm-up, one pile ~160 px from the nest, no spider. Colony
  starts at 15 (`START_ANTS`) so day 2 starts with ~22 ants after the
  overnight hatch. Untouchable only counts on days with a spider.
- **Fast-forward:** ▶▶ button (F key) cycles 1× → 2× → 3× (`SPEEDS`): more
  fixed steps per frame, same play. Speed persists across days.
- **Carry-over:** dawn ants = ants alive at sundown (incl. hatched) + 1 per
  10 s spare daylight (`REST_S`) + 3 for the bonus (`BONUS_ANTS`). Lost ants
  stay lost.
- **Variety:** each day's layout is mirrored left-right at random; piles and
  spiders shift up to 12 px (`JITTER`).
- **Storm:** cloud (r 50, 30 px/s, `STORM_WIPE` 3/s) enters from a side every
  9 s from 6 s; washes your trails and the spider's alike.
- **Rivals:** red ants run the same ant code from their own nest (same scent
  grid): follow your trails outward from their nest, raid the same piles,
  their carriers' trails lure your searchers to the rival nest. Spiders eat
  them too; soldiers turn them back 45 px from your nest. Washing the rival
  nest mouth breaks their recruitment.
- **Retry:** restarts with the dawn colony. Full Season and the best-run
  record (localStorage `ant-trails-best`, on the end card) need no retries.
- **Scent loop:** drawn trails set scent 0.7 (brush half-width 9 px), paid
  from a gland meter. Carriers add 0.7/s walking home. Scent evaporates and
  diffuses; rain wipes it fast. Searchers steer to the strongest of 3
  feelers, biased outward (`OUT_BIAS`), go straight for food within
  `SMELL_R`; carriers walk straight home, so busy routes become highways.
  Spiders steer by scent too, faster on strong scent
  (`SP_BASE + SP_SCENT·scent`); soldiers keep it `NEST_GUARD` px from the
  nest; it pauses `EAT_PAUSE` s after eating an ant.
- **Input:** moving >10 px before 150 ms is a trail; holding still 150 ms
  starts rain, and the cloud follows the pointer.

## Key constants (`games/ant-trails.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_ANTS / MIN_ANTS | 15 / 8 (22 before v5) | goal / sun / SPARE | per day (above) / 20 s |
| REST_S / BONUS_ANTS | 10 s / 3 | SAFE_LOST / BIG_COLONY | 3 / 32 |
| STORM_FIRST / EVERY | 6 / 9 s | STORM_R / SPEED / WIPE | 50 / 30 / 3 |
| RIVAL_GUARD / rivals | 45 / 22 | JITTER / SPEEDS | 12 px / 1, 2, 3× |
| HATCH_EVERY | 10 crumbs | ANT_SPEED | 36 |
| EVAP / DIFFUSE | 0.08 / 0.5 | CARRY_LAY / DRAW_SCENT | 0.7 / 0.7 |
| GLAND_MAX / INK_PX / GLAND_REGEN | 100 / 6 px / 7 per s | RAIN_R0→R1 / RAIN_WIPE | 22→48 / 7 |
| SMELL_R / PILE_R | 22 / 10 | FEEL_D / FEEL_A / OUT_BIAS | 11 / 0.55 / 0.6 |
| SP_BASE / SP_SCENT | 20 / 55 | SP_CATCH / EAT_PAUSE / NEST_GUARD | 8 / 1.5 s / 80 |

## Layout (400×600)

Nest (200, 555); rival nest (day 6) at (200, 40). Pile and spider positions
are the `DAYS` table at the top of the script (before mirroring). Day 1: one
pile of 25 at (285, 420). Day 2 keeps the v1 layout: near + middle is 40
crumbs, so a day-2 win needs 10 from the far pile.

## Balance (v5, `node scripts/balance-ant-trails.mjs 200`, ±3–7 pts)

Per day: % of runs that won it (of runs that reached it), median seconds to
win it, median ants at dawn.

| Bot | Day 1 (new) | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 (full season) |
|---|---|---|---|---|---|---|
| idle | 91% · 39 s · 15 | 36% (40) · 80 s · 22 | 20% (54) | 5% (26) | 1% (20) | 0% |
| trail | 100% · 17 s · 15 | 97% · 64 s · 24 | 82% (84) | 53% (65) | 36% (68) | 21% (57) |
| wash | 100% · 17 s · 15 | 96% · 62 s · 24 | 90% (94) | 79% (88) | 68% (86) | **53%** (77) |
| far | 100% · 17 s · 15 | 93% · 65 s · 24 | 88% (94) | 81% (93) | 60% (73) | 40% (67) |
| novice | 99% · 38 s · 15 | 61% · 77 s · 22 | 27% (44) | 13% (47) | 4% (28) | 2% (43) |

- Day 1: 17 s with one trail, ~38 s without (idle 91%, novice 99%). Its
  bonus (20 s spare) needs a trail: trail bots 100%, idle 54%.
- From day 2 the run matches v4's days 1–5 (dawn 22–24 ants, wash full
  season 53% vs 49%, novice 2%). `START_ANTS` 22 gave everyone ~7 extra ants
  (wash full season 81%); 15 ants with a 45 s day 1 cost the novice 17% on day 1.

## Telemetry

One `arcade:result` per day (time = that day's clock) with `level` (day),
`run`, `attempt` (2+ = retry), `reason` for a loss (`sun` / `ants` / `food`)
and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `dawn` | ants at the start of the day | `ants` | ants at the end |
| `lost` | ants eaten | `hatched` | ants hatched from crumbs |
| `crumbs` | crumbs home | `bonus` | bonus met (0/1) |
| `trails` | trail gestures | `trail_px` | trail length drawn |
| `rains` | rain gestures | `rain_s` | seconds of rain |
| `rain_spider_s` | seconds the rain covered a spider | `first_input` | s until the first touch (-1: none) |
| `rivals` | crumbs the rivals took (rival day) | `ff_s` | s played fast-forwarded (v5) |

`rain_spider_s / rain_s` separates deliberate washing from accidental holds;
`first_input` shows reading time on day 1. v5 shifts `level` by one (old day
1 is now level 2): compare v4 and v5 data by day name, not number.

## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): keys only fast-forward (drag, hold need a pointer); ignores reduced motion; bonus line 11.5 px.
- After v5: does `ff_s` show up (which days, how much), and does the share of
  sessions reaching day 2 rise vs v4?
- Not hand-played on a real phone yet (only rendered headlessly at 390×760).
- `fetch-telemetry.mjs --game ant-trails` prints one line per day (compare
  with the bot table), levels won per run, where sessions stopped. Goal is
  3+ rounds per session. Also: do players retry, and wash on purpose
  (`rain_spider_s`) or by accident?
- Idle wins day 1 91% and day 2 40% of arrivals (the ants' own trails
  recruit). Lower `CARRY_LAY` if players say early days play themselves.
- The novice bot is barely better than idle on the scattered day (day 3):
  random wobbly trails help about as much as they cost. Real players
  probably do better; check telemetry.
- The two-spider day (day 5) is the wall for skilled bots. If players find it
  a wall, start the second spider late (e.g. 20 s) instead of at dawn.
- More days / an endless mode (day 7+ repeats the twists combined) if runs get
  finished; a mid-run choice (e.g. pick tomorrow's twist) if players want
  more decisions.
- Proposal alternatives still not built: pebble (tap to block), decoy crumb.

History (older versions, balance tables, playtests): `docs/history/ant-trails.md`
