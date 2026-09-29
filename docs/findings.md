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

Pressure Grid v7: a spreading rate (bleed) works like a decay rate. Any
"reach 100 eruptions" goal, against a clock or against a pump budget with
no clock, was decided by tap rate. With 150 pumps, centre spam won 100% at
6/s and 0% at 3/s. Every bot that read the board won 0%, because pressure
bled away between slow taps. Check: a budget of actions doesn't remove
the speed test while a passive system undoes each action over time.
*Evidence: bots (`docs/games/pressure-grid.md`). Provisional.*

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
| Pressure Grid v6 (sandbox, v7 adds a round) | 28–105 s per achievement, none gets all 6 | all 6 in 64 s |

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

## One round shows everything, so players leave after one round

Written feedback from one player who tried the whole gallery: every game
held him for seconds to 2 minutes, and he left "once I figured I had seen
everything", usually right after the first win or loss. Few decisions in
a short round felt impactful. He asked for variety, not new verbs.
Favourite: Ant Trails. He also suggested presenting the gallery as
"experiments", not "games", to set expectations. Check: does a second round
show the player anything the first didn't (new layout, new threat, a
carried-over state)? If not, telemetry will show one round per session no
matter how the balance is tuned. Variety can live in what the 2–3 verbs
face, which keeps the brief's mechanic limit. *Evidence: one player's
written feedback. Provisional.*

## Carry-over makes the second verb pay more each round

Ant Trails v3 answered "one round shows everything" with a five-day run:
a new layout and twist each day, and the colony carries over. In the bots,
the value of the second verb grew across the run: wash beats trail-only by
5 pts on day 1 but by 34 pts over five days (49% vs 15%), because every ant
the spider eats is missing on every later day. Colony size alone moved
day 5 from 47% (fresh 22 ants) to 82% (the usual ~34 carried in). Check:
when adding rounds, carry some state between them, so a mistake (or a good
play) in round 1 still matters in round 3. Also keep round 1 gentle
(novice 75%) and let a lost round be retried from its start, so a new
player reaches the new content instead of replaying round 1. Whether
players actually stay for round 3 is the telemetry question
(rounds per session). *Evidence: bots (`docs/games/ant-trails.md`).
Provisional: not playtested.*

## Feeding one side of a predator–prey loop can hurt it

Island Census v1 draft: starting with 75 rabbits instead of 60 lowered
every bot (idle 13% → 8%, reader 92% → 81%, novice 45% → 30%). The extra
rabbits fed a bigger fox boom, which then ate more than the extra. Ecology
calls this the paradox of enrichment. The verbs inherit it: releasing
rabbits during a fox boom feeds the next crash, so "add more of what's
low" is the wrong first guess. The game's real lever is a fenced refuge,
opened when the foxes starve. Check: in a game with coupled populations,
test a bot that just tops up whatever is low. If it does worse than doing
nothing at some moments, the timing of a verb matters, which is the
decision the game is about. *Evidence: bots
(`docs/games/island-census.md`). Provisional.*

## In a frictionless spring system, only where the pins end up matters

Loom v1 (a spring net with pull and pin): once friction was near zero, the
net's resting shape depended only on the pinned positions, not on the
order or speed of the pulls. A bot that knew which knot goes where but
yanked blindly won 95% of runs; one that also read tension won 100%. The
first ~10 tries at raising the difficulty (pull speed, easing off, strain
limits) changed nothing. Tension only mattered where a resting load sat
near its limit (Kite pins pop at the dot centres, hold at the inner edges).
Also, a threshold that fires faster than a human can react (pins popping
0.3 s after going red) made reading the warning useless: the ring-reading
bot did no better than the blind one until the delay was 0.6 s. Check: for
a physics game, ask what the player can choose that changes the
*equilibrium* (which knots, how far), since a relaxing system forgets how
you got there. Keep every warning-to-failure delay above reaction time.
*Evidence: bots (`docs/games/loom.md`). Provisional.*

## One global verb against many local states makes the order matter

Terrace Garden v1: tilt moves the water on every terrace at once, and a
tap opens one gate. A bot that tilted toward the plant it was feeding
starved it, because the same left tilt held the terrace above away from
its open gate, so nothing came down. Winning bots first tilt toward the
gates to bring water down, then shape it. With little water, "tilt toward
the plant" also backfires (the water piles against the wall, short of the
plant), so the bot has to predict where the water settles. Gates alone win
0%: an open gate leaves a puddle below its sill that only a tilt drains.
Check: when one verb acts on everything, look for a moment where the
global move helps one place and hurts another. That conflict is where the
decisions are. Also test a bot that can only use the verb at full strength
(PC keys: `keys` 47% vs analog 100% in garden 3), since a global verb
needs fine control. *Evidence: bots (`docs/games/terrace-garden.md`).
Provisional: not playtested.*

## A general trick beats a set of levels; break it with rules, not sizes

Loom v1 had four shapes, and one rule solved them all ("corners to the
outer dots, pinned at the inner edge"). A player said so after one run
("every other level blindfolded"). A bot playing only that rule (`habit`)
won 100%. Bigger or stranger silhouettes didn't help, because the rule
generalises. What broke it was a rule about *which* knot (a dyed dot takes
only its own knot) and *which* strands can take stretch (frayed ones).
Also, a penalty that relieves the constraint doesn't teach: a frayed snap
costing one slip let `habit` win anyway, since the snapped strand freed its
row. Making it an instant tear did. Check: write the one-line rule a
player would use after level 1 as a bot, and make sure each later level
fails it. *Evidence: feedback + bots (`docs/games/loom.md`). Provisional.*

## Onboarding: the first round is a hook, not a test

Ant Trails v4's first day took 60–90 s of mostly waiting, and a player
quit before seeing day 2 ("you gotta hook a player"). v5 adds a 17–40 s
warm-up day (one near pile, no spider) and fast-forward. The warm-up's
reward (hatched ants) was cancelled out by starting the colony smaller,
so the rest of the run's balance didn't move. Check: time a novice bot's
first round; if it's over ~40 s, add a warm-up or a speed-up.
*Evidence: feedback (`docs/games/ant-trails.md`). Provisional.*

## A still screen that's still winnable reads as broken

Terrace Garden v1: 0 of 4 first tries won, 4 of 6 sessions left
mid-round (median 46 s), and every loss had the same stats (2 of 4
bloomed, spring empty, nothing spilled, ~14 gate taps, ~6 s of tilt). The
balance bots won 100%, `novice` included, because every bot already knew
tilt was the main verb. A bot playing the humans' habit (`masher-0`: run
the spring while a plant looks dry, open the gates above it, never tilt)
matched the telemetry exactly. By 39 s its hillside is frozen: the water
it needs sits behind open sills or at the wrong end of a terrace, and only
a tilt moves it. The game can still be won, so it never ends and never
says why. Players read that as "nothing works" and leave. v2 adds a
warm-up that teaches one verb at a time (the gate stays locked until a
tilt has bloomed the first plant). It also adds a hint after 3 s of
stillness that points at a helpful move (tilt direction, gate or
Restart). A masher that obeys the hints wins garden 1 83–100% on the
first try (v1: 0%). Two details mattered: a hint-follower at full tilt
spilled everything until spilling got its own instant warning, and the
PC player couldn't tilt at all (the mouse didn't tilt; now it drags the
bar). Check:
- Write the telemetry's habit as a bot (from its stats: taps, seconds on
  each verb, what's left at a loss) before trusting any `novice`.
- If a round can reach a state where nothing changes until the player
  uses a verb they may not know, show that verb then, or end the round.
- Every input device must reach every verb.

*Evidence: telemetry (4 players) + bots (`docs/games/terrace-garden.md`).
Provisional: v2 isn't playtested.*
