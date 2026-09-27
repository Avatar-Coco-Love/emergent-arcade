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
drain, cooldown). *Evidence: bots plus a real-page check. Provisional.*

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
