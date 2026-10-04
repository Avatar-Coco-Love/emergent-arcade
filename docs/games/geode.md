# Geode: design notes

**v1** (2026-10-04) · playtest: https://claude.ai/artifact/CS1Gj1PNQ3xcjPJbhAEdKn (private, republished each push) ·
balance: `node scripts/balance-geode.mjs 200`
Verbs: **seed** (tap), **warm** (drag the thermostat), **cleave** (hold),
sharing **strain per site, pool saturation σ and temperature T**. Endless
run of geodes; 3 lost geodes end it. Score: carats banked in the run.
6 achievements. Brief and why the build departs from it: `docs/history/geode.md`.

## How it works

- 217-site hex lattice (radius 8); the 7-site core starts grown. Step 0.1 s.
- **T** chases the thumb (`Ts`, plus any event offset) with a 2.5 s lag
  (the ring shows actual T). Growth speed `c = (1 - T/0.8)^2`; anneal is a
  bump from 0.35, peak 0.6, 0 at melt 0.82; above melt thin sites (≤ 3
  neighbours) dissolve, half an ion back to σ.
- **Auto growth**: each frontier site attaches at `G·σ·c·w(k)` per s
  (`w` 0.25 / 1 / 1.6 for 1 / 2 / 3+ neighbours), costing `ION` σ.
  **Seed** (tap, snaps to the nearest frontier site within 1.4 cells)
  costs `SEED_ION` and adds no speed strain.
- **Strain on attach** `F(k) + INHERIT·avg(neighbours) + SPEED·c (auto
  only)`. **Spread**: each site gains `SPREAD·max(0, maxNb - s - MARGIN)`
  per s. **Anneal** `-ANNEAL·a(T)·s` per s, weakening `ANNEAL_G` per geode.
- **Crack** at s ≥ 1: the ion breaks, neighbours +`SHOCK` (chains), loose
  pieces drop. A core crack shatters the geode (loss `shatter`).
- **Impurities** swap into an embedded site (4+ neighbours, ring ≥ 2,
  weighted to the rim): s ≥ 0.65, rising `IMP_RISE`/s, anneal can't touch
  it; at 1 it bursts with `IMP_SHOCK`. First at 25 s, then every
  `max(5, 14 - (g-1))` s ÷ `(1 + age·(1 + 0.1(g-1))/IMP_AGE)`. Pairs from
  geode 4. Only cleave removes them.
- **Cleave** (hold 450 ms on a non-core ion): removes it and anything
  loose, neighbours -0.2 strain, 0.6 s cooldown. An embedded vacancy
  refills cleanly (k = 5, F = 0).
- **Pool**: σ recharges `SIG_R·max(0.5, 1 - AGE·age)·(quota/46)^INC_POW`
  to cap 0.5. After `POOL_LIFE` s the geode seals: harvested at quota,
  else lost (`thin`). Harvest any time at mass ≥ quota: carats =
  `round(mass·(0.5 + clarity))`, clarity = `1 - min(1, mean s/0.5)`.
- **Geodes**: quota `36 + 10g` (cap 120). Events from geode 2 every 30-50 s,
  announced 3 s ahead, never the same twice: cold snap (-0.3 for 12 s), heat
  wave (+0.3), salt flush (geode 3+: σ halves, income ×0.5 for 10 s), double
  (geode 5+: snap then heat).

## Key constants (top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| T0 / T_TAU | 0.35 / 2.5 s | C_ZERO / C_POW | 0.8 / 2 |
| SIG_CAP / SIG0 / SIG_R | 0.5 / 0.5 / 0.08 | AGE / SIG_FLOOR / INC_POW | 0.003 / 0.5 / 0.5 |
| POOL_LIFE | 200 s | G / W_K | 0.4 / 0.25, 1, 1.6 |
| ION / SEED_ION | 0.06 / 0.18 | F_K | 0.30, 0.08, 0 |
| INHERIT / SPEED | 0.7 / 0.45 | SPREAD / MARGIN | 0.35 / 0.12 |
| ANNEAL / ANNEAL_G / MIN | 0.10 / 0.13 / 0.3 | MELT / MELT_R | 0.82 / 2 |
| SHOCK / IMP_SHOCK | 0.25 / 0.5 | IMP_S / IMP_RISE | 0.65 / 0.012 |
| IMP_FIRST / T0 / DT / MIN | 25 / 14 / 1 / 5 s | IMP_AGE / IMP_AGE_G / PAIR_G | 160 / 0.1 / 4 |
| Q0 / QG / QMAX | 36 / 10 / 120 | EV_OFF / EV_LEN / EV_GAP | 0.3 / 12 s / 30 (+0-20) s |
| HOLD_MS / CLEAVE_CD / RELIEF | 450 ms / 0.6 s / 0.2 | CHAMBERS | 3 |

## Layout (400×516 canvas + DOM strip and bar)

Top strip: geode, mass/quota bar (white tick = quota, bar runs to 1.5×),
◆ banked, 3 chamber gems (cracked when lost). Pool disc r 188 at (200, 244),
pitch 21; tint follows T; the ring around it drains with pool life. Motes =
σ. Thermostat strip y 450-508 (hit area 442-512): zones grow / anneal
(pulsing) / melt (hatched), labels under it, event arrow above it, thumb =
setpoint, ring = actual T. Below the canvas: status line (own strip), then
Harvest (shows `+carats ◆` when ready), clarity meter, sound toggle, New run.
Strain without colour: outline weight, one hatch line > 0.35, a cross
> 0.65, tremor > 0.7 (off with reduced motion). Impurities: dark gem, light
outline and a fuse arc to bursting. Sound (WebAudio, from the first gesture,
toggle persisted with try/catch): pentatonic bell per bond detuned by
strain×60 cents, a pad beating with mean strain, hiss with T, cleave tick,
crack thud, harvest arpeggio, shatter cluster, event tone. Every cue is
also drawn; the game is fully playable muted.

## Balance (`node scripts/balance-geode.mjs 200`)

Median geode reached (p10/p90), run minutes, carats banked, how geodes were lost.

| Bot | Geode | g1 won / ≥3 | Min | Carats | Losses |
|---|---|---|---|---|---|
| idle (never touches anything) | 2 (2/3) | 69 / 45% | 3.2 | 24 | shatter |
| spam (seeds anywhere) | 1 | 14 / 0% | 2.7 | 0 | shatter |
| cold (thumb at 0) | 1 | 0% | 0.5 | 0 | shatter |
| meltPark (0.9) | 1 | 0% | 10 | 0 | thin |
| noCleave (skilled, never cleaves) | 1 | 3 / 0% | 2.9 | 0 | shatter |
| annealPark (0.6, seeds + cleaves) | 4 | 100 / 100% | 15.8 | 254 | thin |
| noSeed | 6 | 100% | 19.0 | 397 | thin |
| timer (15 s cold / 15 s glow, never reads strain) | 8 (6/9) | 99 / 100% | 18.1 | 457 | shatter 51, thin 49% |
| cleaveSpam (also cleaves anything > 0.4) | 7 | 100% | 21.4 | 481 | thin |
| novice | 4 (2/4) | 97 / 87% | 13.9 | 139 | thin 89, shatter 11% |
| skilled | 7 (7/8) | 100% | 20.8 | 545 | thin |

Speed isn't the test (skilled, carats / geode): think 1.5 s 525 / 7;
think 1.5 + lag 0.8 s 468 / 7 (losses shift to 63% shatter). Banking at
1.5× quota instead of +10%: 723 (fast) and 521 (think 1.5, lag 0.8). All
four one-rule bots (idle, spam, cold, melt) lose by geode 2; anneal-park
pays in time (thin at geode 4); noCleave dies in geode 1 (impurity bursts).

Probe (thumb parked, nothing touched, 20 runs each): no still screen at
0, 0.35 or 0.6 (one 0.6 run of a tiny crystal); at 0.9 the crystal melts to
the core and nothing changes until the pool dies (a hint says why).

Novice: seeds kinks 70% of the time at half the skilled rate, nudges the
thermostat +0.1 when anything is red (> 0.7), drifts back below 0.3,
cleaves impurities only past 0.8 with 30% aimed one ion off, 3 wrong holds,
think 1.5 s, lag 0.8 s.

## Telemetry

`arcade:result` per geode: `level` (geode), `run`, `attempt`, `score`
(carats banked this run, own field), `reason` on a loss (`shatter` or
`thin`). `stats`: `mass`, `clarity` (%), `carats` (this geode), `cleaves`,
`seeds`, `cracks`, `peak_s` (peak strain ×100), `anneal_s` (s in 0.4-0.75).

## Player data

None yet.

## Open ideas / known limits

- Skilled runs are ~21 min (target 10-20): bots are optimistic and every
  lost geode lasts the full pool life (200 s). Check telemetry before
  shortening `POOL_LIFE` or adding steeper escalation.
- Skilled bots lose to `thin`, almost never `shatter`: they cleave
  perfectly. Human-paced bots (think 1.5 s, lag 0.8 s) shatter more. Holding
  to 1.5× quota beats banking at quota for every bot tried; the dilemma rests
  on human slips. If players never shatter, raise late-pool risk.
- `timer` banks 16% less than skilled: reading strain helps, but not by a
  lot. The skilled bot is a simple threshold policy.
- Achievements: Chip and Heal is near-certain (every impurity is
  embedded); Perfect Pitch ~10% for skilled, Cool Head ~1% for novice.
- Possible v2: impurities that land where strain is highest; a tilt option
  for temperature (rejected for v1: Terrace Garden owns tilt).

History (brief, tuning path, why each rule exists): `docs/history/geode.md`
