# Findings: Systems: does the shared state really drive play?

Part of the findings checklist; index, evidence tags and how to add one in
[../findings.md](../findings.md). The full story behind each rule is in
[../findings-log.md](../findings-log.md) under the heading in *italics*
(grep it, don't read the whole log).

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
- A cleanup verb is free if the mess adds what the cleanup removes (an
  impurity that lands as a new site): make the mess take something (swap
  into an existing piece) and check the never-clean bot loses. *A mess that
  adds what the cleanup removes makes the cleanup free.* Geode. bots.
- A rate verb (temperature, speed) costs nothing where the budget, not the
  rate, limits progress: check which binds at each setting. *A rate verb is
  free while the budget binds.* Geode. bots.
- An income that thins with time can make a quota unreachable without
  ending the round: run the most careful bot to the end; give the round a
  visible clock or a loss. *A thinning income turns a quota into a soft
  lock.* Geode. bots.
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
