# Bubble Glass: design notes

**v7** (2026-10-05, accessibility; v5 levels 13, 14, 16, `score.epoch` 3) · playtest: https://claude.ai/artifact/BXC2MQc3e4rf6x2wPUxZVR ·
balance: `node scripts/balance-bubble-glass.mjs 8 [bots] [levels]` (compare runs with
`LOOK_MS=1e9`: hint search is wall-clock sliced)
Liquid-motion sand toy in a sealed box. Verbs: **turn** (drag, tilt opt-in, ← →),
**melt** ({hold} sand into glass; keys: hold Space at the cursor), **shatter** ({tap} glass; Enter/X). 21 levels, 3 chapters.

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
- Messages last 1.5 s + `MSG_MS_PER_CHAR`/char; `#msg` is a 2-line band above the board, nudged down ~60% into the free space, never rotating with tilt (v4). Melt/shatter hint ring is sky blue with a dark rim (gold blended into sand).
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

## Levels (ids permanent; `LEVELS` array; add, never rename)

21 levels: chapter 1 sand (1–5: first-turn, roof, the-plug, lid-and-plug,
hourglass), 2 wet and dry (6–12), 3 two bubbles (13–21). Per-level notes (verbs,
heat, design): `docs/history/bubble-glass.md`, "Levels". Maps must be exactly
24 rows (validate.mjs does not check; a 25-row draft was unwinnable).

## Accessibility (v7; audit 6 pass on default + 4 scripted screens, 2 runs)

- Keys (`// § keys`, outside the sim): ← → / A D turn as before. T switches
  the arrows to a cell cursor (A D still turn), moving against gravity, 1
  cell a tap, 12/s held, 24/s after 1 s; it stays on its box cell as the box
  turns. Hold Space = the pointer's `press` at the cursor
  (`pressHeld`, same delay; key up = finger up). Enter/X =
  `tapAt` (same reach, same confirm). G next shard, B bubble, H hint spot, I
  status, Enter next level. Tab free; Space/Enter on a focused button press it.
- Live region `#say` (`#msg` aria-hidden; `say()` also speaks). `watch()`
  after each frame: cell under the cursor once it stops (material, shard
  size, "3 above, 2 left of the bubble"), box angle once a turn ends, melt
  start / limit / size + heat on release, shatter (cells, where, "falls onto
  the bubble"), bubble stuck (0.7 s) / moving again, heat at ½, ¼, 10, hints
  with their place, the result. Once settled after a change (or bubbles
  still 3 s while sand creeps off the 8 main angles): each bubble, what is
  straight above it ("wall right above it") and the vent's offset.
- Without hue (L*, normal/deutan/protan): water 10, wall 31, grate 42/23
  checker, wet 39–47, glass 53–63 + white outline (was 84, inside sand), sand
  70–84, dust 89–95; vent 84/25 checker (was 81); melting shard 97/50 checker
  (was 79 orange). Bubble rim 98 solid / 81 long dash / 62 short dash, dark
  underlay. Cursor dark+white square with ticks: ≥ 4.7:1 on every material.
- Reduced motion (`still()`, decoration clock 0): glow, vent and hint pulse,
  chevrons, slowed rim, freed-bubble ring, `.nudge`. Scripted screens, 3 runs:
  decoration 0.11–0.22% → 0.00%; mid-pour 0.04–0.06% left = sand (0.00% hidden).
- No canvas text; DOM text ≥ 13.6 px, ≥ 7.1:1. Balance identical (old ×2,
  new). Keys-only bot (`#say` only): levels 1–3 won 5/5 (4: it turns
  before the lids).

## Telemetry

Per level `arcade:result`: `outcome` (loss `reason` `restart`/`switch`), `time`,
`level`, `level_id`, `run`, `attempt`; stats `turns`, `deg`, `melted`, `glass`,
`shattered`, `heat_left`, `stuck_s`, `hints`, `warns`, `keys` (v7: 1 if melt/shatter by keys), `first_input` (1 turn, 2 melt,
3 shatter, 4 nothing), `tilt`, `buried_s`, `out`, `merged`, `ch_t`, `chapter`; a
chapter's last win adds `score` and `board`.

## Balance and player data

v3 table, 10-minute check (hinted 10:39, reader 3:36), v5 table and v2 replay
(2 players, 14/14 wins): history. v6: 1 player (touch) won all 21, chapter 2 in
61 s, 3 in 111 s; melt unused on 13–19.

## Achievements

umbrella (30 grains on a shard over the bubble); breakout (win ≤4 s after shattering
a shard touching the bubble); cold-hands (win from level 3 with no melt); light-touch
(win from level 3 turning <270°); glassblower (all 21 won, `localStorage`);
big-bubble (merged bubble leaves, v3); clockwork (chapter finished on the clock, v3).

## Open ideas

- Keys turn by holding, so a keys player lands off the 8 main angles (bot: 237°,
  282°), where sand creeps for long. An eighth-turn key (snap to 45°)?
- Playtest: does anyone play a whole chapter? `fetch-telemetry.mjs`, chapter boards.
- HUD bar wraps to two lines on 390 px phone while the chapter clock shows.
- Sieve, sand-timer, dust-door, shared-sand, twins are 4–5 s for the reader; lengthen
  the skilled route. Sand-timer lost level 5's melt value (no-melt 5 s).
- Level 2 in tilt, real phone: is the lid ring easy to {hold} one-handed?
- A level select that shows which levels are won.

History: `docs/history/bubble-glass.md`

