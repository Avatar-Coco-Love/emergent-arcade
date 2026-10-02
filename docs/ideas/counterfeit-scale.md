# Counterfeit Scale (idea, not built)

Category: generated puzzle, information theory. Rank: **build first** (see
`puzzle-ideas.md`). Status: proposed, not yet approved.

- **Premise:** one coin among N is off in weight. The player has a fixed
  number of weighings to find it.
- **Verbs:** *load* (move coins onto the pans), *weigh*, *mark* (tag coins as
  heavy, light or clean).
- **Shared state:** the suspect set. Weighing narrows it, marking records it,
  and loading is only worth doing if the player reads it.
- **Why it works:** best play splits the suspects into thirds, and players
  discover that rule themselves. Each level raises N and adds a hidden twist:
  sometimes the direction is unknown, sometimes there are two fakes.
- **Size:** about 150 lines, no physics. The cleanest verb coupling and the
  smallest to build.
- **Ceiling:** N grows without limit. Score is levels reached, or weighings
  saved against par.
- **Bot:** the solver is the bot (ternary split); par comes from it.
- **Before coding:** check `docs/findings.md` against the verb design.
