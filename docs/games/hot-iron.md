# Hot Iron: design notes

**v6** (2026-10-05, accessibility; v4 2026-09-29 last gameplay change) · playtest: https://claude.ai/artifact/3mZPmYr3oLFViotYbWxQhz ·
balance: `node scripts/balance-hot-iron.mjs 300`
**Heat** (hold) and **strike** (tap) share **temperature and thickness per
bar segment** (16 segments, thickness starts at 1). Win: every segment within
`TOL` of the dashed target. Lose: 3 cracks, or fuel gone with nothing left in
the working range. No timer. 5 achievements (in `games/games.json`).
Design rules from `docs/findings.md`: passive systems only remove heat/metal;
a strike must read the segment's and its neighbours' temperature; the budget
is fuel, not time.

## How it works

- Heat: holding (after `HOLD_DELAY_MS`; shorter = strike) adds
  `HEAT_RATE · gauss(σ = HEAT_SIGMA)` around the finger, burns 1 fuel/s.
  Conduction `COND`, radiation `COOL · T`; all divided by heat capacity
  `CAP_MIN + (1 − CAP_MIN) · th`. Above `T_BURN` a segment loses
  `BURN_RATE · (T − T_BURN)` thickness/s, down to `TH_MIN`.
- Strike: below `T_COLD` (black iron) it bounces ("Clang!", no crack, not
  counted). `T_COLD`–`T_WORK` (dull red) cracks. Otherwise it removes
  `th · (STRIKE_BASE + STRIKE_GAIN · u)` (u 0 → 1 cherry to white); the
  metal goes to the two neighbours by `softness(T) = clamp((T − FLOW_T0) /
  FLOW_SPAN)^FLOW_POW`. Neighbours' total softness under `FLOW_NEED`: less
  moves (both cold: none). Volume conserved. To thicken a segment, heat it
  and strike the neighbour; holding on a seam heats both.
- Colours: black < 0.25, dim dull red, then a jump to bright cherry at
  `T_WORK` (L* 28 → 50; v5 had ~1 there), orange 0.6, yellow 0.75, white
  0.9+. Each band also has a mark above the segment: none (black), grey
  crack (dull red), gold hammer (working), hammer + flame (white-hot).
  Legend strip brackets the working range (flashes after a bounce/crack).
- Flow preview: arrows under every working-range segment show where its
  metal would go if struck now (weight = share, hidden below 15%).
- Ready marks: gold hammer above every segment at or above `T_WORK`. First
  crack: "Dull red is too cool. Keep heating until it glows bright cherry and
  a hammer mark shows above it" (later: "Strike only where a hammer mark
  shows"), marks flash 3 s. A blow that thins a segment below the outline
  shows the thicken hint once a round.
- Targets: 4 profiles (Double taper, Leaf blade, Waisted bar, Chisel), in
  rotation, each shifted to the bar's volume and scaled to equal `TRANSPORT`
  (ranges ~0.75–1.25).

## Key constants (`games/hot-iron.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| N / SW | 16 / 23 px | PX_PER_TH | 64 px per thickness 1 |
| T_WORK / T_BURN | 0.38 / 0.9 | TOL | 0.1 |
| HEAT_RATE / HEAT_SIGMA | 0.55 / 0.7 seg | COND / COOL | 0.1 / 0.07 |
| CAP_MIN | 0.35 | TH_MIN | 0.15 |
| STRIKE_BASE / GAIN | 0.06 / 0.3 | FLOW_T0 / SPAN / NEED / POW | 0.3 / 0.45 / 0.6 / 2 |
| FUEL_MAX | 60 s of holding | THRIFTY_LEFT | 0.45 |
| T_COLD | 0.25 | BURN_RATE | 0.2 |
| TRANSPORT / PROFILE_AMP | 6 / 0.35 (cap, not reached) | HOLD_DELAY_MS | 170 |

## Layout (400×480)

Fuel gauge top left (tick at the Thrifty mark), 3 crack rings top right.
Anvil face in the middle, bar at y 215. Flow arrows at y 285, green
on-target dot under each segment (y 315). Heat legend at the bottom. Any
press in a segment's column counts.

## Balance (v4, ±3 pts)

Bots: `glow-red` (telemetry match: 1.5 s think, strikes at 0.27–0.47),
`glow-col` (strikes up to `T_WORK` + 0.02, pessimistic), `glow-hinted`
(glow-red until first crack, then waits for the hammer mark), `habit-nb`.

| Bot | v4 win | Notes |
|---|---|---|
| reader | 99% (DT/Leaf/Waist/Chisel 100/97/100/100) | 96 s, 38 strikes, 41% fuel left |
| reader 0.5× / 2× | 100 / 100% | |
| slow-hands / slow-early | 99 / 99% | |
| novice / novice-slow | 99 / 92% | |
| **glow-red** | **68%** (65/53/69/83) | losses: cracks, 97 s |
| **glow-col** | **36%** (39/23/21/63) | losses: cracks, 63 s |
| **glow-hinted** | **98%** | 1 crack (the one that teaches) |
| glow / glow-slow | 69 / 72% | |
| nosteer, glow-nosteer | 0% | cracked 98–100% |
| blind / blind-seam / habit-nb | 0% | fuel out 90–100% |
| idle | 0% | never ends |

Achievements (reader): Forged
99%, Clean Work 93%, Thrifty 28% at the 45% mark (40% → 52%, 50% → 8%),
Steer 100%. glow-hinted: Clean 21%, Thrifty 34%.

## Telemetry

`arcade:result`: `reason` on a loss (`cracks` or `fuel`). `stats`: `profile`
(0 Double taper, 1 Leaf, 2 Waisted, 3 Chisel), `off`, `err` (mean |th −
target| × 100), `strikes`, `cracks`, `clangs`, `stuck`, `hints`, `heat_s`,
`fuel` (s left), `burned` (%), `thin`, `first_input` (s, −1 if none).
`node scripts/fetch-telemetry.mjs --game hot-iron`. Reset posts no result.

## Accessibility (v6, `node scripts/a11y-audit.mjs hot-iron`)

All six pass (3/3), and contrast, colour and text pass on 2 scripted late
screens (every band on the bar, 2 cracks, flows, cursor, hint showing).
- Keys (`// § keys`): ← → move a segment cursor, one per press, held 0.3 s
  repeats 6 → 16 segments/s; Shift steps half a segment onto a seam (heat
  there warms both). Hold Space heats at the cursor (key up = finger up;
  heat follows the cursor); Enter or H strikes (`hammer` → `strike`, same
  as a tap; on a seam it says to step onto a segment). O / Shift+O next
  segment off the outline, S status. Enter plays again. Tab free;
  Space/Enter on a focused button press it. `stats.keys`: key heats + strikes.
- Live region `#say` (`#msg` aria-hidden, `say()` speaks): the cursor's
  segment when the arrows are up ("Segment 5: cherry, ready to strike,
  thickness 92, outline 110, 18 too thin. A blow sends 70% of its metal
  left, 30% right": the flow preview, nothing more), its band changing
  ("Segment 5 now cherry, ready to strike"), each blow ("Thinned segment
  5 … Metal went all left. 9 of 16 on the outline"; clang, crack + cracks
  left, stuck), fuel at 75/50/45 (Thrifty)/25/10%, the result.
- Reduced motion (`still()`): no shake, no sparks (their `Math.random`
  calls stay), ready marks and legend highlight steady instead of
  blinking, bounce ring still. The old pass was timing: sparks live < 1 s
  after a blow (0.00% idle 6.5 s later, any setting), but a white-hot bar
  throws them while it burns: 0.18% → 0.11% under the setting, = 0.11%
  with sparks hidden (3 runs): the rest is the bar cooling and burning.
- `#msg` on a dark backing; no canvas text. DOM text 13.6 px+, 6.9:1+.
- Bots identical to v5 (21 bots × 200 runs; old file twice first).
- KEYS_RESULT

## Player data

v3 (one new touch player, 5 rounds, all lost to cracks, ~40% of blows on
dull red) is in `docs/history/hot-iron.md`; v4 was made from it. v4 + v5
(2026-10-05): 5 players, 6 rounds, 0 wins, all lost to cracks (median 3
cracks in 19–38 strikes, 33–49 s, `hints` 3.5–4). Not enough rounds to judge v4 yet.

## Open ideas / known limits

- Accessibility: a real screen reader and keyboard player are the test.
  Black vs dull red differ little in lightness (L* 18 vs 21); the crack
  mark carries it.
- v4 telemetry to watch: cracks per strike (v3 ~40%), first-try wins, round
  length (v3 12–35 s), `hints`. If losses are still cracks within 30 s, add
  a warm-up first bar teaching one verb at a time (strike locked until a
  hammer mark has shown once, then a thicken step).
- glow-col (36%) is the pessimistic v4 reading; the marks should close the
  gap, but bots can't model reading them.
- If humans still lose to fuel, 70 s is the next step (novice-slow 25% →
  more with BURN 0.2; not yet swept).
- Not yet hand-played on a phone: can a player tell dull red from cherry
  under room light, and does a thumb below the bar feel natural?

History (older versions, balance tables, playtests): `docs/history/hot-iron.md`
