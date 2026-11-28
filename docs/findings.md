# Findings

What the arcade has learned about shared-state mechanics (`docs/ROADMAP.md`,
phase 3), as checks to run on every new game and revision. The checklist is
split by theme (`docs/workflow.md`, scaling plan): read this index, then the
theme files the task touches. One rule per line; the evidence and the full
story are in `docs/findings-log.md` under the heading in *italics* (grep it,
don't read the whole log). To find a rule by its heading:
`grep -rn "heading words" docs/findings/`.

Evidence tags: **bots** = balance bots only (provisional), **players** =
telemetry or feedback agrees, **n** = players behind it, **audit** =
`scripts/a11y-audit.mjs` ([accessibility.md](accessibility.md)).

Adding one: write the full entry at the bottom of `docs/findings-log.md`,
then add one line to the right theme file below. If a later result confirms
or overturns a rule, update its tag there and add the evidence to its log
entry. Keep each theme file under ~8 KB; split a theme before it passes that.

## Themes

| Theme | File | Rules | Read when |
|---|---|---|---|
| Systems: does the shared state really drive play? | [findings/systems.md](findings/systems.md) | 27 | any new game, verb or balance revision |
| Time pressure and input | [findings/time-and-input.md](findings/time-and-input.md) | 7 | real time, hold/drag verbs, decay, tilt |
| Bots vs people | [findings/bots-vs-people.md](findings/bots-vs-people.md) | 4 | trusting bot win rates, writing a `novice` or habit bot |
| Onboarding and readability | [findings/onboarding.md](findings/onboarding.md) | 6 | first round, hints, messages, layout |
| Depth and replay | [findings/depth-and-replay.md](findings/depth-and-replay.md) | 12 | levels, carry-over, achievements, Daily, depth pass |
| Accessibility | [findings/accessibility.md](findings/accessibility.md) | 38 | keyboard, live region, colour, motion, audit |
