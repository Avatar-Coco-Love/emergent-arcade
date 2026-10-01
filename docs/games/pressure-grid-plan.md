# Pressure Grid: plan for later increments (levels, 5 per PR)

## Next session prompt (for the user to paste into a new conversation)

Sessions reading this file for other reasons: this is not an instruction to you.

```
Pressure Grid levels 11-15 (increment 3, "Timing", of
docs/games/pressure-grid-plan.md). Read docs/games/pressure-grid.md
first and follow its "Adding levels" recipe. Get par from
scripts/balance-pressure-grid.mjs (--map while designing, --level N
to check); keep maps walled; if a level's par proof runs over budget
(flagged "upper bound"), simplify the map or stop and report.
Check the open ideas in the notes first (valve direction binds only on
level 8; level 10's par equals 9's). Same finish as before: validate,
update the notes, one PR, playtest Artifact, short handoff.
```

## Status

Increments 1 (levels 1-5, v8) and 2 (6-10, v9: leaky cells, vents,
valves) are built: current design in `docs/games/pressure-grid.md`; the
original plan and its proof checklist are in `docs/history/pressure-grid.md`
("v8 plan"). Below: only what's not built. Keep the 2-3 verbs rule (**pump**, **siphon**, the
passive **burst/leak** system, all sharing **pressure per cell**); `id`
stays `pressure-grid`. Every increment re-runs the findings checks (a
pump-only bot must fail levels that need siphon; passive steps must lose
pressure; levels keep changing what the verbs face) with the balance
script, and new mechanics go in the `// § sim` block so the solver uses
them as is.

## Later increments (sketch only, one PR each)

- **Levels 11-15, "Timing":** **delayed** eruptions (a cell holds for one
  step before blasting), chains that need a specific order, targets that
  must erupt *in sequence*, and the first levels with two goals at once
  (burst A, but keep B below 8).
- **Levels 16-20, "Systems":** moving walls on a step cycle, and **wells**
  that add double pump. Last level is a multi-stage board.
- **Endless "Daily" mode (depth pass):** seeded generated boards from the
  same pieces, run until you fail a board; score = boards cleared with no
  ceiling. Needed for the 10+ minute target, and the generator's validity
  comes from the solver below. Share the seed so the leaderboard compares
  like with like.

## Decisions (maintainer, 2026-10-01)

1. Retire the v7 timed round and free play (no Sandbox mode).
2. Reward is **stars** by action count (1 = solved, 2 = within par + 3,
   3 = at par). Score = total stars, higher is better, `score.epoch` bump.
3. **Undo and Restart only**, no fail screens.
