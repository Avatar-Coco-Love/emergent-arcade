# Surprise Party: design notes

v2 (2026-10-04, Daily Challenge; v1 same day). Brief: `docs/ideas/surprise-party.md`. Go/no-go runs and
superseded house designs: `docs/history/surprise-party.md`.
Harness: `node scripts/balance-surprise-party.mjs [trials] [1|2|both]`
(cuts the `// § sim` block out of the game; `show <id>`, `gen [n] [k]` dev
modes). Playtest (private Artifact): https://claude.ai/artifact/Rm7Soae7ZjRPdG1pLDb9wj

## Daily Challenge (v2)

`?daily=<date>` (the gallery's `#/daily`, [daily.md](../daily.md)): the game
opens straight into a Party Season with `season.seed = dailySeed() % 1e9`
(FNV-1a of `surprise-party:<date>`), the same houses for everyone. Each
season now has its own `run` id (`season.id`; campaign rounds keep the
page's). Season results carry `daily`; `seasonOver()` posts `arcade:final`
(`score` = parties). The houses menu still opens the campaign (those
results aren't daily). Open: no chapter 1-2 tutorial before the season.

## How it works

- 8 moves, 6:00 to 7:45; after each, the clock ticks 15 minutes. Moves:
  whisper ({tap} a guest who hasn't heard, one envelope), door ({hold} a
  door 0.32 s, ring), wait (button, Space/W).
- Tick: everyone who *just* heard tells everyone within 2 walking steps
  (4-way, through floor, guests, open doors), then goes quiet (party hat).
  A whispered guest tells on the tick right after the whisper.
- Loss: the birthday person hears on a tick before 8:00. News reaching them
  on the last tick is fine; guests reached on it count.
- Win: everyone knows after the 8:00 tick. Stars: 3 at par (fewest
  whispers, from the solver), 2 at par + 1, 1 otherwise.
- Readability: dashed ring = hears next tick if the clock moves on; pink
  tint = the birthday person's 2-step zone (doors as they are); red ring on
  the birthday person = they hear next tick. The solver runs after every
  move (30 ms later, so the ripple starts at once) and warns, with no false
  alarms, when a spoil is unavoidable or not everyone can hear any more.
- Wide houses turn a quarter on tall screens when that gives bigger cells.

## Campaign (15 houses, `HOUSES` in the sim block)

| ch | houses | rule |
|---|---|---|
| 1 Invitations | 1-1 First whisper, 1-2 Next door, 1-3 Three rooms, 1-4 Two parties (2 env), 1-5 The long hall (whisper the middle early) | no birthday person, no doors |
| 2 The birthday person | 2-1 The den (intro), 2-2 The junction, 2-3 A friend inside, 2-4 Trust the clock (doors optional), 2-5 Two doors | dead-end den |
| 3 The hallway | 3-1 The hallway, 3-2 Beside them, 3-3 Downstairs, 3-4 Long way round, 3-5 Full house | their room is the hallway |

The chapter 2–3 houses are built on one idea from the go/no-go: a guest at
a 3-way junction just outside the birthday person's door. Whisper-only must
pay a whisper per deep branch behind that guest; a door shut as the wave
passes pays nothing. In chapter 3 the hallway's wing doors feed relay
guests toward the ones beside the birthday person, timed for 7:45–8:00.

Envelopes per house = the most the house can give while whisper-only (and
in chapter 3, doors-first) still loses (`spare` line in the harness).

## Party Season

- `seasonHouse(seed, k)`: the junction template (den 45%, hallway 55% from
  party 2), wing length 3–4, upper row 1–4, random shut doors, den friend
  or guests beside the birthday person, random flips. Kept when par ≤ 3,
  3+ decisions, whisper-only loses (and doors-first for a hallway).
  13–26 guests; median 55 ms, worst seen ~2 s (40 tries), shown as
  "Planning the next party…".
- Envelopes: start 2, each party adds its par. Undo works, but an undone
  whisper stays spent; Restart (or a lost house) keeps what was spent. The
  season ends when the pool can't win the house in play. Score = parties.

## Balance (v1, 100 novice trials)

Novice = % still winnable after 2 wrong taps (no undo; a wrong whisper never
picks a guest in the tinted zone). `wo` = whispers whisper-only needs.

| house | guests | doors | env | par | decisions | wo | novice 2 / 3 taps |
|---|---|---|---|---|---|---|---|
| 1-1 … 1-5 | 7–16 | 0 | 1–2 | 1–2 | 1–2 | = par | 54–98 / 53–100 |
| 2-1 The den | 9 | 1 | 1 | 1 | 2 | 2 | 65 / 56 |
| 2-2 The junction | 18 | 2 | 2 | 1 | 3 | 4 | 72 / 54 |
| 2-3 A friend inside | 19 | 2 | 3 | 2 | 4 | 5 | 36 / 26 |
| 2-4 Trust the clock | 9 | 1 | 1 | 1 | 1 | 1 (on purpose) | 70 / 54 |
| 2-5 Two doors | 21 | 3 | 2 | 1 | 3 | 3 | 51 / 27 |
| 3-1 The hallway | 20 | 4 | 2 | 1 | 3 | 4 | 45 / 19 |
| 3-2 Beside them | 21 | 4 | 3 | 2 | 4 | 5 | 26 / 12 |
| 3-3 Downstairs | 21 | 4 | 2 | 1 | 3 | 4 | 37 / 23 |
| 3-4 Long way round | 20 | 4 | 2 | 2 | 5 | 6 | 14 / 10 |
| 3-5 Full house | 22 | 4 | 3 | 2 | 4 | 5 | 29 / 18 |

Checks (all PASS): every house solvable; whisper-only fails every chapter
2–3 house but 2-4; doors-first and habit fail every chapter 3 house; 3+
decisions (except 2-1 intro, 2-4); every achievement reachable by a bot
(word-of-mouth on 1-2 and others, just-in-time on 2-3/2-4/2-5 and chapter 3,
open-house on 2-4); novice median 54% after 2 wrong taps, 53% after 3.
The median is carried by chapters 1–2: **chapter 3 alone is 29% / 18%**.

Party Season (30 runs, cap 40 parties): finding par every house 40; 90% of
houses 27 (p10 9); 75% 11 (p10 7, 50% reach 10 = Party Planner); 50% 5.
Slowest house generation 1.9 s (rare); typical under 0.3 s.

## Telemetry fields

`level` 1–15 campaign, 16+ = Party Season party k+1; `attempt`; `reason`
`spoiled` / `missed`; `score` (season only) = parties. `stats`: whispers,
doors, waits, undos, par, env, guests, heard, stars, ch, turn (moves made),
pool (season: envelopes left).

## Changes from the brief

- Door is a `{hold}`, not a tap: `validate.mjs` needs distinct verbs, and a
  hold guards against toggling a door by accident (each costs 15 minutes).
- Party Season allows Undo but an undone whisper stays spent (no undo made
  one wrong tap end a season: 2 parties median for a bot with 1 slip per
  house); the score then measures finding par.
- "Open house" is earned on 2-4 *Trust the clock*, the one chapter 2–3 house
  whisper-only can win; every other one needs a door.
- Fresh for 1 turn (tells once). Fresh for 2 lets a door hold a wave a turn
  (3-1's par 2 → 1) but barely helps the novice and solves 4× slower: a
  candidate later chapter.

## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): keys only wait/undo/restart (whisper, doors need a pointer); label doesn't name the verbs; no live region; canvas `role="img"`.
- Novice (no undo, random slips) after 2 wrong taps: chapter 3 median 29%
  (3-4 *Long way round* 14%). Undo and the spoil warning are the safety net;
  watch human retries and undos per house in telemetry.
- Chapter 3's spare envelope is capped by doors-first (each hallway side
  costs one timed whisper with every door shut); a third shut-off room
  would raise it.
- Season houses all come from one template: variety is in sizes and door
  states. Next: more templates (two dens, a hallway with a room below).
- v2 chapters from the brief: wandering birthday person, the gossip (3
  steps), phones, headphones, the dog.
