# Pressure Grid v8+: redesign proposal (levels, 5 per PR)

Status: proposal, not built. Written for a fresh session to pick up. Read
`docs/games/pressure-grid.md` (current v7 design), `docs/findings.md`, and
`docs/ROADMAP.md` (depth pass) first. Keep the 2-3 verbs rule: **pump**,
**siphon**, and the passive **bleed + eruption** system, all sharing
**pressure per cell**. `id` stays `pressure-grid`.

## Why change it (maintainer playtest, 2026-10-01)

| Complaint | Cause in v7 |
|---|---|
| Finger masher | Bleed is per second, so only tap rate matters (bots: spam6 wins 100%, every board-reading bot loses). Known flaw in the notes. |
| Don't understand what's going on | Pressure is colour only; bleed is invisible; a chain happens in one tick with no way to follow it; the goal is a count, not something on the board. |
| No clear objective | "100 eruptions in 60 s" says nothing about where or why. |
| Siphon is pointless | Pumping reaches every cell, so there is never a reason to move pressure. |
| No variety | One 10x10 grid forever. |

## Core idea: from a speed test to a placement puzzle

1. **Targets on the board.** Each level marks cells (ringed) that must erupt.
   The goal is visible and specific.
2. **Turn-based, not real-time.** Bleed and eruptions advance one *step per
   action*, not per second (same fix as Orbit Garden v6, see findings: "A
   decay rate turns a puzzle into a speed test"). No clock in levels. Taking
   your time never hurts, tapping fast never helps.
3. **Make siphon necessary.** Add cell types that block pumping, so
   pressure must be carried there:
   - **Sealed** cell: cannot be pumped, can be siphoned into/out of.
   - **Wall**: no pressure, blocks bleed, blasts and siphons.
   - **Well** (later): pump here adds double.
4. **Move budget and stars.** Each level has a par number of actions.
   Under par = 3 stars. Pump and siphon each cost one action, so choosing
   *where* beats mashing.
5. **Readable physics.**
   - Integer numbers in each cell, threshold shown (for example 8/12).
   - On hover/drag, a preview of where a blast or siphon would go.
   - Eruptions animate one wave at a time (about 250 ms per wave), with the
     chain count shown. "Cell burst, +3 to each neighbour" is visible.
   - A one-line hint per level, shown before the first move.
6. **Keep the old game as a mode.** v7's timed round and free play stay as
   "Sandbox" (own score epoch) so nothing is lost and the telemetry history
   keeps meaning something.

Suggested starting numbers, to be tuned with the solver below: threshold
12, pump +4, blast +3 to each neighbour, siphon moves half (rounded down) and
loses 1, bleed 1 step per action splitting 20% among neighbours. Check
that every eruption still loses pressure (findings: "Passive systems that
create more than they cost play themselves").

## Increment 1 (this first PR): levels 1-5, "Learn the pipes"

Small boards (5x5 to 7x7) so the numbers are readable on a phone.

| # | Board idea | Target | New lesson |
|---|---|---|---|
| 1 | 5x5, empty | one ringed cell next to the centre | Pump a cell 3 times and it erupts |
| 2 | 5x5 | three ringed cells in a row | A blast pushes pressure into neighbours: pump the middle, chain outward |
| 3 | 5x5, one sealed ringed cell | the sealed cell | It can't be pumped. Pump a neighbour, then **siphon** into it |
| 4 | 6x6, wall splits the board | one target each side | Bleed and blasts don't cross walls; siphon can't either. Plan two separate builds |
| 5 | 7x7, mix | five ringed cells, two sealed | All of the above; par is about 14 actions. First level where a wrong order costs you |

Level 1-2 par is generous, 3-5 get tight. Stars: 1 = solved, 2 = within par + 3,
3 = at par. Locked until the previous level is solved. Progress saved via
the gallery's score/`arcade:best` channel (see `docs/scores.md`).

Achievements: keep the existing six if they still make sense in a level game
(First Pop, Chain Reaction, Siphon Strike, Plumber, Century is replaced by
"3 stars on levels 1-5"), and add two that need the new mechanics (burst a
sealed cell, solve a level with a siphon-only finish). Update the manifest
`goal`, `howToPlay`, `blurb`; keep `{tap}`/`{hold}` wording rules.

Score: **stars (and levels cleared)**, higher is better; bump `score.epoch`
to 2. Telemetry: post `arcade:result` per level with `stats`: level, actions,
par, siphons, max_chain, stars.

## Later increments (sketch only, one PR each)

- **Levels 6-10, "Pressure in motion":** one-way **valves** (siphon only in
  one direction), **vents** that drain pressure (a cell you must not let
  fill), and **leaky** cells that bleed double. Levels where a siphon must
  *cross* a danger.
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

## How to prove it (before shipping)

- **Solver bot:** `scripts/balance-pressure-grid.mjs` gains a breadth-first
  or best-first solver over actions. It proves each level is solvable,
  computes the true minimum (par comes from this, not a guess), and counts
  how many distinct solutions exist (want 2+ on later levels, but not a
  trivial single obvious path).
- **Findings checks to run** (`docs/findings.md`):
  - "A verb only shares state if succeeding needs to read it": a bot that
    ignores siphon must **fail** levels 3-5.
  - "When two things always move apart, turning alone can separate them":
    search for a single-verb win with an exploring bot, not only greedy.
  - "One round shows everything": levels must keep changing what the
    verbs face. The table above is meant to do that. Re-check at level 5.
  - Passive system must lose something each step (check bleed/eruption
    conservation numbers with the solver).
- A novice bot (random legal moves, or greedy "pump the target") should
  clear levels 1-2 and fail 4-5.
- **Real browser check:** Playwright at phone size (about 390x844): numbers
  readable, previews appear on touch drag, no scrolling, `arcade:pause`
  and `arcade:resume` still work.
- Normal pipeline: `node scripts/validate.mjs`, update
  `docs/games/pressure-grid.md` (move superseded v7 balance to
  `docs/history/pressure-grid.md`), bump `version`/`updated`, add a
  `changes` entry, private playtest Artifact link in the PR body.

## Open questions for the maintainer

1. Keep the v7 timed round as a "Sandbox" mode, or retire it?
2. Is "stars by action count" the right reward, or would you prefer
   no par and a plain level count?
3. Should failing exist (a vent fills, move budget runs out), or should
   levels only be solved or undone? The proposal assumes undo plus
   restart, with no fail screen for increment 1.
