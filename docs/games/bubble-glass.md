# Bubble Glass: design notes

**v3** (2026-09-30) · playtest: https://claude.ai/artifact/BXC2MQc3e4rf6x2wPUxZVR ·
balance: `node scripts/balance-bubble-glass.mjs 8 [bots] [levels]`
Liquid-motion sand toy in a sealed box. Verbs: **turn** (drag, tilt opt-in, ← →),
**melt** ({hold} sand into glass), **shatter** ({tap} glass). 21 levels, 3 chapters.

## How it works

- 48×48 grid; levels are 24×24 ASCII maps (2×2 cells per char). No clock per
  level, no loss: win = every bubble out the vent, or Restart. Score = chapter time
  (`score.epoch` 2; `board` = chapter id `sand` 1–5, `wet-and-dry` 6–12,
  `two-bubbles` 13–21), first level started to last won, restarts included; skipping
  via picker/resuming mid-chapter leaves it untimed. Progress by level id (`reachedId`).
- `MATERIALS` table (falls, speed, slides, rigid, stops, resist, melts, exit, sieve,
  colour); append rows (bots know sand=2, vent=4). Sand `s` (45 cells/s, resist 1,
  melts); wet `w` (0.25, resist 2.5, no slide, no melt); dust `d` (2, 0.3, melts);
  grate `%` (wall for bubble/glass, grains pass, ≤3 thick).
- Grain pass `2×SAND_V`/s; moves every `round(2/speed)`th pass. Gravity (sin a, cos a)
  in box frame; grains use the two nearest of 8 directions; blocked grains slide diagonally.
- Shards fall whole along the nearest of 8 directions; a melting shard is held.
- Bubbles `{x,y,r,flow}`, moved highest first. Touching pair (centres < r1+r2+1)
  merges (r=√(r1²+r2²)) where it fits; bigger rises √(r/BR) faster, needs 6-cell gap;
  vent exit; look-ahead adds `BUB_LEFT` per extra bubble.
- Bubble disc r=`BR`; moves up, 45°, then slides; fills a 4-cell gap, 2-cell slit
  stops it. Sand depth ahead (4 lanes): speed `1/(1+depth/TRICKLE_D)`, `DEEP` = wall;
  no liquid beside it: depth ×`TUBE_K`. Outline amber slowed, red dashed walled.
- Melt: still press `HOLD_DELAY_MS` on sand; grows `MELT_RATE` toward the {finger} up
  to `SHARD_MAX`, 1 heat/cell. Shatter: {tap} within `TAP_R` of glass restores `was`.
- Turn: press outside the box or move `DRAG_PX`; target ≤90° ahead; `ROT_MAX`; keys
  `KEY_RATE`. Tilt: real gravity, box level on screen, arrow; drag turns it off.
- Pure sim: `simStep(world, dt)`, `turnTo`, `meltStart/Move/Stop`, `shatterAt`,
  `cloneWorld`; hint and bots reuse them.
- Stuck hint (`watchStall`/`findHintG`): after `STALL_T` (1.5 s level 1) still, looks
  `LOOK_T` ahead per eighth-turn (≤`LOOK_MS` per frame). Order: marked melt spots;
  best turn (chevrons); helpful shatter (ring); Restart. Stays `HINT_MIN`; tilt "still"
  = within `TILT_STILL`°.
- Lid-first (`lidFirst`, level 2): melt hint only after `LID_HINT_T` (15 s) into the level (v4),
  until spots are glass, poured away, or heat < 8.
- Messages last 1.5 s + `MSG_MS_PER_CHAR`/char; `#msg` stays fixed at the top of the screen, never rotating with tilt (v4).
- Warnings once per level: shard touches bubble, heat out, shatter with no heat.
- Confirm before burying (v3): first {tap} only warns when the glass holds sand back
  (lid-first marked spot, or shard walling a bubble in within 1.5 s); second breaks it (`warns`).

## Key constants (`games/bubble-glass.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| N / CH | 48 cells / 2 per character | BR | 2.2 cells |
| BUBBLE_V | 15 cells/s | SAND_V / SHARD_V | 45 / 30 cells/s |
| TRICKLE_D / DEEP / TUBE_K | 3 / 10 / 4 | ROT_MAX / KEY_RATE | 180 / 120 °/s |
| HOLD_DELAY_MS / DRAG_PX | 170 ms / 12 px | MELT_RATE / SHARD_MAX | 20 cells/s / 40 cells |
| STALL_T / LOOK_T | 3 s / 3.5 s | TAP_R | 3 cells |
| UMBRELLA_N / BREAKOUT_T / LIGHT_DEG | 30 grains / 4 s / 270° | HINT_MIN / TILT_STILL | 4 s / 6° |
| MSG_MS_PER_CHAR | 70 ms | LOOK_MS (v3) | 4 ms of hint search per frame |
| BUB_LEFT (v3) | 40 (score per extra bubble left) | merged bubble | r = √2 · BR ≈ 3.1 |

Perf: step ~0.03 ms; 390×700 at 4× throttle, 16.7 ms median frame.

## Levels (ids permanent; `LEVELS` array; add, never rename)

Format: # id (verbs, heat): note. "all" = turn+melt+shatter.
1 first-turn (turn): shelf; vent in a sand pocket that must pour out first.
2 roof (+melt, 70): lid-first; melt a lid over each of two shafts, then flip.
3 the-plug (+shatter, 40): shatter the jam, flip first, return via 90°.
4 lid-and-plug (all, 70): lid-first, 4-wide shafts, tube, plug, room.
5 hourglass (all, 60): melt the waist jam into one shard, turn out.
6 mud (turn): wet sand over the vent; let it settle first.
7 dust-shafts (all, 70): roof with dust, lid-first.
8 sieve (all, 40): grate tube; tilt and sand leaves.
9 landslide (all, 40): the-plug with wet sand room.
10 sump (all, 60): grate tube, 2-cell sumps; lid keeps one full.
11 sand-timer (all, 60): hourglass with dust.
12 quicksand (all, 70): lid dust shafts, wet last stretch, grate sump; lid, hold tilt, flip.
13 twins (all, 40): two bubbles, wide vent. 14 mud-twins (all, 40): over wet beds.
15 narrow-door (all, 40): 4-cell tube, free one at a time. 16 dust-door (all, 40).
17 shared-sand (all, 40): grated tubes, two small sumps.
18 upstairs (all, 40): the-plug plus bubble above it. 19 two-plugs (all, 40).
20 convoy (all, 70): roof, two bubbles, lid-first. 21 last-box (all, 70): level 4 with two bubbles.

## Telemetry

Per level `arcade:result`: `outcome` (loss `reason` `restart`/`switch`), `time`,
`level`, `level_id`, `run`, `attempt`; stats `turns`, `deg`, `melted`, `glass`,
`shattered`, `heat_left`, `stuck_s`, `hints`, `warns`, `first_input` (1 turn, 2 melt,
3 shatter, 4 nothing), `tilt`, `buried_s`, `out`, `merged`, `ch_t`, `chapter`; a
chapter's last win adds `score` and `board`.

## Balance (v3)

Per level first-try win % / median time, reader vs hinted (8 runs; full table,
other bots, in history): 1: 100/5 s vs 100/19; 2: 100/7 vs 100/11; 3: 100/11 vs 63/34;
4: 100/30 vs 50/21; 5: 100/9 vs 75/31; 6: 100/4 vs 75/30; 7: 100/7 vs 88/14;
8: 100/4 vs 100/16; 9: 100/12 vs 100/34; 10: 100/9 vs 100/17; 11: 100/5 vs 88/29;
12: 100/8 vs 100/17; 13: 100/5 vs 100/31; 14: 100/5 vs 100/47; 15: 63/10 vs 75/35;
16: 100/5 vs 50/20; 17: 100/4 vs 100/14; 18: 100/7 vs 100/35; 19: 100/10 vs 63/46;
20: 100/7 vs 75/14; 21: 100/29 vs 38/24.

10-minute check (`CAMPAIGN=1 ... 16 hinted,reader`): hinted 88% all won, **10:39**
median (IQR 9:17–11:28; ch 2:14/2:39/5:09); reader 100%, 3:36. Melt matters on
roof, lid-and-plug, hourglass, dust-shafts, convoy; shatter required at plugs.

## Player data

2026-09-30 (v2 replay, 2 players, phone/tilt): 14 rounds, 14 wins, all first try;
one full run (~75 s of play), longest player 7:55 total. Levels 3–5 won faster than
`hinted`. v1's roof 0/2 became 2/2. v3 not yet played by humans.

## Achievements

umbrella (30 grains on a shard over the bubble); breakout (win ≤4 s after shattering
a shard touching the bubble); cold-hands (win from level 3 with no melt); light-touch
(win from level 3 turning <270°); glassblower (all 21 won, `localStorage`);
big-bubble (merged bubble leaves, v3); clockwork (chapter finished on the clock, v3).

## Open ideas

- v3 playtest (next): does anyone play a whole chapter? Use `fetch-telemetry.mjs` and
  chapter leaderboards; humans were faster than `hinted` in v2.
- Chapter 1 fixes in v3 (were open): level 1 second beat (novice 9→44 s, reader 5 s);
  level 4 rewards lids (lid-reader 12 s vs no-melt 32 s); level 5 rewards melt (13 vs 37 s).
- A wet-sand level that needs a lid: hold the box at an angle for long (diagonal corridor).
- Merging as a tool: notches a small bubble rises into and the big one slides past.
- HUD bar wraps to two lines on 390 px phone while the chapter clock shows.
- Sieve, sand-timer, dust-door, shared-sand, twins are 4–5 s for the reader; lengthen
  the skilled route. Sand-timer lost level 5's melt value (no-melt 5 s).
- Level 2 in tilt, real phone: is the lid ring easy to {hold} one-handed?
- Real tumbling: shards rotating relative to the box.
- A level select that shows which levels are won.

History (older versions, balance tables, playtests): `docs/history/bubble-glass.md`
