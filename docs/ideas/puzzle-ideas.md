# Procedural puzzle ideas (2026-10-02 discussion)

Index of six generated-puzzle ideas, one file each. None is built or
approved. Format follows `docs/ideas/tidewright.md` (a brief, not a spec).

## Why discrete, generated puzzles

The 14 games so far are continuous simulations: pressure, fire, ants,
springs, fluids, rail. Discrete puzzles fill a gap none of them covers. The
roadmap asks for depth (10+ minutes, a score with no ceiling) and the brief
requires 2-3 orthogonal verbs that share state. A generator plus a solver
gives three things for free:

- **Solvability:** build each puzzle by scrambling a solved state, or check
  it with a solver.
- **Par:** the solver's optimum becomes the score target.
- **Difficulty ramp:** one generator parameter gives an endless, harder
  sequence.

It also makes balance bots easy, since the solver is the bot.

## The ideas

1. `counterfeit-scale.md`: information theory (weighing puzzle).
2. `gear-lock.md`: group theory, modular arithmetic (coupled rings).
3. `cipher-bench.md`: cryptanalysis, language statistics (substitution
   cipher).
4. `lights-out-gf2.md`: linear algebra (toggle grid).
5. `deduction-grid.md`: logic (Mastermind-style).
6. `factor-forge.md`: number theory (build a number from primes).

## Recommendation

- **Build first:** Counterfeit Scale. Cleanest verb coupling, strongest
  "learn the principle by playing" effect, an unbounded ramp, and the
  smallest to build.
- **Second:** Cipher Bench, because it opens a new subject area.
- **Third:** Gear Lock.
- **Hold:** Lights Out and Factor Forge.

If we build one: seeded generator, solver as the bot, par score. A daily
seed is optional and cheap. Check `docs/findings.md` against the verb design
before coding, as CLAUDE.md requires.

## Open question

Counterfeit Scale is built (v1, 2026-10-02): notes in `docs/games/counterfeit-scale.md`.
