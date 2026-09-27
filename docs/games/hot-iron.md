# Hot Iron: design notes

Current: **v1** (playtest: PLAYTEST_LINK). Mechanics: **heat** (hold) and
**strike** (tap), sharing **temperature and thickness per bar segment**
(16 segments, thickness starts at 1). Win: every segment within `TOL` of the
dashed target. Lose: 3 cracks, or fuel gone with nothing left in the working
range. No timer. 5 achievements (in `games/games.json`).

Built to satisfy all three entries in `docs/findings.md`:

- **Passive systems must lose something.** Radiation always removes heat,
  and burning only removes metal. Nothing passive adds heat or metal. The one
  feedback loop (thin metal heats faster, burns thinner) only runs while the
  player holds heat.
- **A verb only shares state if success needs to read it.** A strike reads
  the struck segment's temperature (crack below cherry, and how much it
  thins) and its neighbours' temperatures (where the metal goes). Bots that
  ignore colour win 0% (blind, blind-seam), and so does a bot that reads the
  struck segment but not the neighbours (nosteer).
- **A decay rate must not turn it into a speed test.** The budget is fuel
  (seconds of holding), not time. Sweeping the reader's think time gives
  79/87/84% at 0.5×/1×/2×.

## How it works

- Heat: holding (after `HOLD_DELAY_MS`; a shorter press is a strike) adds
  `HEAT_RATE · gauss(σ = HEAT_SIGMA segments)` around the finger and burns
  1 fuel per second. Conduction `COND` works along the bar. Radiation is
  `COOL · T`. Every term is divided by heat capacity `CAP_MIN + (1 − CAP_MIN) · th`,
  so thin metal heats and cools faster. Above `T_BURN` a segment loses
  `BURN_RATE · (T − T_BURN)` thickness per second, down to `TH_MIN`.
- Strike: below `T_WORK` it cracks. Otherwise it removes
  `th · (STRIKE_BASE + STRIKE_GAIN · u)`, where u runs 0 → 1 from cherry to
  white. The metal goes to the two neighbours in proportion to
  `softness(T) = clamp((T − FLOW_T0) / FLOW_SPAN)^FLOW_POW`. If the
  neighbours' total softness is under `FLOW_NEED`, less metal moves (both
  cold: nothing moves). Volume is conserved.
- Steering: holding on the seam between donor and receiver heats both, and
  the far neighbour gets less. `FLOW_POW = 2` lets the hotter neighbour take
  most of the metal. With linear softness, metal sloshed back to the segment
  just struck, and chains stalled.
- Colours (the only temperature display): black < 0.25, dull red, cherry
  at 0.45–0.47 (a deliberate step at the crack line), orange 0.6, yellow
  0.75, white 0.9+. A legend strip at the bottom brackets the working range.
- Targets: 4 profiles (Double taper, Leaf blade, Waisted bar, Chisel), in
  rotation. Each is shifted to the bar's volume, so metal conservation makes
  every one reachable. Each is scaled so the same amount of metal has to
  move (`TRANSPORT`, the sum over seams of the excess that must cross it),
  giving ranges of about 0.75–1.25. The first draft had a linear Spike that
  needed about twice the transport of the others (0% for the reader on a
  tight budget). Waisted bar replaced it.

## Key constants (`games/hot-iron.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| N / SW | 16 / 23 px | PX_PER_TH | 64 px per thickness 1 |
| T_WORK / T_BURN | 0.45 / 0.9 | TOL | 0.1 |
| HEAT_RATE / HEAT_SIGMA | 0.55 / 0.7 seg | COND / COOL | 0.1 / 0.07 |
| CAP_MIN | 0.35 | BURN_RATE / TH_MIN | 0.6 / 0.15 |
| STRIKE_BASE / GAIN | 0.06 / 0.3 | FLOW_T0 / SPAN / NEED / POW | 0.3 / 0.45 / 0.6 / 2 |
| FUEL_MAX | 45 s of holding | THRIFTY_LEFT | 0.25 |
| TRANSPORT / PROFILE_AMP | 6 / 0.35 (cap, not reached) | HOLD_DELAY_MS | 170 |

## Layout (400×480)

Fuel gauge top left (tick at the Thrifty mark), 3 crack rings top right.
The anvil face is in the middle, with the bar on it at y 215. A green dot
under each segment shows it's on target. Heat legend at the bottom. Any
press in a segment's column counts, so the finger needn't cover the colour
it's watching.

## Balance (v1, `node scripts/balance-hot-iron.mjs 300`, ±4 pts)

Bots act in human time: 0.5 s think between actions, 0.25 s late releasing
a hold, colour read with ±0.03 noise, 3% mis-taps onto a neighbour.

| Bot | Win | By shape (DT/Leaf/Waist/Chisel) | Median win | Losses |
|---|---|---|---|---|
| reader (1×) | 87% | 85/80/85/97 | 99 s, 39 strikes, 15% fuel left | no fuel 13% |
| reader 0.5× think time | 79% | 73/69/75/99 | 109 s | no fuel 21% |
| reader 2× think time | 84% | 83/75/89/89 | 95 s | no fuel 16% |
| slow-hands (0.5 s release) | 62% | 55/64/60/68 | 114 s | no fuel 38% |
| slow-early (same, lets go early) | 68% | | 108 s | no fuel 30% |
| nosteer (ignores neighbours' colour) | 0% | | | cracked 94% |
| blind (1.5 s heat, 2 strikes, most-off segment) | 0% | | | fuel out, burnt 100% |
| blind-seam (reader's targeting, fixed rhythm) | 0% | | | cracked 95% |
| idle | 0% | | never ends (no timer) | |

Reachability: with `FUEL_MAX=200` the reader wins 100% of all four shapes
(about 40 s of fuel used at every rate).

Achievement rates (reader): Forged 87%, Clean Work 73%, Thrifty 13%, Steer
the Metal 100% (the reader's whole method), Burned Through 0% (blind 100%).

Tuning path:
- Heat too weak at first (HEAT 0.6, COND 0.5): nothing got past cherry.
- HEAT 1.0 went cherry → white in about 0.5 s. A 0.5 s release dropped the
  reader from 84% to 3%, so heating was slowed to 0.55.
- STRIKE_GAIN 0.2 with the original amplitudes needed 80+ strikes and
  170 s. Equal transport (6) and GAIN 0.3 bring it to about 40 strikes.
- COOL 0.15 made slow thinkers use about 20% more fuel (88% → 52% at 0.5×
  on the same budget). At COOL 0.07 and COND 0.1, fuel used is the same at
  all rates.

## Open ideas / known limits

- Reaction time still matters: every hold costs its release lag in fuel
  (62% at a 0.5 s release). Players likely learn to let go early (the bot
  that does recovers only +6). If playtests show frustration, try slower
  heating or a longer fuel budget, and watch the think-time sweep.
- Thrifty was going to be "half the fuel left". The reader needs about
  40 s of 45, so it's a quarter (13% of reader wins). A human who heats a
  longer stretch and strikes more per heat may beat the bot.
- Steer the Metal is too easy for anyone who has learned the core idea.
  Could require a chain (the same metal pushed 3 segments in one heat).
- Idle play never ends, since there is no clock. That's fine for a puzzle,
  but telemetry only sees a round once it's won or lost.
- Not yet hand-played on a phone. Check: can a player tell dull red from
  cherry (the crack line) under room light, and does a thumb in the column
  below the bar feel natural?

## History

- v1: first version.
