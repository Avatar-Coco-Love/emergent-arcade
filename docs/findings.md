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

Fix tried in Orbit Garden v6: slower seeds (FLING_POWER 2.6 → 1.8) and
stronger gravity (G 400k → 900k) make every flight curve. Straight aim fell
from 100% to 1%. A bot that reads only the in-game aim preview still wins
100% (σ 2°, 1.2 s preview), so reading mass through the preview is now what succeeding
requires. Check: slow the carrier until the shared value visibly moves it,
and test a bot that sees only what the player sees. *Evidence: bots.
Provisional.*

## A decay rate turns a puzzle into a speed test

Orbit Garden: at 1.5 s per fling, bots win 96%; at 3 s, 8%. The wither rate
sets a minimum action rate, and above it the round is easy. Check: sweep the
bot's action rate, not just its skill. A cliff means the decay constant, not
decisions, decides the round. *Evidence: bots. Provisional.*

Fix tried in Orbit Garden v6: wither per seed flung instead of per second.
For a preview-reading bot, a 3 s gap and a 1.5 s gap now win the same
(100%), and spamming every 0.5 s drops it to 66%, because masses change
while seeds are still in flight. Check: charge decay per action, not per
second, when the round should reward decisions over speed. A decay rate
still makes sense when time pressure is the point. *Evidence: bots.
Provisional.*

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

## Bots model skilled play, not the first minute

Hot Iron v1: the reader bot wins 87% with ~100 s rounds and never cracks
the bar. The first human rounds (one tester, touch) were both lost to 3
cracks, in 13 s and 15 s, and the tester rated it 2★: "unsure how to make
the blade thicker". Every bot already knows the rules: heat first, and
thicken a segment by striking its neighbour. A human's first guesses
(tap the bar to hammer it; heat the part you want to grow) are the moves
the lose condition punishes hardest. Check: add a `novice` bot that makes
the obvious first guesses for its first few actions, and make sure a
round survives long enough to learn the verbs (no loss from the first
2–3 wrong taps). An indirect verb (act here to change there) needs to be
shown in play, not only in `howToPlay`. Hot Iron v2 did this: a novice
bot with both mistakes won 0% on v1 (cracked out every time, like the
tester). Stopping cold taps from cracking wasn't enough (4%, fuel out): the
burn from the second guess is permanent, and a budget with 15% slack
leaves no room for any mistake. Fuel 60 s and slower burning brought it to
97% (73% with slow hands) while every colour-blind bot stays at 0%. Also
check a budget's slack, not only whether a skilled bot can finish.
*Evidence: 2 human rounds + 1 rating vs bots (`docs/games/hot-iron.md`).
Provisional: one player, and v2 isn't playtested yet.*

## First player data vs the bots (2026-09-28)

One tester, touch, one or two rounds per game. Too little to confirm a
number, enough to show direction:

| Game | Bots (best playing bot) | Human |
|---|---|---|
| Hot Iron v1 | 87% win, 99 s | 0/2, lost at 13 s and 15 s (cracks) |
| Murmuration v4 | 79–89% by 60 s | 0/2, both at nightfall (60 s) |
| Hourglass Delivery v2 | 70% | 0/1, lost at 33 s, no glass filled |
| Wildfire Line v2 | 70%, 71 s | 0/1, lost at 65 s |
| Ant Trails v2 | 63% by 90 s | 1/1, won at 83 s |
| Orbit Garden v5 | 96–100%, 32–39 s | 1/1, won at 23 s |
| Pressure Grid v6 (sandbox) | 28–105 s per achievement, none gets all 6 | all 6 in 64 s |

Orbit Garden matched a bot-based prediction (a human flings faster than
the 1.5 s bot and wins sooner), which supports "a decay rate turns a
puzzle into a speed test". The human lost 4 of the 5 games where the
bots win 70–89%, so the bots look optimistic about new players.
*Evidence: telemetry, n = 1.*

Overnight, three more players (new browser IDs, touch), one visit each:

| Game | Bots | Human |
|---|---|---|
| Hot Iron v2 | reader 100%, novice 97%, 101–129 s | 1/1, won at 73 s, 3 achievements |
| Orbit Garden v5 | 96–100%, 32–39 s | 1/1, won at 52 s, all 4 achievements (humans 2/2) |
| Pressure Grid v6 | | 13 s, left after the first eruption |

The Hot Iron v2 fix (model the first minute's mistakes with a `novice`
bot, then tune until it survives them) turned 0/2 into 1/1 on the first
round. Orbit Garden is now 2/2 with every achievement: the games the bots
call easy are easy for people too. Still nobody new on the games the tester
lost. *Evidence: telemetry, n = 1 per game.*
