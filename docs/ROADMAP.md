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

**Update 2026-09-29:** the maintainer wants more games alongside the
revisions, to give players more choice and bring in more data. New games
are back on, one per PR, still checked against `docs/findings.md` and
balanced with a `novice` bot before they ship. Revisions from player data
still come first when there is any.

**Update 2026-09-30:** Phase 1's exit is met. Bubble Glass v2 was a
revision driven by one player's rating and telemetry, and the replay on a
phone confirmed it (level 2: 0% → 100%, all five boxes won, tilt mode).
Playtesters' verdict on the arcade as a whole: **not enough oomph**. Games
should hold a player for 10+ minutes, with a best score to beat and a
leaderboard. Scores, bests and leaderboards now exist for every game
(`docs/scores.md`); the depth pass below is the next phase.

**Update 2026-10-04:** a **Daily Challenge** (`docs/daily.md`) features
one game a day with the same seeded run for everyone, a daily board (first
runs only) and a shareable result card. It concentrates the few players
on one game and one set of levels, so a day's results compare with each
other and with the bots. Games join the rotation in their depth-pass PRs
once they have a seeded generator (first three: Coat Check, Counterfeit
Scale, Surprise Party).

**Update 2026-10-07:** about 50 PRs merged in a week, but only 43 players
in total, 2–3 on most game versions, and 0 classroom reports. Building
had got ahead of learning. Two session rules in `CLAUDE.md`: no further
revision of a game whose current version has fewer than 3 players (bugs,
crashes, accessibility and the first depth pass excepted), and every
handoff makes a "build or go learn" call with its numbers.

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
- ~~Write the missing notes files~~: done, with new bot harnesses
  `scripts/balance-orbit-garden.mjs` and `scripts/balance-pressure-grid.mjs`.
  First entries are in `docs/findings.md`. Top revision candidate from bots:
  Pressure Grid's self-sustaining eruption storms.

Exit: at least one revision driven by real player data.

## Phase 1.5 (now): the depth pass, 10 minutes per game

Target: **a player who likes a game finds 10+ minutes of new challenge in
it**, and a score with no ceiling to chase afterwards. Baseline (telemetry,
2026-09-30): no player has reached 10 minutes in any game. Longest per
player: Terrace Garden 9:04, Ant Trails 8:39, Bubble Glass 7:55, the rest
2–4 minutes.

One game per PR, same loop as always (findings check, bots, notes file).
Each revision:

- **Keeps the 2–3 verbs.** Depth comes from what they face: new layouts,
  threats, materials, carried-over state (findings: "One round shows
  everything", "Carry-over makes the second verb pay more each round").
- **Escalates**: a longer campaign (more levels or days), or a mode that
  keeps going after the goal and gets harder until the player fails. Round
  1 stays gentle; a lost stage is retried from its start.
- **Posts its own `score`** with no ceiling (points, depth reached,
  levels × time) and bumps `score.epoch`. Optionally shows the best from
  `arcade:best` in its HUD.
- **Proves the length** with bots: a hinted or novice bot needs 10+ minutes
  to see all the content, or a skilled bot's median endless run is past 10
  minutes but not forever. After merge, `fetch-telemetry.mjs` prints the
  10-minute line per version.
- Avoids a decay rate that turns the long mode into a tap-speed test
  (findings: "A decay rate turns a puzzle into a speed test").

| Game | Ver | Now | Depth direction (a proposal, not a spec) | Status |
|---|---|---|---|---|
| bubble-glass | v4 | 21 boxes in 3 chapters (was 5 levels, ~1.5 min) | More boxes from the Evolution list (sand types, second bubble, fixtures), grouped in chapters; score = total time over a chapter | Depth pass done (v3–v4), chapter time score; awaiting playtest |
| ant-trails | v5 | 6-day run | Endless days after day 6 with rising twists; score = days survived |  |
| terrace-garden | v2 | warm-up + 3 gardens | More gardens with new terrace shapes, water carried over; score = water left over the run |  |
| pressure-grid | v9 | Levels 1–10 with stars (was a 60 s challenge) | Stages with rising targets on new grid shapes; score = eruptions over the run | In progress: levels 1–5 (v8), 6–10 (v9); plan: `docs/ideas/pressure-grid-plan.md`, 5 levels per PR |
| orbit-garden | v9 | Voyage: 8 gardens (rocks, moons, wild planets), then mirrored laps that wither faster | Successive gardens, leftover seeds carry over; score = gardens bloomed | Depth pass done (v9), awaiting playtest |
| hot-iron | v4 | 1 blade | A run of commissions, harder profiles, fuel carried over; score = blades forged |  |
| loom | v2 | 7 shapes | Endless shapes after 7, snapped strands still carried; score = shapes held |  |
| murmuration | v8 | Chapter 1: 6 nights, flock carried over (+ Classic night) | Nights in a row with new gate layouts, the flock carried over; score = gates cleared in a migration | Depth pass started: chapter 1 (v8), awaiting playtest; next the gallery save/load PR, then chapter 2 (`docs/games/murmuration-story.md`) |
| wildfire-line | v3 | 1 fire | Fire seasons with more houses and wind shifts; score = houses saved |  |
| hourglass-delivery | v3 | 8 glasses | Endless belt that speeds up by glasses filled, not by time; score = glasses filled |  |
| island-census | v1 | 8 seasons | Endless years with new events; score = seasons survived |  |
| tidewright | v1 | Endless seasons of 6 waves | Built with depth (endless, score = waves held); revise from playtest | New game |
| rail-yard | v2 | 10 levels, 2 chapters | Built with depth (score = yard points over the run); more chapters if playtests ask | New game |
| aqueduct | v6 | Warm-up + 5 levels, free pour | More levels; score = pearls, bullseyes, water brought home | New game (v5); v6 fixes phone tilt |
| geode | v1 | Endless geodes, 3 chambers | Built with depth (score = carats banked over the run); revise from playtest (run length, shatter vs thin) | New game |

Order: the games players already stay longest in first (they're closest to
10 minutes and show what works), then the rest by rating. Revisions from
player feedback still jump the queue.

## Phase 2 (weeks): from gallery to catalog

At 15–30 games, a flat scroll stops working.

- Gallery sort/filter: new, recently revised, highest rated, by verb.
  Built: topic tags (subjects and skills, fixed list in `assets/topics.js`)
  with chips, `?topic=`, search and the ⓘ panel; the mechanic map shows
  verbs × topics.
- A **mechanic map**: which verb pairs and shared-state kinds exist
  (`games.json` already records verbs). Untried combinations become the
  source of new proposals ("pairs *hold* with *draw* over a heat field,
  which nothing else does"). Built: `node scripts/mechanic-map.mjs` (verb counts,
  pair grid, untried pairs; `--verbs a,b` adds candidate verbs). Shared-state
  kinds are not in the manifest, so not mapped yet.
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
