# Rail Sorting Yard: design notes

**v1** (2026-09-30) · playtest: PLAYTEST_LINK (private, republished each push) ·
balance: `node scripts/balance-rail-yard.mjs [runs=20] [bots] [level ids]`
Turn-based shunting puzzle. Verbs: **switch** (drag a lever, or {tap}) and
**flick** (drag a car along its track; drag length = speed). Shared state: a
rolling car's **speed**: the flick sets it, the route the switches pick
drains it, what's left at impact decides couple / touch / bounce.
10 levels in 2 chapters, 12 achievements. Score: yard points over the run.

## How it works

- Tracks are polylines on a grid; one cell = one car length (`buildYard`).
  A cell with 3 neighbours is a switch: stem alone on side 0, legs on side
  1 (leg 0 = its own track, "straight"). Loose ends are buffer stops.
- State: `Uint8Array`, one byte per cell (car type | coupling bit per
  neighbour << 3) plus one per gate (0 open, 1 used this flick, 2 spent).
  Switch settings are not state: they're free, so the solver branches.
- Flick car c toward a side at speed v: it lets go of the car coupled
  behind it and moves with every car coupled in front (the cut). The lead
  pays the next cell's cost (`F_RAIL`, `F_GRAVEL`) or stops.
- Meeting a car: impact < `C_MIN` touches; round vs square couplers, or
  impact > `C_MAX`, bounce (the cut reverses and rolls at `BOUNCE_V`);
  else couple, if that coupler end is free (a car on a switch couples to
  one leg only). Buffers and closed gates: impact ≤ `C_MAX` stops.
- Facing switches route by the lever; trailing moves pass either way; a
  coupled train follows its couplings.
- Gates sit on an edge: one-way (blue) passes `from → to` only; 1×
  (amber) passes one way, then drops once nothing straddles the gateway
  (red bar). Every car of a cut must pass every gate edge it crosses.
- Win: the departure track's cars, read from its buffer, equal
  `goal.seq`, all coupled, nothing coupled beyond. Anywhere on the track.
- Solver: `successors()` walks each car/side/route once and yields every
  speed's result (with its speed range); `makeSolver()` is a resumable
  BFS. The hint runs it `HINT_MS` per frame (cap `HINT_MAX`), memoises the
  plan, sets the switches, rings the car, shows the arrow and speed range.
  Pressing Hint again before flicking repeats it for free.
- Moves: flicks + undone flicks + `HINT_COST` per hint. Restart resets the
  level (moves 0, loses One-shot). Points `max(MIN_PTS, PAR_PTS −
  OVER_PTS·(moves − par))`; `score` = the run's sum of best points per
  level (this visit). `score.epoch` 1, `max` 1500. `arcade:best` shown in
  the HUD.
- Side goals per level: Par, Clean run (no hint, no undo), One-shot (no
  restart). Chapter badge (★) = Par on every level of a chapter.
  Progress `rail-yard.progress` in localStorage, try/catch like Bubble
  Glass (lasts one visit inside the gallery's sandbox).
- **No ghost stopping line**: with integer speeds and exact costs it
  would show the only answer the puzzle asks the player to read. Instead:
  a sleeper per car length (two on gravel), the speed number and a
  15-pip gauge while aiming, and an impact label after every flick.
- Portrait screens turn the yard a quarter turn (`fitYard`, `rot`).
- Keys: Tab car, 1–9 / + − speed, arrows flick, A–D switches, Z X H.

## Key constants (`games/rail-yard.html`, `§ engine`, `§ constants`)

| Const | Value | Const | Value |
|---|---|---|---|
| S_MAX | 15 | C_MIN / C_MAX | 2 / 4 (couple window) |
| F_RAIL / F_GRAVEL | 1 / 2 per car length | BOUNCE_V | 1 |
| PAR_PTS / OVER_PTS / MIN_PTS | 100 / 10 / 10 | HINT_COST | 2 moves |
| STEP_MIN–MAX | 12–22 px per speed step | HINT_MS / HINT_MAX | 12 ms / 400k states |
| GENTLE_N | 10 couplings | END_LOCK_MS | 900 |
| PREPLAN_MS | 4 ms per frame | ROLL_S / ROLL_K | 0.05 / 0.5 s (roll animation) |

Car types: B box, H hopper (square ■), T tank (round ●), F flat (◆, both).

## Levels (ids permanent; `LEVELS`; add, never rename)

Format: # id (chapter) par, hint-search states: what it teaches / the trick.

| # | id | par | states | new / trick |
|---|---|---|---|---|
| 1 | first-coupling (1) | 1 | 3 | flick + couple window on one straight track |
| 2 | the-switch (1) | 3 | 162 | a lever routes; trailing moves pass; stop a car on the switch |
| 3 | gravel (1) | 4 | 225 | park in the gravel siding (cost 2) to let the other car by |
| 4 | full-siding (1) | 6 | 1,030 | siding holds 2 of 3; push a coupled pair (Full House on par) |
| 5 | small-yard (1) | 7 | 18,045 | two sidings; gravel lever starts set wrong (`sw`) |
| 6 | round-couplers (2) | 5 | 852 | tank between box and flat repels; bounce-nudge trick |
| 7 | one-way (2) | 8 | 21,635 | hump gate on the main (M5→M4); +2 par vs no gate |
| 8 | one-pass (2) | 7 | 13,165 | couple all three inside the 1× siding, pull out once, split |
| 9 | both-gates (2) | 6 | 26,569 | one-way departure, 1× stash for the spare hopper, 1× gravel exit |
| 10 | last-yard (2) | 8 | 67,221 | everything; one near-full flick (13-15), exit coupling on the way |

Levels 3-10 draw the departure track as a curve off the main's left end
(`D_CURVE`; level 10 is 5 long). Dead-end sidings facing away from the
departure track return a cut in reverse order: put the car that must
enter first deepest.

## Balance (v1, `node scripts/balance-rail-yard.mjs 20`)

Median of 20 seeded runs per level; minutes = 9 s per flick, 4 s per
hint, 2 s per undo, 10 s per level card.

| bot | result |
|---|---|
| solver | every stated par verified; total par 55; largest search 67k states (2.5 s Node) |
| max (full strength only, full planning) | wins 0 of 10 |
| flicks (never touches a lever) | wins 1 of 10 (level 1 has no switch) |
| switches (never flicks) | wins 0 of 10 |
| novice (1-move lookahead, ±1-2 speed, hint after 4 stuck flicks, restarts when stuck) | wins 10/10, ~19 min total; level moves 1/4/8/18/22/14/32/21/18/27 |
| hinted (hint before every flick, off by one 25%) | wins 10/10, ~15 min total |

Hint in Chromium (phone viewport): 1.2 s cold on level 9 (27k states),
2.9 s cold on level 10; ~60 ms on the par path once the background plan
(`PREPLAN_MS` per frame from the level's start) has finished.

## Telemetry fields

`arcade:result` per level end: `level` (1-10), `run`, `attempt`, `time`.
Wins carry `score` (run total). Losses: `reason` `restart` or `leave`
(picked another level). `stats`: `moves`, `par`, `hints`, `undos`,
`switches` (lever changes), `bounces`, `couples`.

## Player data

None yet.

## Open ideas / known limits

- Score ceiling: par is the optimum, so 10 levels cap the run at 1000.
  The uncapped mode is the Daily yard below.
- Progress (side goals, badges, reached level) only lasts the visit in
  the gallery (sandboxed iframe, no storage), as in Bubble Glass.
- A hint off the par path on the last yard searches up to ~70k states
  (~3 s on a phone). The finale's par (8) equals level 7's; a harder
  finale needs a bigger yard, and a smarter hint search to go with it.
- v2 side goals: Light touch (at most N switch changes), Soft landing (no
  bounce-backs in a level), Tight yard (no siding above half capacity),
  Spent gates (finish with a 1× gate unused).
- v2 challenge modes after chapter 2, reusing levels: Mirror yard (layout
  flipped), Blind flick (aim arrow and gauge hidden, par relaxed),
  Par-only (a level counts only at par).
- v2 Daily yard: a seeded generated layout, one per day, same seed same
  yard (fair leaderboard, `board: "d2026-10-01"`). The generator must pass
  the exploring solver (every yard solvable, known par; the scratch
  `enum`/`search` approach behind these levels is a start). This is the
  natural uncapped endless mode for the depth pass.
- Slopes (no v1). Mass (heavier cuts roll shorter) was left out to keep
  one number to read.

History: `docs/history/rail-yard.md`.
