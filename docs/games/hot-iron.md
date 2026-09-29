# Hot Iron: design notes

Current: **v3** (playtest: https://claude.ai/artifact/3mZPmYr3oLFViotYbWxQhz). Mechanics: **heat** (hold) and
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
  0.75, white 0.9+. A legend strip at the bottom brackets the working range
  (the bracket flashes after a bounce or a crack), with the crack glyph
  under dull red.
- v2, black iron (below `T_COLD`, the colour of an unheated bar): a strike
  bounces off. Grey ring, "Clang!" message, no crack, no metal moved, not
  counted as a strike. Only dull red (`T_COLD`–`T_WORK`) cracks. The first
  playtest lost both rounds by tapping the cold bar in the first seconds.
- v2, flow preview: under every segment in the working range, arrows show
  where its metal would go if struck now (one per side, weight = share,
  hidden below 15%). The arrows read the same neighbour softness the strike
  uses, so steering still depends on heating the right seam; the player
  just sees the result instead of inferring it from two colours. Heating a
  thin segment makes both neighbours' arrows point into it, which is the
  "how do I thicken it" answer the tester couldn't find.
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
| CAP_MIN | 0.35 | TH_MIN | 0.15 |
| STRIKE_BASE / GAIN | 0.06 / 0.3 | FLOW_T0 / SPAN / NEED / POW | 0.3 / 0.45 / 0.6 / 2 |
| FUEL_MAX | 60 s of holding (v1 45) | THRIFTY_LEFT | 0.4 (v1 0.25) |
| T_COLD | 0.25 (new in v2) | BURN_RATE (v2) | 0.2 (v1 0.6) |
| TRANSPORT / PROFILE_AMP | 6 / 0.35 (cap, not reached) | HOLD_DELAY_MS | 170 |

## Layout (400×480)

Fuel gauge top left (tick at the Thrifty mark), 3 crack rings top right.
The anvil face is in the middle, with the bar on it at y 215. Flow-preview
arrows at y 285, and a green dot under each segment (y 315) shows it's on
target. Heat legend at the bottom. Any
press in a segment's column counts, so the finger needn't cover the colour
it's watching.

## Balance (v2, `node scripts/balance-hot-iron.mjs 300`, ±3 pts)

New bots: `novice` makes the first playtest's two mistakes before playing
as the reader: 3 taps on the cold bar where it looks most wrong, then
heats the segment that needs to grow for 2.5 s and strikes it.
`novice-slow` adds the slow-hands release (0.5 s).

| Bot | Win | By shape (DT/Leaf/Waist/Chisel) | Median win | Losses |
|---|---|---|---|---|
| reader (1×) | 100% | 100/100/100/100 | 101 s, 41 strikes, 35% fuel left | |
| reader 0.5× / 2× think | 100% / 100% | | 114 s / 100 s | |
| slow-hands / slow-early | 99% / 98% | | 123 s / 112 s | |
| **novice** | **97%** | 97/100/100/89 | 129 s, 20% fuel left | no fuel 3% |
| **novice-slow** | **73%** | 89/85/61/57 | 149 s, 9% fuel left | no fuel 27% |
| nosteer | 0% | | | cracked 98% |
| blind / blind-seam | 0% / 0% | | | fuel out 97% / cracked 85% |
| idle | 0% | | never ends | |

Novice with v1 constants: cracked 100%, 0% wins (novice-slow too), the
same as the tester. With v1 fuel and burn but v2's bounce: novice 4%,
novice-slow 0% (all fuel out). The grow guess burns metal away for good
(median 0.35 thickness lost at `BURN_RATE` 0.6), and 45 s left no slack
for a mistake. Sweep (novice / novice-slow, reader 99–100% throughout, all
blind bots 0% except where noted):

| FUEL_MAX | BURN_RATE | novice | novice-slow |
|---|---|---|---|
| 55 | 0.6 | 39% | 5% |
| 60 | 0.6 | 60% | 11% |
| 70 | 0.6 | 89% | 25% |
| 55 | 0.3 | 85% | 27% |
| 60 | 0.3 | 97% | 50% |
| **60** | **0.2** | **97%** | **73%** |
| 60 | 0.15 | 100% | 84% (blind and blind-seam 1%) |

The skilled bots now win almost always. The difficulty for them moves to
the achievements: Clean Work 84%, Thrifty 25% (at the raised 40% mark;
at 25% it would be 84%). Achievement rates for novice-slow: Forged 73%,
Clean 62%, Thrifty 0%.

## Balance (v1, superseded, `node scripts/balance-hot-iron.mjs 300`, ±4 pts)

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

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v1: 2 rounds, **both lost, in 12.6 s and 14.6 s** (bots: reader 87% wins,
median 99 s; every bot loss is fuel out, never cracks for the reader). Only
Burned Through unlocked. Rating 2★: *"It looks really cool and it's a great
concept. I am just struggling to play it, and I am unsure how to make the
blade thicker so that it can fit the outline."*

What that shows:
- A 45 s fuel budget can't run out in 13 s, so **both losses were 3 cracks**:
  strikes on metal below cherry, within the first few seconds. The
  mechanic the bots never do (strike before heating) is what ended both
  rounds. The goal text says "Hammer the bar", and a touch tap is a strike,
  so a first tap on the cold bar costs a crack.
- The first session had 90 s of play for a 13 s round, so the tester kept
  going on an unfinished round and burned a segment away (Burned Through).
  With the "how do I make it thicker" comment, the likely reading: they held
  heat on the thin part hoping it would grow. Thickening is indirect (strike
  the neighbour while the target is the hotter side) and wasn't discovered.
- The bots only model someone who already knows the rules. None models the
  first minute: tapping before heating, or heating the segment you want to
  grow. That is where the bot-human gap is.

What v2 did about it (see Balance (v2)): black iron bounces instead of
cracking (dull red still cracks); arrows under hot segments preview where
struck metal goes; a `novice` bot plays out both mistakes; fuel and burn
rate were set so it survives them. Not done: a guided first shape.

### Overnight, 2026-09-28 (a second player)

v2: 1 round, **won in 73 s** on a first try, 8 min after v2 went live,
with Forged, Clean and Thrifty (≥50% fuel left) in that round. Faster than
every bot median (reader 101 s, novice 129 s). It answers the open
question below (survive past 15 s, win at all) with a yes, for one player.
It may be the first tester on another device (a new browser ID can't tell).
Three achievements in one first round supports "harden the achievements,
not the round".

## Telemetry fields (v3)

Each `arcade:result` also carries (see `docs/telemetry.md`):

- `reason` on a loss: `cracks` (the 3rd crack) or `fuel` (fuel gone and
  nothing hot enough to strike).
- `stats`: `profile` (0 Double taper, 1 Leaf blade, 2 Waisted bar,
  3 Chisel), `off` (segments off the line), `err` (mean |thickness −
  target| × 100), `strikes`, `cracks`, `clangs` (taps on black iron),
  `stuck` (strikes with both neighbours cold, nothing moved), `heat_s`
  (seconds holding heat), `fuel` (seconds left), `burned` (% of the bar's
  metal burned away), `thin` (segments burned to the minimum),
  `first_input` (seconds to the first heat or strike, −1 if none).

`node scripts/fetch-telemetry.mjs --game hot-iron` prints losses by reason
and the median of each stat for wins and for losses. The Reset button
starts a new bar without posting a result, so abandoned bars only show up
as session time.

## Open ideas / known limits

- v2 is tuned to the novice bots, which model just two mistakes. Next
  playtest: does the tester survive past 15 s (telemetry: loss length),
  win at all, and read the arrows? If humans still lose to fuel, 70 s is
  the next step (novice-slow 25% → more with BURN 0.2; not yet swept).
- If v2 is too easy for returning players, harden the achievements, not
  the round: Thrifty at 50%, or a par on strikes.
- Reaction time matters less now (slow-hands 99% vs v1 62%), since the
  budget has slack.
- Steer the Metal is too easy for anyone who has learned the core idea.
  Could require a chain (the same metal pushed 3 segments in one heat).
- Idle play never ends, since there is no clock. That's fine for a puzzle,
  but telemetry only sees a round once it's won or lost.
- Not yet hand-played on a phone. Check: can a player tell dull red from
  cherry (the crack line) under room light, and does a thumb in the column
  below the bar feel natural?

## History

- v1: first version.
- v2: black iron bounces instead of cracking; flow-preview arrows; fuel
  45 → 60 s, burn rate 0.6 → 0.2, Thrifty at 40%. From the first playtest
  (two rounds lost to cracks in 13–15 s).
- v3: no gameplay change. Round results add `reason` and `stats` (above).
