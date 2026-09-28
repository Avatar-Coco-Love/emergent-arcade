# Findings

What the arcade has learned about shared-state mechanics (see
`docs/ROADMAP.md`, phase 3). New proposals and revisions check this list.
Each entry: the finding, the evidence, and how sure we are. Bot-only
evidence is provisional until player data (`scripts/fetch-telemetry.mjs`)
agrees.

## Passive systems that create more than they cost play themselves

Pressure Grid: an eruption removes 100 and adds 160, so past ~7.5k total
pressure the board erupts forever and stops responding to the player.
Balance bots: storms in 100% of 120 s sessions, and 0–5% settle once the bot
stops, unless it spreads pressure evenly (`docs/games/pressure-grid.md`).
Check: every passive system should lose something each cycle (decay,
drain, cooldown). Fix confirmed in v6: `ERUPT_BLAST` 40 → 24 (each eruption
now loses ≥4) and all six bots settle; at 25 (break-even) storms still
happen but burn out. *Evidence: bots plus a real-page check. Provisional.*

## A verb only shares state if succeeding needs to read it

Orbit Garden: flings bend around planets by mass, but dragging straight at
the target wins 100% of the time, the same as a gravity-aware path search
(`docs/games/orbit-garden.md`). The fling reads mass in the simulation but
not in the player's decision. Check: can a player succeed with a verb while
ignoring the shared value? If yes, the coupling is cosmetic. *Evidence:
bots. Provisional.*

## A decay rate turns a puzzle into a speed test

Orbit Garden: at 1.5 s per fling, bots win 96%; at 3 s, 8%. The wither rate
sets a minimum action rate, and above it the round is easy. Check: sweep the
bot's action rate, not just its skill. A cliff means the decay constant, not
decisions, decides the round. *Evidence: bots. Provisional.*

## Sweep reaction time apart from think time

Hot Iron: heat is a hold verb that draws fuel. When the rate sweep scaled
all bot timing, the reader dropped from 58% to 18% at 0.5×. With the same
settings, scaling only think time (the gap between decisions) used the
same fuel at every rate. The whole cliff came from releasing the hold late: each hold costs its release lag
in resource and overshoot. It scales with how fast the held value changes.
Cherry → white in 0.5 s meant a 0.5 s release dropped the reader from 84%
to 3%. At about 1.2 s it's 87% → 62%. Separately, the "decay turns it into
a speed test" check held again: faster cooling (COOL 0.15 vs 0.07) made
slow thinkers burn 20% more fuel (88% → 52% on the same budget), and slow
cooling made fuel use equal at every rate. Check: for a hold verb, sweep
reaction lag as well as think time, and keep the held value's rate of
change slow relative to a ~0.3 s human reaction. *Evidence: bots
(`docs/games/hot-iron.md`). Provisional.*
