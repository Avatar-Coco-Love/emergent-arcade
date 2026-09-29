# Ant Trails: design notes

Current: **v5** (playtest: https://claude.ai/artifact/K2UDULvJEUsesLU2949whG). Mechanics: **trail** (drag) and
**wash** (hold), sharing **scent per ground cell** (40×60 grid, 10 px cells,
0–1). v3 turns one round into a run of days (**six** since v5): each day is
a round (its own food layout, twist and bonus challenge), and the ants
alive at sundown start the next day. Win a day: bring its crumbs home
before sundown (60 s on day 1, then 90 s).
Lose a day: sundown, colony below 8 ants, or too many crumbs dropped/raided
to reach the goal. A lost day can be retried with the dawn colony, or the
run restarted. 12 achievements (in `games/games.json`).

## The run (v5)

| Day | Name | Goal | Food (crumbs) | Twist | Bonus (+3 ants) |
|---|---|---|---|---|---|
| 1 | First crumbs (v5) | 20 in 60 s | 25, one pile near the nest | no spider | win with 20 s to spare |
| 2 | First light | 50 | 15 near, 25 middle, 40 far | 1 spider (v1 layout) | clear the far pile |
| 3 | Scattered crumbs | 50 | 6 piles of 8–12 | spider from the other corner | lose 3 ants or fewer |
| 4 | Storm | 50 | 2 piles, 32 + 38 | storm clouds drift across and wash scent | win with 20 s to spare |
| 5 | Two spiders | 55 | 20 + 25 + 30 | second spider | rain on each spider while it hunts |
| 6 | Rival colony | 60 | 5 piles, 102 total | 22 red ants from a nest at the top | (last day) |

- **Day 1 (v5)** is a warm-up, from the feedback below: one pile about
  160 px from the nest, no spider, 60 s. It starts the colony at 15 ants
  (`START_ANTS`) so that, after its overnight hatch (rest + bonus + crumbs),
  day 2 starts with about the 22 ants v4's day 1 had. Untouchable only
  counts on days with a spider.
- **Fast-forward (v5):** the ▶▶ button (bottom right of the ground; F on a
  keyboard) cycles 1× → 2× → 3× (`SPEEDS`). It runs more fixed steps per
  frame, so play is identical, only quicker. The speed stays set across
  days. Telemetry `ff_s` = game seconds played above 1×.

- **Carry-over:** ants at dawn = ants alive at sundown (including hatched)
  + 1 per 10 s of spare daylight (`REST_S`) + 3 for the bonus
  (`BONUS_ANTS`). Lost ants stay lost, so a bad day 2 shows up on day 4.
- **Variety between runs:** every day's layout is mirrored left-right at
  random and piles/spiders shift up to 12 px (`JITTER`).
- **Storm:** a cloud (r 50, 30 px/s, `STORM_WIPE` 3/s) enters from a side
  every 9 s from 6 s. It washes your trails and the spider's trail alike.
- **Rivals:** red ants run the same ant code from their own nest (same
  scent grid). They follow your trails outward from *their* nest, raid the
  same piles, and their carriers lay trails that lure your searchers toward
  the rival nest. Spiders eat them too; soldiers turn them back 45 px from
  your nest. Washing the rival nest mouth breaks their recruitment.
- **Retry:** a lost day restarts with the dawn colony. Full Season and the
  best-run record (localStorage `ant-trails-best`, shown on the end card)
  need a run with no retries.
- Telemetry (v4): one `arcade:result` per day (time = that day's clock)
  with `level` (day), `run`, `attempt` (2+ = retry), `reason` for a loss
  (`sun` / `ants` / `food`) and `stats`:

  | key | meaning | key | meaning |
  |---|---|---|---|
  | `dawn` | ants at the start of the day | `ants` | ants at the end |
  | `lost` | ants eaten | `hatched` | ants hatched from crumbs |
  | `crumbs` | crumbs home | `bonus` | bonus met (0/1) |
  | `trails` | trail gestures | `trail_px` | trail length drawn |
  | `rains` | rain gestures | `rain_s` | seconds of rain |
  | `rain_spider_s` | seconds the rain covered a spider | `first_input` | s until the first touch (-1: none) |
  | `rivals` | crumbs the rivals took (rival day) | `ff_s` | s played fast-forwarded (v5) |

  `rain_spider_s / rain_s` separates deliberate washing from accidental
  holds; `first_input` shows reading time on day 1. **v5 shifts `level` by
  one** (the old day 1 is now level 2): compare v4 and v5 data by day name,
  not number.

## How the scent loop works

- Drawn trails set scent to 0.7 (brush half-width 9 px), paid from a gland
  meter. Carriers add 0.7/s to their cell as they walk home. Scent
  evaporates and diffuses; rain wipes it fast.
- Searching ants steer toward the strongest of 3 feelers, weighted toward
  the way out of the nest (`OUT_BIAS`), and go straight for food within
  `SMELL_R`. Carriers walk straight home (dead reckoning), so each busy route
  straightens itself into a highway.
- Spiders steer by scent the same way and gets faster on strong scent
  (`SP_BASE + SP_SCENT·scent`). Soldiers keep it `NEST_GUARD` px from the nest.
  After eating an ant it pauses for `EAT_PAUSE` seconds.
- Input: moving more than 10 px before 150 ms is a trail. Holding still for
  150 ms starts rain, and the cloud then follows the pointer.

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

Nest (200, 555); the rival nest (day 6) is at (200, 40). Pile and spider
positions per day are the `DAYS` table at the top of the script (before
mirroring). Day 1 (v5) is one pile of 25 at (285, 420). Day 2 keeps the v1
layout: near + middle is 40 crumbs, so a day-2 win needs 10 from the far pile.

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

- Day 1 takes 17 s with one trail and ~38 s without one (idle 91%,
  novice 99%). Its bonus (20 s spare) needs a trail: trail bots 100%,
  idle 54%.
- From day 2 on, the run matches v4's days 1–5 (dawn colony 22–24 ants,
  wash full season 53% vs 49%, novice 2%). First try with
  `START_ANTS` 22 gave everyone ~7 extra ants (wash full season 81%), and
  15 ants with a 45 s day 1 cost the novice 17% on day 1.

### v3 balance (five days, 22 starting ants), for reference

Days here are v5's days 2–6.

Whole runs, no retries. Per day: % of runs that won it (in brackets: of
runs that reached it), median ants at dawn, median ants lost that day,
% bonus met.

| Bot | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 (full season) |
|---|---|---|---|---|---|
| idle | 53% (53) · 22 · 10 · 6% | 27% (51) · 21 · 8 | 7% (26) · 22 · 7 | 4% (50) · 28 · 16 | 2% (57) |
| trail | 89% (89) · 22 · 10 · 0% | 68% (77) · 20 · 6 · 21% | 40% (59) · 22 · 8 · 32% | 27% (66) · 29 · 13 · 0% | 15% (55) |
| wash | 94% (94) · 22 · 6 · 0% | 85% (90) · 24 · 4 · 41% | 74% (88) · 28 · 5 · 57% | 59% (80) · 32 · 11 · 68% | **49%** (82) |
| far | 95% (95) · 22 · 4 · 45% | 91% (96) · 26 · 4 · 36% | 87% (95) · 29 · 4 · 82% | 57% (65) · 36 · 15 · 81% | 41% (72) |
| novice | 75% (75) · 22 · 10 · 14% | 39% (52) · 20 · 7 · 11% | 19% (48) · 24 · 8 · 19% | 7% (38) · 28 · 16 · 59% | 2% (29) |

- Every day is harder than the one before for the novice (75 → 29% of
  those that reach it); for skilled bots day 4 (two spiders) is the wall
  (65–80%) and costs 11–15 ants, which day 5 then feels.
- Both verbs count, more each day: wash beats trail by 5 pts on day 1 and
  34 pts over the full run. Trail beats idle by 36 pts on day 1.
- Colony size decides day 5: from a fresh 22-ant colony (`FROM=5`), wash
  wins it 47% (22 rivals); arriving with the usual ~34 ants, 82%. That is
  the carry-over doing its job.
- `novice` (new): reads 4 s, then every 3–5 s draws a wobbly trail from
  20–60 px off the nest to a random pile; 1 gesture in 5 is a mistaken hold
  (rain on its own trail). Washes spiders only from day 3, late (0.8 s) and
  half the time. It reaches day 2 75% of the time and day 3 39%. With
  retries, it needs about 2 tries per day after day 1.
- Bonus choices are real trade-offs: the far pile (day 1) costs time, so
  the wash bot never earns it and the far bot does 45%.
- Achievements (wash / novice): Weathered 74 / 19%, Double Trouble 59 / 7%,
  Turf War 31 / 2%, Big Colony 56 / 9%, Full Season 49 / 2%, Untouchable
  21 / 6%, Decoy 16 / 18%, Long Haul (far bot) 45%.
- Tuning path: day-1 goal 45 let idle win 75% (now 50: 53%). Day 2's first
  bonus, "lose no ants", was 0–8% (now ≤ 3 lost: 41%). With 14 rivals
  day 5 was the easiest day (wash 100% of arrivals); 28 made it 28% from
  fresh; 22 it is.

### v1 balance (single 90 s round, 60 crumbs), for reference

| Bot | @75 s | @90 s | @105 s | ants lost (median) | colony died |
|---|---|---|---|---|---|
| idle (no input) | 2% | 16% | 32% | 16 | 118/300 |
| trail (redraw nearest faded trail) | 30% | 50% | 63% | 14 | 102/300 |
| wash (trail + rain on spider near ants) | 43% | 63% | 77% | 7 | 40/300 |
| far (wash, far pile first) | 7% | 46% | 85% | 7 | 6/300 |

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v2: 1 round, **won in 83 s** (86 s session, 5 achievements so far).
Bots: wash 63% / far 46% by 90 s. A first-try win before 90 s is in line
with the wash bot. No feedback yet. One round, so it confirms nothing, but
it doesn't contradict the bots.

Written feedback (2026-09-28, a friend of the maintainer who played the
whole gallery; a self-described "spoiled" gamer used to full-length games):
Ant Trails was his **favourite** and the one he'd "love to see more on".
It holds him for ~1–2 min, then he leaves "once I figured I had seen
everything", usually right after a win or loss. There weren't enough
decisions in a short round to feel impactful. He asked for **variety**
("would add depth and mechanics to keep a hook and extend length of the
game in one go"). The maintainer wants to expand it: more challenges, more
achievements.

Follow-up feedback (2026-09-29, same friend, on v4): "level 1 takes way
too long to want to sit and see the next days. Maybe a fast forward
feature would help, or maybe starting with a single pile close to home to
let players get the feel. You gotta hook a player before they will stay
and try others." v5 does both.

## Open ideas / known limits

- **What to check after v5:** does `ff_s` show up (which days, how much),
  and does the share of sessions reaching the second day rise vs v4?

- Not hand-played on a real phone yet (only rendered headlessly at 390×760).
- **What to check in telemetry:** `fetch-telemetry.mjs --game ant-trails`
  prints one line per day (compare with the bot table above), levels won
  per run, and where sessions stopped. v2 was one round per session; the
  goal is 3+. Also: do players retry, and do they wash on purpose
  (`rain_spider_s`) or only by accident?
- Idle wins day 1 91% and day 2 40% of arrivals (the ants' own trails
  recruit). Lower `CARRY_LAY` if players say the early days play themselves.
- The novice bot is barely better than idle on the scattered day (day 3):
  random wobbly trails to scattered piles help about as much as they cost.
  Real players probably do better; check against telemetry.
- The two-spider day (day 5) is the wall for skilled bots. If players find it a wall, start the
  second spider late (e.g. 20 s) instead of at dawn.
- More days / an endless mode (day 7+ repeats the twists combined) if runs
  get finished; a mid-run choice (e.g. pick tomorrow's twist) if players
  want more decisions.
- Proposal alternatives still not built: pebble (tap to block), decoy crumb.

## History

- v1: first version.
- v2: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry.
- v3: depth, from the written feedback ("seen everything" after one round).
  Five-day run with carry-over, a layout and twist per day (storm clouds,
  two spiders, rival colony), bonus challenges, retry a lost day, best run,
  5 new achievements. Same 2 verbs. New `novice` bot; the harness plays
  whole runs.
- v4: no gameplay change. Telemetry reports the day, run, attempt, loss
  reason and per-day play stats (above).
- v5: from the friend's second feedback ("level 1 takes way too long").
  New warm-up day 1 (one near pile, no spider, 60 s, colony starts at 15),
  so the run is six days. Fast-forward button (1/2/3×, F key). Telemetry
  `ff_s`. Untouchable needs a spider.
