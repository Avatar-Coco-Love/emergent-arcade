# Findings: Bots vs people

Part of the findings checklist; index, evidence tags and how to add one in
[../findings.md](../findings.md). The full story behind each rule is in
[../findings-log.md](../findings-log.md) under the heading in *italics*
(grep it, don't read the whole log).

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
