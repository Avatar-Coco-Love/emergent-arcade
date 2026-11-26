# Findings: Depth and replay

Part of the findings checklist; index, evidence tags and how to add one in
[../findings.md](../findings.md). The full story behind each rule is in
[../findings-log.md](../findings-log.md) under the heading in *italics*
(grep it, don't read the whole log).

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
- A new kind of shared seeded run can ride the daily protocol with no game
  change: hand the game a seed shaped like the date it already parses but
  outside every real date (month 13+), and send its score under another
  name, because the board builder takes any scored round without `daily`
  as a leaderboard row. *A class challenge rode the Daily's date field.*
  Class challenge PR. tests (`test-daily.mjs`).
- With a resource carried between levels, balance the run, not the level:
  per-level win rates (lure60: 90/72/97/58% on nights 3-6) hide the flock
  bleeding ~8 birds a night, which a whole-run bot shows (25/60 chapters
  cleared). Add a run mode to the harness before tuning single levels.
  *Per-level win rates hide a carried resource bleeding.* Murmuration v8. bots.
- Recalibrate which bot stands for a human once humans have played: the
  brief assumed `lure60`, but 2 players won all six v8 nights first try,
  night 6 in 33 s (lure60 58% / 53 s, lure80 93% / 26 s), and called it
  too easy. Chapter 2 was tuned to `lure80`. *Humans outplayed the bot
  chosen to stand for them.* Murmuration v9. players (n=2) + bots.
- An obstacle that kills on contact needs avoidance that holds until
  near panic: scaled linearly with fear (like the edges), bots lost 10-20
  birds a night on rocks, mostly half-scared birds from crowding and the
  lure ring; with (1 − (fear/PANIC)³) it fell to 0-2 and only panic or a
  startle beside a rock costs birds. *Linear fear scaling made rocks kill
  half-scared birds.* Murmuration v9. bots.
