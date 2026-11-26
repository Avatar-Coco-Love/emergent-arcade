# Ant Trails: design notes

**v9** (2026-11-26, depth pass: endless days; v8 2026-10-07 touch fix) · playtest: https://claude.ai/artifact/N4YrCNUahHvf4UAtQY3nrF ·
balance: `node scripts/balance-ant-trails.mjs 100 wash,far,novice RETRY=3,MAX=30`
Verbs: **trail** (drag) and **wash** (hold), sharing **scent per ground cell**
(40×60 grid, 10 px cells, 0–1). A run of six days, each a round with its own
food layout, twist and bonus; ants alive at sundown start the next day.
From day 7 the run is endless (v9): generated late-summer days, harder each day.
Score: days survived (no ceiling, `score.epoch` 2, plausibility `max` 200).

## How it works

- Win a day: bring its crumbs home before sundown (60 s day 1, then 90 s).
  Lose: sundown, colony below 8 ants, or too many crumbs dropped/raided to
  reach the goal. A lost day can be retried with the dawn colony, or the run
  restarted. 12 achievements (in `games/games.json`).

| Day | Name | Goal | Food (crumbs) | Twist | Bonus (+3 ants) |
|---|---|---|---|---|---|
| 1 | First crumbs (v5) | 20 in 60 s | 25, one pile near the nest | no spider | win with 20 s to spare |
| 2 | First light | 50 | 15 near, 25 middle, 40 far | 1 spider (v1 layout) | clear the far pile |
| 3 | Scattered crumbs | 45 (50 before v9) | 6 piles of 8–12 | spider from the other corner | lose 3 ants or fewer |
| 4 | Storm | 50 | 2 piles, 32 + 38 | storm clouds drift across and wash scent | win with 20 s to spare |
| 5 | Two spiders | 55 | 20 + 25 + 30 | second spider | rain on each spider while it hunts |
| 6 | Rival colony | 60 | 5 piles, 102 total | 22 red ants from a nest at the top | (last day) |

- **Late days (v9, `// § endless days`, `lateDay()`):** late day k (k = 1 on
  day 7): goal `LATE_GOAL0 + LATE_GOAL_K·k` (60 + 5k), food 1.6× the goal in
  3–5 random piles (≥140 px from the nest, ≥80 apart, the highest one is the
  far pile), spiders `LATE_SPIDERS` [2, 2, 3, 3, 4] from random dens, storm on
  odd k, rivals (18 + 3k, max 36) on even k, both from k = 5 (`LATE_BOTH`).
  Bonus rotates rainout, safe, far, swift. A layout is generated once per run
  and day (`lateCfg`), so a retry replays it. Weathered, Double Trouble and
  Turf War stay tied to days 4–6 (`!cfg.late`); Long Haul to day 2. New
  achievement **Long Summer**: win day 10 (13 total). Day 6's win card says
  "Summer's end" and leads on to day 7; HUD shows `7`, not `7/6`.
- **Wash hint (v9, `// § wash hint`):** v8 players almost never rained
  (rains median 0 on every day). While a run has had no rain, a spider
  following scent >1.5 s (`HINT_FOLLOW`) within 70 px of ants shows one hint
  ("Hold on it to make it rain…", "Click and hold" on a mouse, W on keys),
  once a day, 2 per run (`HINT_MAX`).
- **Best run** (v9): saved after each won day, not only at the run's end.
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
- **Input (v8):** moving >10 px before 350 ms (`MOVE_PX`, `HOLD_MS`) is a
  trail, else rain; a drag >20 px within 250 ms of rain (`RESCUE_*`) turns it
  into a trail and restores the scent. Findings: *A short hold timer steals the drag verb*.

## Accessibility (v7, details in history)

Keys: arrows move a cursor, hold Space trails, hold W washes, H nest, N next
pile, F speed, Enter end card. Live region `#say` speaks what changes.
Audit: `node scripts/a11y-audit.mjs ant-trails` (5 pass, motion partial by design).

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

Nest (200, 555); rival nest (day 6) at (200, 40). Piles and spiders: the `DAYS` table
(before mirroring).

## Balance (v9, 100 runs, ±5–10 pts)

Day columns: % of runs that won it on the first try (no retries), RETRY=0.
Endless columns: RETRY=3 (a lost day retried up to 3 times a run), MAX=30.

| Bot | D1 | D2 | D3 (45) | D4 | D5 | D6 | days won (med) | won d10 / d12 | run min (med, p75) |
|---|---|---|---|---|---|---|---|---|---|
| idle | 91% | 34% | 26% | 3% | 0% | 0% | 1 | 0 / 0 | 2.2 (no retry) |
| trail | 100% | 97% | 92% | 71% | 44% | 18% | 4 | 3% / 1% (no retry) | 4.6 (no retry) |
| wash | 100% | 95% | 92% | 86% | 74% | 65% | 10 | 57% / 37% | **11.5** (14.2), 3% hit 30 days |
| far | 100% | 93% | 91% | 87% | 61% | 50% | 9 | 32% / 8% | **12.4** (13.4) |
| novice | 99% | 63% | 39% (27% v8) | 16% | 10% | 2% | 3 | 1% / 1% | 9.1 (9.9) |

No retries: skilled median 6.2–6.9 min; LATE_GOAL_K 0–5 barely moves it.

## Telemetry

One `arcade:result` per day (time = that day's clock) with `level` (day),
`run`, `attempt` (2+ = retry), `reason` for a loss (`sun` / `ants` / `food`)
and `stats`: `dawn`/`ants` (start/end), `lost`, `hatched`, `crumbs`, `bonus`
(0/1), `trails`, `trail_px`, `rains` (kept), `rescues` (rain turned trail,
v8), `rain_s`, `rain_spider_s`, `first_input` (-1 none), `rivals` (rival
days), `ff_s` (fast-forward s), `keys` (gestures by key).

## Open ideas / known limits

- Accessibility: red rival ants differ from yours by hue only (deutan and
  protan see two darks; too small for the audit). A lighter rival body or
  a mark if day-6 players mix them up.
- Watch `rescues` vs `rains` (v8: a high share means the hold is still
  too short), `rain_spider_s / rain_s`, retries and `keys`. v5 numbers: history.
- Idle wins early days (own trails recruit): lower `CARRY_LAY` if they play themselves.
- Day 5 (two spiders) is the bots' wall: start spider 2 at 20 s if players stall.
- Endless (v9): watch `level` ≥ 7 rounds, retries per late day, and whether
  hints turn into rains (`rains` > 0 on day 2–3). If players stall at day 7–8,
  lower `LATE_SPIDERS` first. More ideas (pebble, decoy crumb): history.

History (older versions, balance tables, playtests): `docs/history/ant-trails.md`
