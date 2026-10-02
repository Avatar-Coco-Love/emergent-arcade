# Gear Lock (idea, not built)

Category: generated puzzle, group theory and modular arithmetic. Rank:
**third** (see `puzzle-ideas.md`). Status: proposed, not yet approved.

- **Premise:** coupled rings, where turning one ring also nudges its
  neighbours. The player turns them back to a target.
- **Verbs:** *turn* a ring, *clutch* (decouple a ring pair, a limited
  resource), *peek* (preview the cascade).
- **Generation:** a random walk from the solved state, so every puzzle is
  solvable by construction.
- **Why it works:** players learn that order matters and that moves undo.
- **Risk:** the findings say a verb shares state only if success requires
  reading it. The clutch has to be necessary, not optional. Prove it with a
  bot that never uses the clutch (see the Rail Yard "route verb" rule in
  `docs/findings.md`).
