# Murmuration: design notes

**v8** (2026-10-08): Chapter 1, The Gathering. Brief: `murmuration-chapter1.md`;
later chapters: `murmuration-story.md`. Playtest (v8): https://claude.ai/artifact/Dmg9WeDyBJqfRirJuEAf2f ·
balance: `node scripts/balance-murmuration.mjs 60 lure60,lure80 --night N`,
`… --run`, `… --check` · history (v1-v7, phone steering, v6 a11y):
`docs/history/murmuration.md`.

## How it works

The game opens on night 1's dawn card (Fly · Classic night). Six nights in
a row (`NIGHTS` rows 1-6, `// § nights`); each night: `need` birds through
every gate in order, within `window` s of each other, before `dusk`. Lost
night: the night falls or the flock drops under `need`. No replay of a
lost night: the run moves on with the flock tally.

- **Tally** (`tallyNight`): `after = min(55, alive − 3 × gates missed + 4 if
  every gate cleared)`. Next dawn needs `after ≥` next night's `need`, else
  "The migration ends". After night 6 always the chapter card ("Chapter
  complete" if cleared, else "The flock lands short of the roost").
- Start flock 40, cap 55; fear resets each dawn; survivors keep their quirks
  (`sep`, `turn`), new birds draw their own. A flock above 40 starts in a
  patch scaled by √(n/40).
- Nights 1-2: no startle (a press lures at once, no `HOLD_MS`; X/Enter
  ignored). Night 5: 4 recruits near (165,320), plain calm birds (`recruit:
  true`) that join by flocking; `Math.random` is drawn for them only there.
- **Classic night** (row 0, v7's night): no carry-over, tally or score.
  Bots reproduce v7 exactly (150 seeds: lure80 81%, smart90 88% @60).
- **Run state** (`// § run`): `run = { v: 1, id, night, flock, gates, q }`
  (q: quirks, survivors first), JSON-safe, ≤ 667 bytes in `--check`.
  `serializeRun()` / `restoreRun(o)` (validates, rejects junk) start every
  night; the gallery save/load PR will call them for "Continue".
- `AB_SPOOK = false`: if set, odd run ids fly night 1 at full spook.

## Nights (numbers in the file, `NIGHTS`)

| # | id | startle | need | half | window | dusk | spook | gates |
|---|---|---|---|---|---|---|---|---|
| 0 | classic | on | 15 | 55 | 4 | 60 | 0.9 | 5 |
| 1 | dusk | off | 12 | 70 | 5 | 45 | 0.45 | 4 |
| 2 | second-flight | off | 13 | 65 | 4.5 | 50 | 0.65 | 4 |
| 3 | first-tap | on | 13 | 60 | 4.5 | 60 | 0.9 | 4 |
| 4 | open-sky | on | 13 | 55 | 4 | 60 | 0.9 | 4 |
| 5 | breather | on | 12 | 65 | 5 | 40 | 0.9 | 3 + 4 recruits |
| 6 | the-edge | on | 13 | 50 | 4 | 60 | 0.9 | 4 |

All `nv: 1`. Bump a night's `nv` when retuning it (telemetry lines split by it).

## Balance (v8 game, 60 seeds, win % at the night's dusk, median win time)

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

## Score, telemetry (one `arcade:result` per night, `// § telemetry`)

Score: gates cleared so far in the migration (`score`, board `ch1`, max
23, higher, epoch 2; `wins: false`). Classic posts no `score`/`board`
(`scores.js` drops a result with no number).

`outcome`, `time` (night clock), `level` 1-6 (classic: none), `run` (id per
migration; classic: per round), `attempt` (starts of this night this page
session), `reason` on losses (`night`, `scattered`).

`stats` (14): `gates` cleared, `birds` alive at the end, `flock0` alive at
dawn (with recruits), `startles`, `lure_s`, `spook_s` (s with the ring red),
`lost` (birds off the sky), `lost_pan` (of those, fear ≥ `PANIC`),
`light_left` (0 on a loss), `scared_pk` (peak % of birds ≥ `SCARED`),
`cohesion` (mean nearest-neighbour distance, every 0.5 s), `tap_back` /
`tap_side` / `tap_front` (tap vs the main cluster's heading: cos < −0.5,
between, > 0.5).

Extras: `nv`, `night_id`, `gate_t` (s at each gate cleared), `idle_s` (no
lure and no arrow held), `first_in_s` and `input` (`touch` or `keys`;
both left out if no input), `spook` (the night's `LURE_SPOOK`); migration
only: `score`, `board`, `flock_end` (after the tally), `run_over` (0/1),
`chapter_done` (night 6: 1 if cleared). Read with `fetch-telemetry.mjs`
(lines by level and `nv`, medians of extras).

## Achievements (per night; all 7 old ones still earnable on Classic)

`first-gate` a gate · `flock-home` every gate of a night · `no-bird-left`
none lost that night · `soft-touch` ≤ 3 startles on a cleared night with
startle (not nights 1-2, where it would be free) · `swift` ¼ of the dusk
left (15 s on Classic) · `last-light` < 5 s left · `chain-panic` as
before · `gentle-hand` 3+ gates, no startles, `lure_s` ≥ 10, `spook_s` < 2 ·
`gathered` clear night 6 · `edge-dancer` clear night 6 losing ≤ 2.

## Accessibility (`a11y-audit.mjs murmuration`: 6 pass)

Cards are a `role="dialog"` with DOM text ≥ 12.8 px on a dark backing,
announced in full through `#say`, still (no animation); the main button
takes focus once the 1 s lock after a night lifts (Enter or Space presses
it anywhere), and focus leaves with the card, so Space lures again. Dawn
cards show the keys line on a fine pointer or once keys were used.
Motion now reads **pass** only because the game opens on a still card; in
play the flock is the motion, as in v6 (partial by design). Keys: arrows,
hold Space, Enter/X startles (nights 3-6 and Classic).

## Shared constants (`games/murmuration.html`)

| Const | Value | Const | Value |
|---|---|---|---|
| FEAR_DECAY | 0.12/s | CONTAGION / CONTAGION_KEEP | 4.0 / 0.85 |
| PANIC / SCARED | 0.75 / 0.25 | CROWD_R / CROWD_N / CROWD_FEAR | 12 / 5 / 0.1 |
| LURE_ACCEL / LURE_R / LURE_FULL | 160 / 150 / 90 | LURE_SPOOK_R | 30 |
| STARTLE_R / _FEAR / _PUSH | 70 / 0.6 / 330 | MIN_SPEED / CALM_MAX / PANIC_EXTRA | 45 / 100 / 140 |

## Players (2026-10-08, `fetch-telemetry.mjs`)

v4: 7 players, 14 rounds, 36% won, longest player 556 s. v7: 1 player,
3 rounds (won 2, `spook_s` 8.5 of `lure_s` 29.9). 94-100% touch. Nobody
has reached 10 minutes.

## Open ideas / risks

- A migration is 4-6 min of night clock (bots: 2-4 min): under the 10-min
  target. Chapters 2-3 and replay are what get there.
- Half spook on night 1 may make night 2's 0.65 feel like a step: compare
  `spook_s` by level.
- Night 4 takes lure-only players ~50 s of 60 and ~8 birds: the first
  real squeeze. If first-try losses pile up there, lengthen its dusk.
- Recruits count in the tally while alive even if they never join.
- Later: a per-night replay picker, a "next gate" line on demand (G),
  stars per night from `spook_s`.
