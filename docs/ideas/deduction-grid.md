# Deduction Grid (idea, not built)

Category: generated puzzle, logic. Rank: unranked (listed fifth; not in the
recommended order, see `puzzle-ideas.md`). Status: proposed, not yet
approved.

- **Premise:** a Mastermind-style hidden arrangement. The generator checks
  that the clues give a unique solution.
- **Verbs:** *probe*, *eliminate* (rule out a candidate), *assert* (commit to
  a guess).
- **Why it works:** the solver check guarantees fairness. Score is probes
  used against the optimum. Difficulty ramps through grid size and clue type.
