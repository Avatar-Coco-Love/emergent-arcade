# Murmuration: design notes

**v9** (2026-10-08): Chapter 2, The High Pass (nights 7-11), and a scene per
chapter. Chapter 1 (v8) unchanged. Playtest (v9): PLAYTEST_LINK ·
balance: `node scripts/balance-murmuration.mjs 40 lure60,lure80 --night N`,
`… --run --chapter 2`, `… --check` · ideas ledger: `murmuration-story.md` ·
history (v1-v8 tables, v8 players): `docs/history/murmuration.md`.

## How it works

Nights in chapters (`NIGHTS` rows, `CHAPTERS`, `// § nights`); each night:
`need` birds through every gate in order, within `window` s of each other,
before `dusk`. A lost night isn't replayed: the run moves on with the tally
`after = min(55, alive − 3 × gates missed + 4 if all cleared)`; next dawn
needs `after ≥` next `need`, else "The migration ends". Start 40, cap 55,
fear resets each dawn, survivors keep quirks (`sep`, `turn`).

- **Chapters**: 1 The Gathering (nights 1-6, scene `marsh`, board `ch1`),
  2 The High Pass (7-11, scene `pass`, board `ch2`). A chapter's first dawn
  card offers the other chapter and Classic night, so chapter 2 can be
  flown on its own (40 birds). Clearing or finishing chapter 1 offers "Fly
  on to Chapter 2" with `max(40, flock)` and the same run id. "Start over"
  restarts the current chapter.
- **Crags** (`crags: [{x, y, r}]`): calm birds swerve within `CRAG_M` 36 of
  the rock, force `CRAG_TURN` 30 × (1 − (fear/PANIC)³) × depth, plus a
  sideways slide; panicked birds don't swerve. A bird inside `r` is lost
  (`lost_rock`, a feather burst). First try (linear in fear, like the
  edges, 24/30): bots lost 10-20 birds a night on rocks, mostly at fear
  0.25-0.5 from crowding and the lure ring, so the cube keeps half-scared
  birds steering.
- **Wind** (`wind: [{y0, y1, v}]`): every bird drifts `v` units/s sideways
  inside the band (eases in over 15 units). Drawn as a band, streaks and
  chevrons (streaks still under reduced motion).
- **Calm gates** (`calm: true`): only birds with fear < `SCARED` count;
  others crossing add to `calm_rej`. Ringed posts, dotted pale-blue line,
  "calm n/need" label, announced when it becomes the active gate.
- **Scenes** (`SCENES`): sky colours per chapter plus land in the bottom
  ~120 units (marsh: tree line, water shimmer, reeds; pass: two mountain
  ranges, snow caps). Classic keeps the plain v7 sky.
- **Run state**: `run = { v: 1, id, night, flock, gates (this chapter), q }`,
  ≤ 667 bytes; `restoreRun` validates night 1-11 and gates per chapter.

## Nights (numbers in the file, `NIGHTS`; all `nv: 1`)

| # | id | need | half | window | dusk | gates | new thing |
|---|---|---|---|---|---|---|---|
| 1-6 | Chapter 1 | 12-13 | 50-70 | 4-5 | 40-60 | 3-4 | lure, startle, recruits, edges (history) |
| 7 | crags | 13 | 60 | 4.5 | 55 | 4 | 4 crags (r 22-30) |
| 8 | crosswind | 13 | 55 | 4.5 | 45 | 4 | wind y 220-360, +45 |
| 9 | still-air | 12 | 65 | 5 | 55 | 3 calm | 5 recruits at (90,250) |
| 10 | the-gorge | 13 | 60 | 4.5 | 60 | 4 | 4 crags + wind y 120-250, −40 |
| 11 | the-high-pass | 13 | 55 | 4 | 60 | 4 (last calm) | 4 crags + wind y 180-300, +40 |

## Balance (v9, 40 seeds, win % at the night's dusk, median win time)

Humans beat the bots in v8: 2 players won all 12 nights first try; night 6
in 33 s losing ~9 (lure60 58% / 53 s, lure80 93% / 26 s). So chapter 2 is
tuned with **lure80 as the typical human**, not lure60.

| # | lure60 | lure80 | rear100 | smart90 | rocks lost (win, lure80/smart90) |
|---|---|---|---|---|---|
| 7 | 73% (43 s) | 85% (33 s) | 70% | 83% (34 s) | 0 / 0 |
| 8 | 78% (27 s) | 88% (25 s) | 85% | 88% (21 s) | – |
| 9 | 10% (93 s) | 75% (33 s) | 68% | 70% (36 s) | – |
| 10 | 55% (47 s) | 63% (40 s) | 83% | 78% (37 s) | 0 / 0 |
| 11 | ~15% | 68% (45 s) | ~68% | 80% (41 s) | 1 / 2 |

Night 11 at dusk 65 was 78/83; 60 chosen for a test night. Night 9's
lure60 collapse is the lesson (a close lure keeps the ring red, so birds
aren't calm at the gate): watch human `spook_s` and `calm_rej` there.

**Whole chapter 2** (`--run --chapter 2`, 40 seeds; median flock at each
dawn): lure80 40 · 40 · 35 · 35 · 30 → 25, cleared 14/40, gates 17/19;
smart90 40 · 43 · 40 · 44 · 38 → 32, cleared 23/40; rear100 14/40; lure60
2/40 (gates 10). Chapter 1 for comparison: lure80 53/60, smart90 58/60.

## Score, telemetry (one `arcade:result` per night, `// § telemetry`)

Score: gates cleared so far **in the chapter** (`score`, board `ch1` or
`ch2`, max 23, higher, epoch 2 unchanged: chapter 1 means the same;
`wins: false`). Classic posts no `score`/`board`.

`outcome`, `time`, `level` 1-11 (classic: none), `run` (id per migration,
kept into chapter 2), `attempt`, `reason` on losses (`night`, `scattered`).
`stats` (15): `gates`, `birds`, `flock0`, `startles`, `lure_s`, `spook_s`,
`lost` (all birds lost, rocks included), `lost_pan` (off the sky in
panic), `lost_rock`, `light_left`, `scared_pk`, `cohesion`, `tap_back` /
`tap_side` / `tap_front`. Extras: `nv`, `night_id`, `gate_t`, `idle_s`,
`first_in_s` + `input`, `spook`, `calm_rej` (nights with a calm gate);
migration: `score`, `board`, `ch`, `flock_end`, `run_over`,
`chapter_done` (a chapter's last night). `fetch-telemetry.mjs --pool`
pools nights 1-6 across v8 and v9 (same `nv`).

## Achievements (13; all 7 old ones still earnable on Classic)

`first-gate` · `flock-home` · `no-bird-left` · `soft-touch` ≤ 3 startles
(startle nights) · `swift` ¼ of the dusk left · `last-light` < 5 s left ·
`chain-panic` · `gentle-hand` · `gathered` / `edge-dancer` (night 6) ·
v9: `sure-wings` a crag night cleared with no rock losses · `into-the-wind`
a wind night cleared losing ≤ 2 · `high-pass` clear night 11.

## Accessibility (`a11y-audit.mjs murmuration`: 6 pass)

Cards: `role="dialog"`, text ≥ 12.8 px on a dark backing, announced via
`#say`, focus on the main button after the 1 s lock; the two secondary
buttons sit side by side. The audit's colour check counts anti-aliased
card text: a third stacked button plus the longer dawn line pushed it
over 0.5% (protan, text grey vs sunset pink) — fixed by the side-by-side
row and the shorter "40 birds · 4 gates × 12 birds · 45 s" line. Calm
gates are told by post shape and label, not colour. Keys: arrows, hold
Space, Enter/X startles (nights 3-11 and Classic).

## Shared constants (`games/murmuration.html`)

| Const | Value | Const | Value |
|---|---|---|---|
| FEAR_DECAY | 0.12/s | CONTAGION / CONTAGION_KEEP | 4.0 / 0.85 |
| PANIC / SCARED | 0.75 / 0.25 | CROWD_R / CROWD_N / CROWD_FEAR | 12 / 5 / 0.1 |
| LURE_ACCEL / LURE_R / LURE_FULL | 160 / 150 / 90 | LURE_SPOOK_R | 30 |
| STARTLE_R / _FEAR / _PUSH | 70 / 0.6 / 330 | CRAG_M / CRAG_TURN | 36 / 30 |

## Open ideas / risks

- Feedback behind v9 (2 players, 2026-10-08): "smooth, birds easy to
  guide, wants obstacles, too easy" and "nights too similar". Check after
  3+ players: chapter 2 first-try win rate per night vs lure80, and
  whether chapter 1 should get harder (bump those nights' `nv`).
- Night 9 may be harsh for close-lure players; if first tries there fail
  with high `calm_rej`, widen `half` or lengthen `dusk` (bump `nv`).
- Bots: lure ahead with crag sidestep and an upwind offset; nobody
  measured a phone thumb in wind yet (`gestures-murmuration.mjs` has no
  wind). Watch `lost_rock` by night.
- Chapter 3 ledger (`murmuration-story.md`): hawk, fear gates, bird types,
  storm. Save/load in the gallery is still not built; chapters can be
  flown on their own meanwhile.
