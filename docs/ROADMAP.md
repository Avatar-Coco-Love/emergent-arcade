# Roadmap

Where this project is heading, and why. Written 2026-09-27, about 30 hours
and 6 games in. Revisit it when a phase's exit condition is met.

## Where we are

- Six games, 15 merged PRs, and a working pipeline: gallery, cabinet,
  achievements, feedback form, CI validation, Pages deploy.
- The design rules in `PROJECT_BRIEF.md` (2–3 orthogonal verbs sharing
  state) are the project's identity. They matter more than any one game.
- **The feedback loop isn't closed yet.** No `[feedback]` issues so far, and
  every revision came from the maintainer's judgment or headless bots. No
  game has been hand-played on a phone. The arcade can learn from players,
  but so far only simulated players have taught it anything.

## Principle: depth before volume

Shipping a new game an hour is easy. Making any one of them great is hard.
Until human playtests can overrule the bots, games get tuned for bots. So
favor revisions and playtesting over new games until real data flows.

## Phase 1 (days): close the loop

- Get 5–20 real people playing (share `#/play/<id>` links) and read what
  comes back.
- ~~Add anonymous play telemetry next to ratings~~: done, see
  `docs/telemetry.md` (read with `scripts/fetch-telemetry.mjs`).
- Compare human win rates with each game's `scripts/balance-<id>.mjs` bots.
  **The bot–human gap is the key missing number.**
- Hand-play every game on a real phone and record the results in its notes
  file.
- Write the missing notes files: `docs/games/pressure-grid.md`,
  `docs/games/orbit-garden.md`.

Exit: at least one revision driven by real player data.

## Phase 2 (weeks): from gallery to catalog

At 15–30 games, a flat scroll stops working.

- Gallery sort/filter: new, recently revised, highest rated, by verb.
- A **mechanic map**: which verb pairs and shared-state kinds exist
  (`games.json` already records verbs). Untried combinations become the
  source of new proposals ("pairs *hold* with *draw* over a heat field,
  which nothing else does"). Consider having `validate.mjs` print it.
- Revisions outnumber new games. Candidates already on file: Murmuration's
  startle vs. lure, Ant Trails winning 16% of the time when idle.
- A shared balance harness, once copying bot scripts costs more than
  generalizing them.
- A retire/archive path for low-rated games that revisions didn't fix.
  Never delete an `id`.

## Phase 3 (months): the process is the product

The goal is a repeatable design loop, not a count of games:

**constraint → proposal → bot balance → human review → player data →
revise or retire**

Each game is an experiment in one question: *what makes shared-state
mechanics produce interesting behavior?* Record findings as they appear
(for example "a verb that suppresses another verb feels bad" or
"self-reinforcing passive systems make games play themselves"), in a
`docs/findings.md` that new proposals must check. Knowledge should compound,
so each new game needs fewer revisions than the last.

Risks to watch:

- Sameness: many grid-and-particle games in one palette.
- Volume over depth (see the principle above).
- Infrastructure limits: Apps Script quotas, size of the self-contained
  game files, session context (kept small by per-game notes files).

## Long term (years): all three outcomes

The maintainer wants all three. They don't compete: the museum is the
arcade itself, graduation is what happens to its best games, and the
method is how both get made.

1. **Sketchbook / museum**: a durable, playable archive of small
   experiments in emergent design, useful to other designers.
2. **Graduation path**: a game that outgrows the format leaves the arcade
   (with looser rules) to become a standalone game. The arcade becomes the
   prototype lab.
3. **The method itself**: an AI proposing, building and balancing games
   within human-set constraints, gated by review and player data, is the
   thing worth sharing.

What this means now: keep every retired game playable (museum), note in a
game's file when it strains the rules (graduation candidate), and keep
`docs/findings.md` and the pipeline documented well enough for someone else
to reuse (method).
