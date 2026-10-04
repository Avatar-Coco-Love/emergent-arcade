# Findings log

The full write-up behind each rule in `docs/findings.md`: the finding, the
evidence, and how sure we are. Read only the entry you need (grep the
heading); `docs/findings.md` is the checklist sessions read. New entries go
at the bottom, with a one-line rule added to `docs/findings.md`. Bot-only
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

## A player can know the verbs and miss the moment

Hot Iron v3: 0 of 5 rounds won (one new player), all lost to 3 cracks in
12–35 s. The medians looked like the v1 tester (didn't know the verbs), but
the rows said otherwise: 0 clangs (heats before striking), 0 stuck blows,
Steer unlocked (tried the neighbour trick), and ~40% of blows cracked,
spread over the round. The player knew both verbs, but couldn't tell dull
red (cracks) from cherry (works). A bot with the reader's own targeting that
strikes as soon as the metal looks red (`glow-red`) lost the same way
(7%), while the same bot waiting for cherry after its first crack won 95%.
So the missing piece was a threshold on the shared state, not a verb.
More lives didn't help (5–6 cracks: 13–15%): a player who can't see the
rule doesn't learn it from more failures. v4 marks strikeable metal
directly on the bar (a hammer above it), says what to do after a crack, and
narrows the crack band: glow-red 68%, a colour-judged version 36%, all
colour-blind bots still 0%. Check:
- Read the rows for what the player already does right (here, 0 clangs)
  before assuming they don't know a verb.
- If success depends on a threshold in a continuous display (a colour, a
  level), show the threshold where the player acts, not only in a legend.
- A bot that does the right thing at a slightly wrong threshold can match
  telemetry better than a bot that does the wrong thing.

*Evidence: telemetry (1 player, 5 rounds) + bots
(`docs/games/hot-iron.md`). Provisional: v4 isn't playtested.*

## When two things always move apart, turning alone can separate them

Bubble Glass v1 (a sealed sand box that turns through 360°; sand falls, the
bubble rises): six versions of the melt level (sand shafts that pour onto
the bubble's tube, to be lidded with glass) all fell to a rotate-only bot.
The one-rule `habit` bot ("turn so the vent is up") went from 100% to 0%,
but a bot that rocks the box got through in 30–40 s where the melt reader
took 7 s. Each fix closed one route and opened another: a lid needs a shaft
wider than its neck, and those shoulders park the sand at some slant; sand
that drains slowly arrives as a film the bubble slides past; a bubble that
lets a thin layer through works as a ratchet when rocked. What finally
mattered: sand gets past the bubble only through open liquid (none in a
tube it fills), shafts on both sides of the tube, and the bubble just
filling the tube (a 3-cell footprint in a 4-cell tube left a lane for sand).
A jammed glass plug, by contrast, needed shattering with no exceptions,
since turning can't move it. The maintainer chose "melt makes it much
faster, not required" for melt levels. Check:
- If the physics lets two things always move in opposite directions under
  a global verb, that verb alone can usually separate them. A second verb
  is *required* only where it changes topology (a wall that can't be moved,
  or removed), not where it saves time.
- Search for the single-verb solution with a bot that explores (random big
  moves when stuck), not only a greedy one: the greedy rotate-only bot
  failed where an exploring one won.

*Evidence: bots (`docs/games/bubble-glass.md`). Provisional: not
playtested.*

## A hint that waits for stillness never shows in tilt mode

Bubble Glass v1, level 2: one player, tilt mode, 2 attempts (79 s, 50 s),
both restarted, rated 1 star ("no amount of tilt could get the bubble
through sand… no clear solution"). The rows: 0 glass melted, all 70 heat
left, 4,000–5,400° turned, 0 and 1 hints. The level needs a melt the
player never found, and the hint that points at it waited for 3 s of
stillness: a box turned by a phone in the hand wobbles more than the
0.6° the check allowed, so the timer never filled, and the one hint that
did show vanished on the next wobble. A hinted bot wobbling ±3° in tilt
mode reproduced it (13% first try, 0 hints); v2 gets it to 100%. Check:
- A "nothing is happening" detector must tolerate the input's own noise
  (sensor jitter, settling particles). Test it with a bot that adds that
  noise, not only with a bot that holds perfectly still.
- A hint needed before the first move (here, lids before the first flip)
  must be on screen from the start and stay until it's done. A stuck hint
  comes after the mistake.
- Give a hint a minimum time on screen. Clearing it on any movement hides
  it from exactly the player who is moving without a plan.

*Evidence: feedback + telemetry (1 player, 2 rounds) + bots
(`docs/games/bubble-glass.md`).*

Replay of v2 on phones in tilt mode (2 players): level 2 won 2/2 first
try (v1 0/2), with glass melted; all five levels 14/14. The first
revision the arcade made from player data, confirmed by player data.
*Evidence: telemetry, n = 2. Holding.*

## A slow hazard is no threat to a fast move

Bubble Glass v3 draft: wet sand (a quarter of sand's speed, heavy, no
diagonal slip) in roof's shafts, lidded with a dry top layer. The lid was
meant to be needed, but a bot that never melts flipped the box in 1 s and
won in 5 s, wherever the shafts sat: the wet sand only drains while the
box is held at an angle, and a quick turn passes through those angles
before it moves. The same slowness made the wet-sand intro work the other
way: with the pocket right beside the bubble, a flip lands the bubble under
it (novice 50% first try), and turning away to let it settle is the lesson.
Also from the same pass: a hazard only matters on the stretch the player
must cross after it triggers. Level 4's plug below the shafts could be
shattered at once for free (its sand fell away from the bubble), and
shafts pour only into the tube between their mouths and where their sand
lands, so a short tube above them made the lids pointless. Check:
- For a slow hazard, time how long the player is exposed to it, not
  whether it can reach them. A quick verb beats a slow threat; use slow
  things as obstacles to wait out, not as clocks.
- For each hazard, ask what happens if it is triggered first. If that's
  free, the hazard is decoration.

*Evidence: bots (`docs/games/bubble-glass.md`). Provisional.*

## A two-way verb forgives its own misuse

Tidewright v1 draft (2026-09-30): sluice gates drain water from behind a
sand wall, but let the sea in when it stands higher. A bot that left every
gate open lived to wave 9 of a game tuned for 20: the sea that poured in
at each crest drained back out of the same open gates as soon as the wave
fell, so the mistake undid itself. A second bot that opened every gate in
each calm and shut them before each crest, never looking at the water or
the tide, tied the skilled bot (17 vs 16 waves): gate *timing* was the
whole skill, and reading the shared water level added nothing. Two rules
fixed it: the crest bursts through an open gate and spreads along the wall
(inflow outruns the drain), and a spring tide holds the sea above the gate
sills and the flood line until it ebbs, so a gate opened on the timer's
schedule floods the village (timer: 5 waves, skilled: 20). The first spring
tide killed in ~2 s, faster than reaction, and two in a row (or one after a
double wave) killed every bot with no counterplay; an ebb window late in
the calm made reading the tide the skill. Also seen: gateless bots won the
first season until seepage came from the waves rather than the tide.
Check:
- For a two-way verb, compare the cost of leaving it in the wrong state
  with what using it right saves. If the verb undoes its own mistakes,
  add an asymmetry (inflow faster than outflow, damage on the way in).
- Test "must read the value" with a bot that runs the verb on a schedule.
  If it ties the skilled bot, the value doesn't matter yet.
- A hazard that blocks the verb (can't drain) needs a window to use it;
  its failure delay must beat reaction time (Hot Iron).

*Evidence: bots (`docs/games/tidewright.md`, tuning table in
`docs/history/tidewright.md`). Provisional.*

## A full-strength bot finds the detour that spends the extra speed

Rail Sorting Yard v1 draft (2026-09-30): a flick's strength sets a car's
speed, track friction drains it, and cars couple only when they meet at
impact 2-4. To prove the speed must be read, a breadth-first bot that may
only flick at full strength (but plans everything else) tried every yard.
With a top speed of 9 it won most of them, level 1 included: a hard hit
bounced back with the leftover speed (impact − 4), and that rebound
coupled with the next car. With rebounds fixed at speed 1 (too slow to
couple) it still won most yards in par + 1 to par + 4, by parking cars one
length off a buffer and then routing them through a gravel siding or a
long loop of the yard until full strength arrived at exactly 2-4. At top
speed 12 it still found such detours (7 flicks where par was 3). At top
speed 15, above what any route in a compact yard can absorb (longest path
cost 10), it lost every level, while normal par stayed 1-8.
Check:
- For a strength verb, test a bot that uses only the maximum with full
  planning, not only one that plays greedily: detours are what it finds.
- Make every overshoot lose the extra (no rebound that carries it into
  the next target), and make the maximum exceed what any route can soak
  up, so it can't be spent on the way.

*Evidence: bots (`docs/games/rail-yard.md`, history in
`docs/history/rail-yard.md`). Provisional.*

## A route verb is only needed where the other verb can't follow a chain

Rail Sorting Yard v1 draft (2026-09-30): switches (drag) route a rolling
car; flicks move it. A bot that never touched a switch still won yards
where a car started on the departure track: it coupled to that car and
pushed or pulled whole trains through the switch, because a coupled train
follows its own cars rather than the lever, and a car rolling in from a
switch's back end goes through either way. Starting the departure track
empty and the levers set against the needed route made the flick-only bot
fail 9 of 10 levels (it wins only level 1, which has no switch).
Check:
- For a verb that sets routes, look for ways the other verb reaches the
  goal by following links (couplings, chains, trailing moves).
- Start routes set wrong where the second verb should be needed, and
  prove it with a bot that never uses it.

*Evidence: bots. Provisional.*

## Text over the board and a stale fit read as broken

Rail Yard v1 (2026-10-01, maintainer's in-game note, phone): the level tip
and hint text drew over the yard (on the OUT label on most levels); the
yard "did not start fully on the screen" until full screen was toggled;
the gravel siding looked janky, its per-cell beds overlapping at the bend.
Telemetry from the same player: every round they finished was a win, but
4/4 sessions ended with a round left mid-way (~18 s in), so layout, not
difficulty, likely ended them. Causes: `#msg` sat absolutely over the
canvas in a 0.8-cell band too small for two lines; `startLevel()` never
called `fitYard()`, so each yard kept the previous one's fit (level 1 is
one straight track, turned for portrait) until a resize; gravel was a
rotated box per cell. v2: message strip of its own (two lines), refit per
level, one continuous bed, labels placed where no track runs. Bots can't
see any of this: only screenshots at phone sizes do.

## Additive amounts make the order free

Pressure Grid v8 (2026-10-01, solver bots). Turn-based levels with pump
+4, blast +2, burst at 10. A cell bursts once it has collected 4a + 2b ≥
10 from a pumps and b neighbour bursts, in any order: bursting a sealed
cell before or after priming the ring beside it costs the same. The
"habit" bot (one target at a time, in reading order, each solved
optimally) lost only 1 move on level 4 and 2 on level 5. What did make
order cost: pours (they take everything, so pouring out of a ring
first means refilling it), overshoot (pumping 8 → 12 wastes 2 that a
+2 blast wouldn't), and cells that empty. The first numbers tried
(threshold 12, pump 4, blast 3) had the opposite problem: 8 + 3 = 11, so a
blast never finished a pumped cell and chains didn't pay.
Check:
- For a puzzle about order, look for contributions that just add up:
  if every source adds a fixed amount, order is free. Order needs
  something that takes or empties (pours, bursts, caps, decays).
- Check that the key interaction lands exactly on the threshold from
  the states a player naturally makes (8 + 2 = 10), not one short.
- Measure order with a habit bot (targets one at a time) against the
  solver's par.

*Evidence: bots. Provisional.*

## A hazard that is also a resource makes order matter

*Pressure Grid v9, levels 6-10 (2026-10-01).* Vents start at 8: poured
out, their pressure is free (7 into a neighbour); hit by a burst first,
they go off and empty every open neighbour, primed rings included. On the
vent intro (level 7) the solver pours both vents into the rings: par 4,
pump-only 6, habit 5. On level 9 a seal's burst beside the full vent
wipes the ring next to it, so the vent goes into a seal first: par 10,
habit 12, greedy novice 14% within 40 moves. Leaky cells (−2 per move)
add order the other way: fill them last, in one move (level 10 pours a
vent into the leaky ring: 4 + 7 = 11). Valves only bound order where an
arrow faced the wrong way (level 8: 7 vs 6 with a two-way pipe).
Check:
- Give a hazard something worth taking from it, so defusing it is a
  move the solver wants, not just a cost.
- Run pump-only and habit bots: both should lose moves on the level.
- A one-way rule only shows when the wrong way is tempting: test the
  level with the restriction lifted (par should drop).

*Evidence: bots. Provisional.*

## A valve is required only when the goals need disjoint angles

Aqueduct prototype, 2026-10-02 (draft PR #59, `docs/games/aqueduct.md`).
Goal: a cup in a target band (door lock) plus a floating bead at an exit ring;
one global verb (turn the vessel) and one local verb (a valve sealing the
cup). With a top-opening cup under the bridge, a planner that never touched
the valve won at every exit tried (low, high, near the bridge, far corner):
it either filled the cup last while the bead waited at the ring, or rode
the A-to-B stream, which both refills the open cup to an in-band
equilibrium and carries the bead past high rings. Hanging the cup mouth-down
from the bridge ceiling made it hold water only past ~90° (empty at ≤60°),
and a ring low in B near its left wall is only reachable near upright; at
-90° B drains through the bridge mouth on that wall. The no-valve planner
then lost 0/5 at DEPTH 22 BEAM 16; with the valve, 5/5 in 4.3 s. A ring 20 px
lower and left, (60, 110), still let the no-valve planner win 1/3 by tilting
the other way (-60°, water pools in that corner). Rule: map each goal's
reachable angle range (both directions, including transient stream states)
and make them disjoint.

## When one move fills two cups, the lock order is the puzzle

Aqueduct prototype level 2, 2026-10-02 (draft PR #59, `docs/games/aqueduct.md`).
A second cup (mouth sideways on chamber B's right wall) next to the
mouth-down amber cup. One tumble to -150° fills both (amber 33-69%, violet
~36%). The valve planner (3/3) shuts violet at -60° while amber is still
open and over band, lets amber drain to ~35% while easing back, then shuts
it. Shutting amber first at -60° traps it at 76% while violet drains to 0%,
so the door never opens without reopening a valve (and paying taps). The
no-valve planner lost 0/3 at DEPTH 22 BEAM 16; novice and timer 0/20.
Check: trace the reverse order explicitly; the score (degrees + taps)
then rewards finding the right order on the first try.

*Evidence: bots. Provisional.*

## Same-density colours layer, they don't blend

Aqueduct prototype levels 3-5, 2026-10-02 (`docs/games/aqueduct.md`,
"Colour"). Two water colours (blue, orange) of equal density, no diffusion;
a cup counts only its own colour and allows ≤ 20% foreign. Expected: any
wrong pour mixes for good, so the game needs a hopeless check. Measured on
level 3 (orange cup on B's wall, orange in B, blue in A): pouring blue
across first (the levels 0-2 habit) makes the cup read 40-60% blue, but a
2-step angle search still finds a 6-10% fill (upside down: orange is the
bottom layer). Only spinning interleaves the colours: 2 s at 90°/s gives
27% at best, 4 s 43%, 8 s never in band. A clean-cell count (18 px cells,
≥ 80% own colour) can't separate rescuable from lost states (59 vs 63
clean particles; reachability matters), so the check flags under 2× the
band floor and the restart button is always visible instead.

*Evidence: bots. Provisional.*

## Memory load at most k + 1 is solved by elimination

Coat Check go/no-go harness, 2026-10-03 (`docs/games/coat-check.md`, before
any game file). The brief wanted each new rule (shifts 2-8) to break the
shift-1 habit ("colour row, left to right"), written as a bot with memory
k = 4. Shift 2 (load 4) and shift 3 (load 6) never did: habit won 100% and
95%. Even at 10 guests and load 5, habit kept winning 100%. A bot that remembers k coats knows the
(k+1)th door by elimination, and with k + 2 coats one peek settles it, so a
rule only bites once load stays at k + 3 or more. Shifts 4-8 (load 7-8)
gave 44-56%, and 27-37% with load + 1. A side result: random placement scores ~75 on
the brief's `purity` stat (few coats per row agree by chance), so 75 is the
"no scheme" baseline, not 0.
Check: for a memory game, compare each shift's sustained load with the k
you expect players to have before claiming a rule breaks a habit.

*Evidence: bots. Provisional.*

## An achievement can ask for a state the generator never makes

Coat Check v1, 2026-10-03. The brief's *Full House* ("return a coat while
every hook is full") looked natural, but the stream stops arrivals at the
shift's load target, and every load target sits below the hook count. A bot
that hangs and fetches perfectly saw a full room in 0% of campaign shifts and
1-2% of late Endless shifts (only when no guest could be named and an arrival
was forced). v1 counts 10+ coats hanging instead (100% of shift 12 and of
Endless from load 10). Check: for every achievement, run a bot over the
generator and count how often the condition can happen at all.

*Evidence: bots. Provisional.*

## A branch that dies by itself makes the cut verb optional

Mycelium v1, 2026-10-03. The brief's *prune* stopped a thread's upkeep and
stranded what lay beyond. But a branch to a used-up patch starved and
vanished on its own within ~12 s, so the upkeep it cost was small: a bot
that never cut scored 50 against skilled's 55 and won as many seasons.
Charging pool for a cut (the brief's idea) would only have made cutting
worse. What worked was a cost for *not* cutting: a knot that starves while
attached rots the knot it grew from, and the rot climbs to the spore,
stranding every branch past it; a cut branch withers harmlessly. The
never-cut bot then fell to 72 vs 88 (and 49 vs 68 at higher upkeep), with
4-6 rotted knots a season. Check: for a cleanup verb, run a bot that never
uses it; if the mess clears itself, give the mess a cost that spreads.

*Evidence: bots. Provisional.*

## A real-time rival turns a budget game into a speed test

Mycelium v1, 2026-10-03. Every verb was paid from the pool, so the action
rate shouldn't matter, but a sweep said it did: the skilled bot at 1 action
per 2 s won the last campaign season 13% of runs, against 100% at 2 per s.
The cause was the rival mould, which regrew one knot every 1.1 s from its
root right after each cut, so cutting it was a race. A 5 s rest after a cut
(and 1.4 s per knot) made the action rate irrelevant (0.5, 1 and 2 s per
action all win season 8 96-100%). Check: sweep the bot's action rate even
when every verb has a price; anything that regrows on a clock is the suspect.

*Evidence: bots. Provisional.*

## A budget that can hit zero with no income source freezes the round

Mycelium v1, 2026-10-03. With an empty pool, a thread that was still
growing stalled, and the spore's trickle (0.3/s) didn't cover the upkeep of
the knots already grown, so nothing could ever change: novice bots sat out
whole seasons with untouched food on screen. Fixes that keep the empty pool
a punishment: a trickle above a small network's upkeep (1/s), the empty pool
eats the farthest tip every 1.5 s (so upkeep falls until the trickle wins),
a gift each new season and each retry, and an early frost once all food is
gone. Check: for a resource game, find a state where income is zero and
spending is blocked, and make sure the passive rules leave it.

*Evidence: bots. Provisional.*

## A sweep plays itself when the effect outlasts the sweep

Lighthouse Keeper v1, 2026-10-03. The beam burns fog where it points and
the fog drifts back. With fog returning at 10% of the gap per second and a
1.5/s burn, a bot that swung the beam end to end without looking at a ship
won the last campaign night 56% of runs: each pass burned more than came
back before the next one, so the whole sea stayed clear. A linear return
(0.2/s), a slower burn (0.9/s) and a slower lamp (1.0 rad/s) made a pass
burn less than returns between passes; the sweep bot then lost at night 2-3
while the skilled bot, which holds the beam on the ship in danger, still won
night 8 ~80%. Check: for an aim verb, compare the effect's lifetime with the
time a blind sweep takes to come back, and run the sweep as a bot.

*Evidence: bots. Provisional.*

## An automatic shed is a free cut

Mycelium v2, 2026-10-03. To make cutting pay, knots out of feeding range
(dead branches past a used-up patch) were charged 2-4× upkeep. The never-cut
bot barely lost (90% → 88% of skilled's score at 4×) while the novice dropped
a season: the extra upkeep emptied its pool, and an empty pool eats the
farthest tip, which on a dead branch *is* the cut, done for free. What
worked was a flat upkeep rise in the seasons where dead branches pile up
(season 5 ×1.3, 6+ ×1.7): never-cut fell from 82% to 63% of skilled. Check:
when a rule makes a mess costly, list every automatic way the mess can
clear (starvation, hunger, decay) and run the never-clean bot against each.

*Evidence: bots. Provisional.*

## A floor on a shared budget rescues the habit that ignores it

Mycelium v2, 2026-10-03. To soften the novice's wall at seasons 4-5, each
season was started with at least 60 in the pool. The novice gained two
seasons, but the timer bot (pulses every 1.5 s without reading the pool)
went from 16% to 68% of skilled: it ended every season broke, and the floor
refilled exactly what its habit spilled. Nearer patches, a lower goal and a
later rival in those seasons helped the novice as much and left the timer
bot at 21%. Check: before adding a floor, gift or refund to a budget, run
the bot that wastes that budget and see who gains most.

*Evidence: bots. Provisional.*

## A spotlight serves a crowd one by one when one look is enough

Lighthouse Keeper v2, 2026-10-03. Flare (clear a wide patch of fog for
~5 s) was meant to beat the beam on convoys. Tighter convoys (0.25 s
apart, spread across the sea) and bigger ones (3-4 ships) left the
never-flare bot at 92-114% of skilled: a lit ship turns for the harbour
and holds that course blind, so each ship needs well under a second of
beam near its own reef, and the beam visits them in turn. Reefs set the
same way along every convoy ship's course (so they all need light at
once) helped; a slower ship turn rate and a slower lamp did not separate
the bots. Check: time how long one target needs the aim verb, not only
how many targets there are.

*Evidence: bots. Provisional.*

## A burst verb fired too early looks useless

Lighthouse Keeper v2, 2026-10-03. The skilled bot flared when two ships
were within 8 s of their reefs; the patch faded (~4-6 s) before the ships
were close enough (~5 s) to see the reef, and flared ships still wrecked.
Firing at 5 s took skilled from 48 to 66 ships against never-flare's 56;
at 4 s it was too late (53). Making the patch last longer did nothing.
Before calling a burst verb weak, sweep *when* the bot fires it against
the window in which its effect is useful; that window is the decision.

*Evidence: bots. Provisional.*

## A blocking verb is worth one action per branch it guards

Surprise Party pre-build go/no-go, 2026-10-04. A guest within 2 steps of
the birthday person may hear no earlier than 7:45, so a wave can pass them
with at most one more hop behind. Without doors, every deep branch behind
such a guest needs its own whisper; a door shut as the wave passes costs
none. Houses where that guest guards one branch (doors worth +1 whisper)
couldn't give a spare envelope without letting whisper-only win, and the
novice bot survived 2 wrong taps 15–31% of the time. Putting the guest at
a 3-way junction made whisper-only cost par + 3, left room for a spare
envelope and raised the median novice from 31% to 44%. Check: count how
many independent branches the second verb guards; that is the slack the
level can give before the first verb alone wins.

*Evidence: bots. Provisional.*

## A mess that adds what the cleanup removes makes the cleanup free

Geode v1 build, 2026-10-04. The brief's impurities landed on empty
frontier sites: each one added a site and its cleave removed that site, so
cleaving cost no mass and a bot that cleaved every impurity at once never
lost (skilled and anneal-park both hit the 40-minute cap). Having the
impurity swap into an existing ion made each cleave cost a site that
growth must refill, and the never-cleave bot then died in geode 1. Landing
anywhere first made cleaves cut whole branches (all bots stalled); limiting
impurities to embedded sites (4+ neighbours) turned each cleave into a
clean vacancy that refills. Check: count what the mess adds and what the
cleanup removes; if they cancel, the verb only has a time cost.

*Evidence: bots. Provisional.*

## A rate verb is free while the budget binds

Geode v1 build, 2026-10-04. Temperature was meant to trade growth speed
against strain, but with the brief's attach rate growth was always limited
by the pool's income: the crystal grew as fast in the anneal glow as in
the cold, so annealing cost nothing and the anneal-park bot banked as much
as the strain reader. The trade appeared only once the cold attach rate
could outrun income and the glow's could not (rate `(1 - T/0.8)^2`, pool
cap 0.5 so annealing overflows, seeds priced at 3× to spend the overflow).
Check: for each setting of a rate verb, find which constraint binds (the
rate or the budget); the verb matters only where the rate does.

*Evidence: bots. Provisional.*

## A thinning income turns a quota into a soft lock

Geode v1 build, 2026-10-04. The brief's pool aged by cutting income to 15%
to push the player to harvest. Careful bots fell behind, income dropped,
and from geode 5 the quota became unreachable while nothing ended the
round: a still-winnable-looking stall. Two fixes together: the age raises
the impurity rate instead (income floors at 50%), and a visible pool life
seals the geode (harvested at quota, else a `thin` loss). Check: run the
most careful bot to the end of each round; if it can't finish and can't
lose, the round needs a clock or a loss.

*Evidence: bots. Provisional.*
