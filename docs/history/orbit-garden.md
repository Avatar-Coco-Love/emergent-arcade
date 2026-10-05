# Orbit Garden: history

Older versions, superseded balance tables, playtest logs and rationale for
past revisions. Current design: `docs/games/orbit-garden.md`. Add new entries at the
top of the relevant section; sessions don't read this file by default.

## Player data before v8 (moved 2026-10-05)

v5: 2 rounds, 2 wins, both on a first try. One tester (touch) won in
**23 s**, faster than every bot (naive 32 s, perfect 35 s at a 1.5 s fling
gap), as the "fast play wins easily" idea predicted. A second player won in
**52 s** with all 4 achievements (First Bloom, Green Thumb, Full Sky,
Garden Complete). Both were never in danger, and that is why v6 was made.
No v6 data yet.

## Notes before the split (2026-09-30)

Original Balance table, with the v5 win column (superseded), and the
original header and player-data text.

# Orbit Garden: design notes

Current: **v6**. Mechanics: **place** (tap the sky: a planet) and **fling**
(drag up from anywhere: a seed from the launcher), sharing **planet mass**.
Place creates mass, landed seeds add it, mass sets gravity, and every fling
withers every planet by `WITHER_PER_FLING`. Win: 3 planets blooming
(mass ≥ `BLOOM_MASS`) at the same time. Lose: all 40 seeds used and none in
flight. 6 achievements (in `games/games.json`); Frugal = win with 15+ seeds
left.

Playtest (private artifact, v6): https://claude.ai/artifact/LgWCoWvU5hTLxUqGUDbWms


## Balance (v6, `node scripts/balance-orbit-garden.mjs 200`, ±3–4 pts)

Bots place 3 planets at the start (triangle: (110,320), (290,320),
(200,170)), then fling one seed every `gap` s. Aim is one of three kinds,
then Gaussian noise (σ in degrees; the same σ in % on power):
`search` tries drag vectors on the full predicted path (knows more than a
player can see); `preview` sees only the in-game dotted preview and extends
it in a straight line (the closest model of a human); `straight` drags
straight at the target at full power.

| Bot | aim | feed | gap | v5 win | **v6 win** | seeds used (wins) | time (wins) |
|---|---|---|---|---|---|---|---|
| perfect | search, σ 0 | lightest first | 1.5 s | 100% | 100% | 21 | 31 s |
| even2 | search, σ 2° | lightest first | 1.5 s | 96% | 64% | 30 | 45 s |
| even5 | search, σ 5° | lightest first | 1.5 s | 81% | 54% | 36 | 54 s |
| serial2 | search, σ 2° | one at a time | 1.5 s | 93% | 89% | 31 | 45 s |
| slow2 | search, σ 2° | lightest first | 3 s | 8% | 57% | 34 | 100 s |
| fast2 | search, σ 2° | lightest first | 0.5 s | | 96% | 29 | 14 s |
| naive | straight, σ 2° | lightest first | 1.5 s | 100% | **1%** | 39 | 58 s |
| naive5 | straight, σ 5° | lightest first | 1.5 s | 14% | 0% | | |
| preview2 | preview, σ 2° | lightest first | 1.5 s | | **100%** | 20 | 30 s |
| preview5 | preview, σ 5° | lightest first | 1.5 s | | **66%** | 30 | 45 s |
| pslow2 | preview, σ 2° | lightest first | 3 s | | 100% | 19 | 55 s |
| pfast2 | preview, σ 2° | lightest first | 0.5 s | | 66% | 33 | 16 s |
| close2 | search, σ 2°, tight cluster | lightest first | 1.5 s | 99% | 87% | 27 | 40 s |

Readings:
- Straight aim is dead (100% → 1%): you have to read the curve.
- Cadence: for preview aim, 3 s and 1.5 s win the same (100%), and spamming
  every 0.5 s drops to 66% (masses change while seeds are still flying). The
  search bot still gains from spam (96%): it picks long swing shots and
  lands a burst of them before the wither catches up. A human can't plan
  those without seeing the whole path, so it's a harness artifact, but
  watch for it in telemetry (very short won rounds).
- Skill spread: a precise preview reader wins 100%, a sloppy one (σ 5°) 66%.
  The bot reads the dotted line exactly, so humans should do worse.
- Preview length is a strong easing lever. At wither 0.11, σ 5° wins 36%
  with the 0.67 s preview and 66% with 1.2 s. The long preview plus wither 0.09
  gave σ 5° 83% and spam 99% (back to v5 ease), so we kept 0.11. The user
  found 0.11 fast and gravity high; this was their pick.
- WITHER_PER_FLING is steep: 0.09 → even2 92%, 0.11 → 64–67%, 0.13 → 42%.

Achievements (preview2): Green Thumb 100%, Frugal 79%, Gravity Assist 53%
(search bots 100%, since they choose swing shots). Full Sky is never
earned by these bots (they place only 3).


## Player data (2026-09-28: `fetch-telemetry.mjs`)

v5: 2 rounds, 2 wins, both on a first try. One tester (touch) won in
**23 s**, faster than every bot (naive 32 s, perfect 35 s at a 1.5 s fling
gap), as the "fast play wins easily" idea predicted. A second player won in
**52 s** with all 4 achievements (First Bloom, Green Thumb, Full Sky,
Garden Complete). Both were never in danger, and that is why v6 was made.
No v6 data yet.


## History (per-version summary)

- v1: first version (with per-game achievements). v2: cabinet support, win
  screen and aiming fixes. v3: cleanup pass (small bugs). v4: sharp
  rendering at screen resolution.
- v5: no gameplay change. Posts `arcade:result` when a round ends, and adds
  the `elapsed` round clock for it.
- v6 (difficulty): both v5 players won on a first try. Seeds are slower
  (FLING_POWER 2.6 → 1.8) and gravity is stronger (G 400k → 900k), so
  straight shots miss. Wither is per fling (0.11 per planet) instead of per
  second (0.06/s), so speed no longer beats it. The aim preview length is
  longer (PREVIEW_STEPS 40 → 70, ≈ 1.2 s) for more guidance on the curve.
  Updated howToPlay text.

