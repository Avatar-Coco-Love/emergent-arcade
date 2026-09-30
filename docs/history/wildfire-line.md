# Wildfire Line: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/wildfire-line.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## History

- v1: first version (cut brush narrowed to one cell during PR playtest).
- v2: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry. Bot numbers above still apply; compare humans with
  `node scripts/fetch-telemetry.mjs --game wildfire-line` (see `docs/telemetry.md`).
- v3: `STAM_MAX` 100 → 125 (tester: stamina ran out too fast). cutburn
  70% → 81%, cut 55% → 62%.

## Balance tables and tuning (v1, v2, v3 comparison), original section

## Balance (v1, `node scripts/balance-wildfire-line.mjs 300`, ±3 pts)

| Bot | Win | 4/4 houses | Median length | Houses lost to own backburn |
|---|---|---|---|---|
| idle (no input) | 4% | 3% | 53 s | 0 |
| cut (4 one-cell rows at y 475/465/455/445, nearest the fire first; rings a house if fire gets past) | 55% | 48% | 68 s | 0 |
| cutburn (same, plus burning out right above the first 2 rows, ≥2 sections from any gap) | 70% | 65% | 71 s | 0 in 300 runs |
| burn (diagnostic: no cutting, backburn ahead of the fire when the wind blows back at it) | 3% | 2% | 51 s | 335 in 300 runs |

Cut + backburn beats cut-only by 15 points (21 with the old wide brush), and no input wins 4%. The
burn-only bot shows the risk: a backburn with no line behind it turns into
a second front at the next wind shift (Backfired in 58% of its runs).

### v3: bigger stamina bar (`STAM_MAX` 100 → 125)

The tester asked for slightly more stamina *or* faster refill, not both.
Both, 300 runs each (v2 row for comparison):

| Setting | cut | cutburn | cutburn − cut |
|---|---|---|---|
| v2 (100, 6/s) | 55% | 70% | 15 |
| **v3: STAM_MAX 125** | **62%** | **81%** | **19** |
| STAM_REGEN 7.5 (not taken) | 69% | 85% | 16 |

Picked the bigger bar: it keeps backburning worth more than cutting alone
(a bigger gap), where faster refill mostly helps cut-only. Idle is
unchanged (4%). v3 cutburn achievements: Fight Fire with Fire 63%, Read
the Wind 46%, Hold the Line 44%, Not a Scratch 77%, Swift 6%. The rest of
this section is v1/v2.

Achievement rates (v2, cutburn bot): Fight Fire with Fire 47%, Read the Wind
30%, Hold the Line 55% (cut bot 83%), Not a Scratch 65%, Swift 3%,
Backfired 0% (burn bot 58%).

Tuning path:
- The first pass (SPREAD 0.6, BURN_T 3) reached the village in 12 s.
- SPREAD 0.12–0.15 with short burns made the fire fizzle into a thin
  finger. Long burns (BURN_T 12) keep the front wide.
- CUT_COST 3 let cut-only win 100%.
- Burning out in sections next to gaps flanked round the ends.


## Notes before the split (2026-09-30)

Original text of the header line, current-balance context and first line of Open ideas before tightening.

# Wildfire Line: design notes

Current: **v3**. Mechanics: **cut** (drag) and **backburn** (tap), sharing
**fuel per ground cell** (40×60 grid, 10 px cells, 0–1). Win: the fire burns
out with at least 3 of 4 houses standing. Lose: a second house burns (the
round ends at once). 6 achievements (in `games/games.json`).

