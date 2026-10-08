# Murmuration: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/murmuration.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## Moved from the notes at v9 (2026-10-08)

v8 header: Chapter 1 only, score = gates in the migration (max 23), board `ch1`; playtest (v8): https://claude.ai/artifact/Dmg9WeDyBJqfRirJuEAf2f. Chapter 1's nights are unchanged in v9 (all `nv: 1`; night 6 reproduces the table below exactly).

### Chapter 1 balance (v8 game, 60 seeds, win % at the night's dusk, median win time)

| # | lure60 | lure80 | rear100 | smart90 | brief target (lure60 / lure80 / smart90) |
|---|---|---|---|---|---|
| 1 | 98% (18 s) | 100% (11 s) | – | – | 98 / 100 / – |
| 2 | 95% (31 s) | 100% (21 s) | – | – | 94 / 100 / – |
| 3 | 90% (29 s) | 98% (19 s) | 97% (25 s) | 98% (20 s) | 92 / 96 / 100 |
| 4 | 72% (50 s) | 100% (27 s) | 97% (29 s) | 100% (25 s) | 70 / 100 / 100 |
| 5 | 97% (14 s) | 98% (11 s) | – | 100% (8 s) | 94 / 94 / – |
| 6 | 58% (53 s) | 93% (26 s) | 90% (22 s) | 92% (24 s) | 62 / 92 / 92 |

All within ±8 points: no night retuned. Night 6: lure bots lose 9-11 birds
on a win, tappers 1-3 (the edge punishes the lure, not the tap). Night 5
(recruits now simulated): ~90% of recruits end within sight of the flock
(212-221/240 on wins), no stall (win median 14 s vs 16 s unsimulated).

**Whole migration** (`--run`, 60 seeds; median flock at each dawn, runs
that got there):

| bot | n1 | n2 | n3 | n4 | n5 | n6 | roost | chapter cleared | gates |
|---|---|---|---|---|---|---|---|---|---|
| lure60 | 40 | 44 | 46 | 40 | 33 (56) | 40 (55) | 30 | 25/60 | 22 |
| lure80 | 40 | 44 | 48 | 40 | 35 | 41 | 31 | 53/60 | 23 |
| rear100 | 40 | 44 | 48 | 48 | 46 | 51 | 45 | 59/60 | 23 |
| smart90 | 40 | 44 | 48 | 47 | 47 | 53 | 49 | 58/60 | 23 |

The flock is a real health bar for lure-only play (nights 3-4 cost lure
bots ~8 birds each); tapping keeps it near the cap.

**Night 1 on a phone** (`gestures-murmuration.mjs --night 1`, 3 flocks per
gesture, noisy): holding 3 s, 110 ahead scares 10/40 (classic 24/40) and
moves the flock 46; dragging from ahead 23/40 scared (classic 22/40). The
ring is red 86-99% of a hold (classic 59-88%): at half spook fewer birds
panic, so more stay inside the ring. Watch `spook_s` / `lure_s` on night 1.

### Players at v8 (2026-10-08, `fetch-telemetry.mjs`)

v4: 7 players, 14 rounds, 36% won, longest player 556 s. v7: 1 player,
3 rounds (won 2, `spook_s` 8.5 of `lure_s` 29.9). 94-100% touch. Nobody
has reached 10 minutes.

## Moved from the notes at v8 (2026-10-08)

v7 header: "**v7** (2026-10-07, phone steering: visible lure ring + reach, red while spooking; no physics change) · v6 accessibility · playtest (v7): https://claude.ai/artifact/WM5YoxYKzykKTMw9nFuLQm". v4 = v3 gameplay (PR #10) plus `arcade:result` telemetry. v7: win = 15+ birds through each of 5 gates within `GATE_WINDOW` s, before `DUSK`; that night is now Classic night (NIGHTS row 0, unchanged).

### Phone steering (v7, `node scripts/gestures-murmuration.mjs`)

A phone tester (n=1) found the flock hard to direct. Gesture check at
390×760, real pointer timing, 3 flocks per gesture (v6 → v7 is draw-only,
so fear and movement match v6):

| Gesture | verb | ring red | scared /40 | toward |
|---|---|---|---|---|
| tap 80 ms behind flock | startle | – | 12 | 0 |
| press 150 ms still | startle | – | 1 | 0 |
| press 250 ms still | lure | 17% | 0 | 2 |
| hold 3 s, 110 ahead | lure | 86% | 28–34 | 34–42 |
| hold 3 s on the flock | lure | 80% | 40 | −33 |
| grab flock, drag 150 | lure | 79% | 32–35 | 94 |
| press 70 ahead, drag 150 | lure | 63% | 15–19 | 135–159 |

- Cause: the **lure spook**, not the timer. `LURE_SPOOK=0` → holding ahead
  scares 0/40 and moves the flock 79; `CROWD_FEAR=0` changes nothing. Birds
  dive through the lure at full pull, a few cross the 30 radius, contagion
  spreads it. A parked or grabbing finger scares the flock in ~1 s, and on
  v6 the lure (a 10-unit ring) was hidden under the fingertip, so the
  player saw birds ignore them with no cause.
- Fix (draw only): the lure ring sits at `LURE_SPOOK_R` (56 CSS px across at
  390 wide, past a fingertip) with a dark under-stroke, turns red with a
  faint fill while any bird is inside it, and a faint dashed circle shows
  `LURE_R`. The keys cursor's lure uses the same drawing.
- Rejected: softening the spook. A pull that fades inside 40–70 (birds
  settle around the finger) and/or a spook graded by distance put every
  bot at 99–100% by 45 s (v6: lure80 61%, smart90 71% @45) and erased the
  startle's edge. The spook is the game's main brake; changing it is a
  rebalance (with a shorter `DUSK`), not an input fix.
- `HOLD_MS` 200 kept: a 150 ms press meant as a lure startles, but away
  from the flock it touches ~1 bird, and the burst ring makes it legible.

### Round stats (v7, `arcade:result`)

`reason`: `night` or `scattered` (losses only). `stats`: `startles` (taps),
`lure_s` (s lure on), `spook_s` (s with birds inside the lure's spook ring,
i.e. ring red), `gates` (cleared), `birds` (left). Bots: `spook_s` isn't
measured yet; humans parking the lure show `spook_s` near `lure_s`.

### Accessibility (v6, `node scripts/a11y-audit.mjs murmuration`: 5 pass, motion partial by design, 3/3 runs)

- Gate count `n/15` from `fs(12)` (≥ 12.5 CSS px; 15 sky units at 360 px
  wide, was 10.2 px) on a dark backing (`rgba(13,11,22,0.85)`): lowest
  text 7.5:1 (was 3.5:1, white on the sunset sky). `#msg` on the same
  backing. Colour passes early and at dusk (51 s), cursor and lure showing.
- Keys (`// § keys`): arrows move a cursor while held (110 → 260 sky
  units/s over 0.6 s: slow to aim a startle, faster than a calm bird's 100
  to get ahead of the flock), hold Space lures toward it (key up = finger
  up), Enter or X startles at it, Enter after a round flies again. Same
  `lure` / `startle()` as the pointer. The cursor (dashed ring = startle
  reach) starts at 170, 430, clear of the flock: on the flock's edge,
  Space at once spooked it. Tab free; Space/Enter on a focused button
  press the button. A pointer press hides the cursor.
- Live region `#say` (hidden; `#msg` is `aria-hidden`, its text goes
  through `say()`): gate cleared with how many birds and gates left, flock
  size once a loss has held 1 s (adds "a gate needs 15" under 20), 30/15/5
  s of light, the result. Written once a frame from state, not from
  `step()` (one capture: `lastClear`).
- Reduced motion: read; the lure stops pulsing, the startle ring shows its
  reach and fades without spreading. Motion stays **partial**: with birds
  hidden the idle diff is 0.00%, so all of it (~0.9%) is the flock, which
  is the game (findings, "When the simulation is the motion…").
- Balance bots reproduce v5 exactly (no render `Math.random`); keys-only
  bot (cursor + Space, one X) cleared 1–2 gates in 4/4 runs.

### Balance (v3 gameplay, 300 seeds, ±3 pts; v7 unchanged: 150 seeds lure80 81%, smart90 88% @60)

| Bot | win @50 s | @60 s | @70 s |
|---|---|---|---|
| lure60 (brief's close leader) | – | 47% | 60% |
| lure80 (best lure-only) | 66% | 79% | 86% |
| rear100 (naive rear taps) | – | 84% | 88% |
| smart90 (smart startle, ~4 taps) | 81% | 89% | 94% |

Compare humans with `node scripts/fetch-telemetry.mjs --game murmuration`
(`docs/telemetry.md`).

### Player data (`fetch-telemetry.mjs`)

2026-10-05: v4 7 players, 14 rounds, 36% won (win median 33 s); v5 3
players, 4 rounds, 25%. Bots at 60 s: 47–89%. Still below every bot.

2026-09-28 (one tester, touch):

v4: 2 rounds (two sessions), **both lost at 60 s** (nightfall). Bots at
60 s: lure80 79%, smart90 89%, even lure60 47%. So the tester was slower
than the weakest bot twice, and 2 achievements so far. The second
biggest gap after Hot Iron. No feedback text, so we don't know whether it
was steering or the gate order. Candidate for a later revision: a longer
dusk for the first round, or check what share of gates the tester reached
(needs a `gates` field in `arcade:result`, not recorded now).

### v7 Open ideas / known limits

- Accessibility: done in v6 except motion (the flock). A keyboard player
  can't see where the next gate is relative to the cursor by ear; a
  "next gate up and left" line on demand (e.g. G) would help.
- Skilled startle play finishes only ~4–5 s sooner than skilled lure play.
  Tapping nearer gates, tapping more often, or leading further after a tap
  all tied or lost. Gate 3 gains nothing from startle.
- The lever: after a tap, scared birds ignore the lure for several seconds
  while fear decays (`FEAR_DECAY`, the lure/fear cutoff). Next revision
  should try letting mildly scared birds still follow the lure.
- Phone: one tester found steering hard on v6 (2026-10-07); v7 shows the
  spook. If players still park the lure, next try a rebalance that softens
  the spook (above) with a shorter `DUSK` to keep bots near 80–90%.
- Read v7's `stats` (below) before the next revision: if `spook_s`
  stays a large share of `lure_s` on losses, the ring isn't teaching.

- Story mode (16 nights, gate types, bird types, save channel, telemetry
  plan): `docs/games/murmuration-story.md`. Ideas only, nothing built.

History (older versions, balance tables, playtests): `docs/history/murmuration.md`


## Revision history

- v1 (PR #8): first version. v2 (PR #9): dusk timer, organic flocking,
  startle rebalance. v3 (PR #10): gate 4 into open sky, dusk 70 → 60 s.
- v4: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry. Bot numbers above still apply; compare humans with
  `node scripts/fetch-telemetry.mjs --game murmuration` (see `docs/telemetry.md`).
- v5: canvas label (role, verbs, device word). v6: accessibility (keys,
  live region, gate count 12.5 px+ on a backing, reduced motion read); no
  gameplay change, bots reproduce v5 exactly.
- v7: phone steering (visible lure ring, red while spooking); draw only.
- v8: Chapter 1, The Gathering (six nights, flock carried over); the v7
  night stays as Classic night with identical bot numbers.

## Gate 4 (v3 change)

Gate 4 was 90, 390 at 90°, hugging the left edge; v3 moved it to 230, 440 at 0°.

Gate 4 spots tried (win @50 s, lure80 vs smart90): (200,420) flat 70/80;
(200,400) 90° 65/72–79; (180,380) 60° 68/77; (160,430) 20° 66/80;
(230,440) flat 66/81 (chosen).

## Balance notes (v3)

Startle edge over best lure-only: +10 pts at 60 s, +15 at 50 s (v2: +7 / +11).
Median s/gate, lure80 vs smart90: 3.9/3.6, 4.7/4.5, 6.0/6.1, 7.1/6.2, 6.8/6.5.
Almost every loss at 60 s is nightfall (scattered: 6/300 lure80, 1/300 smart90).

## Notes before the split (2026-09-30)

Original header: "Current: **v3** (PR #10). Mechanics: **lure** (hold) and
**startle** (tap), sharing **fear per bird**. Win: 15+ birds through each of 5
gates, in order, within `GATE_WINDOW` s of each other, before night (`DUSK`).
Lose: night falls, or the flock drops below 15. 7 achievements (in
`games/games.json`); Swift = finish with `SPARE` s of light left."
