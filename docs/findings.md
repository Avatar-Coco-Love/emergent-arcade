# Findings

What the arcade has learned about shared-state mechanics (`docs/ROADMAP.md`,
phase 3), as checks to run on every new game and revision. One rule per
line; the evidence and the full story are in `docs/findings-log.md` under
the heading in *italics* (grep it, don't read the whole log).

Evidence tags: **bots** = balance bots only (provisional), **players** =
telemetry or feedback agrees, **n** = players behind it.

Adding one: write the full entry at the bottom of `docs/findings-log.md`,
then add one line here under the right theme. If a later result confirms or
overturns a rule, update its tag here and add the evidence to its log entry.

## Systems: does the shared state really drive play?

- Every passive system must lose something each cycle (decay, drain,
  cooldown), or past some level it plays itself. *Passive systems that
  create more than they cost play themselves.* Pressure Grid. bots.
- A verb only shares state if succeeding needs to read the shared value:
  can a player win with the verb while ignoring it? Slow the carrier until
  the value visibly moves it, and test a bot that sees only what the player
  sees. *A verb only shares state if succeeding needs to read it.* Orbit
  Garden. bots.
- In a coupled population game, a bot that tops up whatever is low should
  sometimes do worse than doing nothing; then timing is the decision.
  *Feeding one side of a predator–prey loop can hurt it.* Island Census. bots.
- A relaxing physics system forgets how you got there: difficulty must come
  from what changes the equilibrium (which pins, how far), not order or
  speed. *In a frictionless spring system, only where the pins end up
  matters.* Loom. bots.
- One global verb over many local states: look for the moment it helps one
  place and hurts another; that conflict is the decision. Test full-strength
  (keyboard) input too. *One global verb against many local states makes the
  order matter.* Terrace Garden. bots.
- If two things always move apart under a global verb, that verb alone can
  usually separate them. A second verb is *required* only where it changes
  topology. Search for single-verb wins with an exploring bot, not only a
  greedy one. *When two things always move apart, turning alone can
  separate them.* Bubble Glass. bots.
- A local verb (a valve) is required only if the goals need disjoint
  angle ranges: one state must hold only where the other goal can't be
  reached. Moving the goal is not enough while a current links the two;
  check both turn directions. *A valve is required only when the goals
  need disjoint angles.* Aqueduct. bots.
- Two locks filled by the same move make their order the puzzle when they
  drain at different rates: shut the one already in band, let the other
  drain, then shut it. The reverse order traps the wrong volume. *When one
  move fills two cups, the lock order is the puzzle.* Aqueduct.
  bots.
- Particles of equal density layer instead of blending: a "can't unmix"
  rule only bites after vigorous motion (a full spin), not a wrong pour.
  Measure the mixing a real mistake causes before building a fail state
  around it, and keep a stuck check conservative (a miss costs a ↻, a
  false alarm costs trust). *Same-density colours layer, they don't
  blend.* Aqueduct. bots.
- A slow hazard is no threat to a fast move: time the player's exposure,
  and ask what happens if each hazard is triggered first. *A slow hazard is
  no threat to a fast move.* Bubble Glass. bots.

- A strength verb is only read if full strength can't win: test a
  max-only bot *with* full planning, make every overshoot lose the extra
  (no useful rebound), and set the maximum above what any route can
  absorb. *A full-strength bot finds the detour that spends the extra
  speed.* Rail Yard. bots.
- A route verb (switch) is only needed where the other verb can't reach
  the goal by following links (couplings, trailing moves): start routes
  set wrong and prove it with a bot that never uses it. *A route verb is
  only needed where the other verb can't follow a chain.* Rail Yard. bots.
- A cleanup verb (prune, cut) is optional if the mess clears itself: run
  a bot that never uses it, and give leaving the mess a cost that spreads
  (rot climbing back). *A branch that dies by itself makes the cut verb
  optional.* Mycelium. bots.
- An automatic shed (an empty pool eating the farthest tip, a starved tip
  dying) cuts dead branches for free: when a rule makes a mess costly, run
  the never-clean bot against each automatic way the mess clears. *An
  automatic shed is a free cut.* Mycelium. bots.
- A floor or gift on a shared budget (a minimum pool each round) helps
  most the habit that wastes the budget: run the timer bot before adding
  one; easier layouts help a novice without it. *A floor on a shared budget
  rescues the habit that ignores it.* Mycelium. bots.
- In a budget game, check that income can't reach zero while spending is
  blocked (a stalled build, upkeep above the trickle): that state is a still
  screen. *A budget that can hit zero with no income source freezes the
  round.* Mycelium. bots.
- An aim verb (a beam, a hose) is only read if what it does fades before
  a blind sweep comes back: test a bot that sweeps end to end without
  looking. *A sweep plays itself when the effect outlasts the sweep.*
  Lighthouse Keeper. bots.
- A spotlight verb serves a crowd one target at a time if one short look
  fixes a target for good: time how long each target needs the aim, and
  make the crowd need it at the same moment (hazards the same way along
  each course). *A spotlight serves a crowd one by one when one look is
  enough.* Lighthouse Keeper. bots.
- A burst verb (a flare, a bomb) has a firing window: too early and the
  effect fades before it's needed. Sweep when the bot fires before calling
  the verb weak. *A burst verb fired too early looks useless.* Lighthouse
  Keeper. bots.
- A two-way verb (a valve, a door) forgives its own misuse: what it let in
  it lets back out. Check that misusing it costs more than using it well
  saves, from round 1, and test "must read the value" with a bot that runs
  the verb on a timer; give every hazard that blocks the verb a window to
  use it. *A two-way verb forgives its own misuse.* Tidewright. bots.

- A blocking verb (a door) saves one action of the other verb per branch
  it guards: put the guarded point at a junction (3 deep branches) so the
  level can give a spare action and the single-verb habit still loses.
  *A blocking verb is worth one action per branch it guards.* Surprise
  Party. bots.

- In an order puzzle, amounts that only add up make the order free (4a +
  2b reaches 10 whatever the order); order costs come from what takes or
  empties (pours, bursts, caps). Land the key interaction exactly on the
  threshold from natural states (8 + 2 = 10). Measure it with a habit bot
  against the solver's par. *Additive amounts make the order free.*
  Pressure Grid. bots.
- A hazard that is also a resource puts order into an additive puzzle:
  used first it pays, reached first by the passive system it costs.
  Check that both the pump-only and the habit bot lose moves to it.
  *A hazard that is also a resource makes order matter.* Pressure Grid.
  bots.

## Time pressure and input

- A decay rate (or a bleed that undoes actions) turns a puzzle into a speed
  test: sweep the bot's action rate; charge decay per action when decisions
  should matter more than speed. An action budget doesn't fix it while a
  passive system undoes actions over time. *A decay rate turns a puzzle into
  a speed test.* Orbit Garden, Pressure Grid. bots; players (n=1) agree.
- Sweep the action rate even when every verb costs a resource: anything
  that regrows on a clock (a rival right after a cut) makes it a race; give
  it a rest after each setback. *A real-time rival turns a budget game into a
  speed test.* Mycelium. bots.
- For hold verbs, sweep reaction lag separately from think time, and keep
  the held value's rate of change slow next to a ~0.3 s human reaction.
  Keep every warning-to-failure delay above reaction time. *Sweep reaction
  time apart from think time.* Hot Iron, Loom. bots.
- Every input device must reach every verb. *A still screen that's still
  winnable reads as broken.* Terrace Garden. players (n=4).
- An idle/"stuck" detector must tolerate the input's own noise (tilt,
  settling particles); test it with a noisy bot. *A hint that waits for
  stillness never shows in tilt mode.* Bubble Glass. players (n=2) confirm
  the fix.

## Bots vs people

- Bots model skilled play: add a `novice` bot that makes the obvious first
  guesses, and check a round survives 2–3 wrong taps and a budget has slack
  for mistakes. *Bots model skilled play, not the first minute.* Hot Iron.
  players (n=2) agree.
- Write the telemetry's habit as a bot (taps, seconds per verb, what's left
  at a loss) before trusting any `novice`. *A still screen that's still
  winnable reads as broken.* Terrace Garden. players (n=4).
- Read the rows for what players already do right before assuming they
  don't know a verb; a bot at a slightly wrong threshold can match telemetry
  better than one doing the wrong thing. *A player can know the verbs and
  miss the moment.* Hot Iron. players (n=1).
- Bots at 70–89% lost to a first-time human 4 of 5 times: treat bot win
  rates as optimistic for new players. *First player data vs the bots
  (2026-09-28).* Several games. players (n=1–3).

## Onboarding and readability

- The first round is a hook, not a test: if a novice bot's first round
  takes over ~40 s, add a warm-up or a speed-up. *Onboarding: the first
  round is a hook, not a test.* Ant Trails. feedback (n=1).
- If a round can reach a still state that only an unknown verb breaks, show
  that verb then, or end the round. *A still screen that's still winnable
  reads as broken.* Terrace Garden. players (n=4).
- If success depends on a threshold in a continuous display (a colour, a
  level), show the threshold where the player acts. More lives don't teach
  an invisible rule. *A player can know the verbs and miss the moment.* Hot
  Iron. players (n=1).
- A hint needed before the first move is on screen from the start; every
  hint has a minimum time on screen. *A hint that waits for stillness never
  shows in tilt mode.* Bubble Glass. players (n=2).
- Messages get their own strip, never drawn over the play area, and the
  layout refits on every level change, not only on resize. Screenshot
  every level at phone sizes (portrait and landscape) with a hint showing.
  *Text over the board and a stale fit read as broken.* Rail Yard.
  feedback (n=1).

## Depth and replay

- If a second round shows nothing new, players leave after one round
  whatever the balance. Variety lives in what the 2–3 verbs face. *One round
  shows everything, so players leave after one round.* feedback (n=1).
- Carry state between rounds so early mistakes still matter later; keep
  round 1 gentle and let a lost round be retried from its start. *Carry-over
  makes the second verb pay more each round.* Ant Trails. bots.
- A general trick beats a set of levels: write the one-line rule a player
  would use after level 1 as a bot (`habit`) and make each later level fail
  it, with rules (which piece, which strand), not sizes. A penalty that
  relieves the constraint doesn't teach. *A general trick beats a set of
  levels; break it with rules, not sizes.* Loom. feedback + bots.
- In a memory game, a load of k + 1 is solved by elimination (and one peek
  settles k + 2): a rule can't break a k-coat habit until load ≥ k + 3, so
  shifts below that are tutorials whatever their rule. *Memory load at most
  k + 1 is solved by elimination.* Coat Check (pre-build). bots.
- Run a bot over the generator for every achievement: a condition the
  generator's caps never produce (a full cloakroom when arrivals stop at the
  load target) is a dead achievement. *An achievement can ask for a state
  the generator never makes.* Coat Check. bots.
- Optional collectibles only add a route if the direct solution misses
  them: run the shortest-route bot and count what it picks up by accident,
  then move those (a sweep along one wall took 2 of 3). One free pickup on
  the first level teaches what they are. *A collectible must sit off the
  solution's lanes.* Aqueduct. bots.
