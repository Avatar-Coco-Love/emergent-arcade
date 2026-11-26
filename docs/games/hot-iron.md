# Hot Iron: design notes

**v7** (2026-11-26, depth pass: a run of commissions) · playtest: https://claude.ai/artifact/3mZPmYr3oLFViotYbWxQhz ·
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

## Commissions (v7, `// § commissions`)

A run: commission 1 is a practice Double taper (TRANSPORT 4) where a
dull-red blow only rings and warns (`warned`, no crack rings shown; Clean
Work needs 0 warnings). Then Chisel, Double taper, Waisted, Leaf,
Spearhead, Twin waist (TRANSPORT 6). From 8 on, endless: shapes in that
order, TRANSPORT + `ENDLESS_TRANSPORT` (0.3) per commission, amplitude cap
`ENDLESS_AMP` 0.45, refill `REFILL` 40 − `REFILL_DROP` 2 per commission,
down to `REFILL_MIN` 20. Fuel left carries over, start fuel = min(60,
left + refill). A loss retries the same commission with its start fuel
(Try again; or New run). Restart bar = retry, no result posted.
Score: commissions forged in the run (`score`, epoch 2). Achievements
Journeyman (5) and Master Smith (10).

## Balance (v7)

Single bar, each standard shape (`node scripts/balance-hot-iron.mjs 120`;
shapes DT/Leaf/Waist/Chisel/Spear/Twin): reader 100% all, 96 s; novice
100%; glow-hinted 100%; glow-red 58% (60/60/65/80/65/20: Twin waist is
the hard one, so it is commission 7).

Whole runs (`RUN=1 MAXJOB=20 node scripts/balance-hot-iron.mjs 40 …`;
3 losses on one commission = gives up):

| Bot | Forged median | Done 7 | Time to 7 | Done 10 |
|---|---|---|---|---|
| reader | 11 | 100% | 11 min | 100% |
| glow-hinted | 10 | 100% | 14.8 min | 73% |
| slow-hands | 9 | 93% | 13 min | 30% |
| glow-red | 6 | 30% | 19 min | 0% (ENDLESS 0.5) |

Endless wall is at 11–12 for the reader (refill falls below what a bar
burns). ENDLESS_TRANSPORT 0.5 put it at 10–11.

## Telemetry

`arcade:result`: `level` (commission), `run`, `attempt`, `score` (forged
so far), `reason` on a loss (`cracks` or `fuel`). `stats`: `profile` (0 Double
taper, 1 Leaf, 2 Waisted, 3 Chisel, 4 Spear, 5 Twin), `start_fuel`, `warned`, `off`, `err` (mean |th −
target| × 100), `strikes`, `cracks`, `clangs`, `stuck`, `hints`, `heat_s`,
`fuel` (s left), `burned` (%), `thin`, `first_input` (s, −1 if none).
`node scripts/fetch-telemetry.mjs --game hot-iron`. Restart bar posts no result.

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
- Reduced motion (`still()`): no shake or sparks, marks steady (details in history).
- `#msg` on a dark backing; no canvas text. DOM text 13.6 px+, 6.9:1+.

## Player data

v1–v6 (to 2026-11-26): about 13 players, ~18 rounds, 1 win; nearly all
losses to cracks, the v6 one in 6 s. Only rating: 2★, "unsure how to make
the blade thicker". Details in history.

## Open ideas / known limits

- Accessibility: a real screen reader and keyboard player are the test.
  Black vs dull red differ little in lightness (L* 18 vs 21); the crack
  mark carries it.
- v7 telemetry to watch: does commission 1 get won (level 1 win rate),
  `warned` on it, cracks on commission 2, levels reached per run. v6's one
  round was lost in 6 s to 3 cracks after 1 s of heat: the practice bar is
  the answer to that. If commission 2 still cracks out, lock strikes on
  bar 1 until a hammer mark has shown.
- glow-col (36%) is the pessimistic v4 reading; the marks should close the
  gap, but bots can't model reading them.
- If humans still lose to fuel, 70 s is the next step (novice-slow 25% →
  more with BURN 0.2; not yet swept).
- Not yet hand-played on a phone: can a player tell dull red from cherry
  under room light, and does a thumb below the bar feel natural?

History (older versions, balance tables, playtests): `docs/history/hot-iron.md`
