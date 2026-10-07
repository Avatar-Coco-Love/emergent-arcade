# Surprise Party: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/surprise-party.md`. Add new entries at
the top; sessions don't read this file by default.

## Party Season economy, v1 (moved from the notes, v4)

Party Season (30 runs, cap 40 parties): finding par every house 40; 90% of
houses 27 (p10 9); 75% 11 (p10 7, 50% reach 10 = Party Planner); 50% 5.
Slowest house generation 1.9 s (rare); typical under 0.3 s.

## Changes from the brief (moved from the notes, v4)

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

## Go/no-go re-run: chapter 3 rebuilt (2026-10-04)

The hallway houses are now built like 2-1: a junction guest sits in the room
right above the birthday person's door, the birthday person stands in the
hallway below, and the hallway relays from each wing's end door carry the
wave toward the guests beside them. 3-1 *The hallway*: relays end 2 steps
from the birthday person. 3-2 *Beside them*: guests right beside them,
linked through them, plus a lone guest at the far right. The old 3-1 and
3-2 (U-shaped rooms, Crossroads) are in the first run below.

Harness changes: a `spare` line (the most envelopes the house can give while
whisper-only, and for chapter 3 doors-first, still lose), and the novice's
wrong whisper never picks a guest inside the tinted danger zone (the game
shows that zone; whispering there is a choice, not a slip).

| house | env | par | decisions | wo | spare max | doors-first | novice 2 taps (any / slips / +1 env) | 3 taps |
|---|---|---|---|---|---|---|---|---|
| 1-3 | 1 | 1 | 1 | 1 | - | win | 65 / 80 / 91 | 58 |
| 2-1 | 2 | 1 | 3 | 4 | 3 | win | 73 / 59 / 68 | 39 |
| 2-2 | 3 | 2 | 4 | 5 | 4 | win | 41 / 41 / 44 | 20 |
| 3-1 | 2 | 1 | 3 | 4 | 2 | fails (3 env) | 44 / 63 / 60* | 14 |
| 3-2 | 3 | 2 | 4 | 5 | 3 | fails (4 env) | 27 / 35 / 46* | 12 |

\* +1 env would let doors-first win, so chapter 3 can't use it.

Plans: 3-1 `· · d2 w3 d0 · · ·` (shut the birthday door, whisper the
junction at 6:45, open the right wing's door at 7:00); 3-2
`· d0 d2 w11 · · · w18` (open the wing door, shut the birthday door,
whisper at 6:45, the lone far guest at 7:45).

Checks: rules, whisper-only, doors-first, habit, decisions all PASS.
Novice median after 2 wrong taps **44%** (was 31%, target 50%) FAIL; after
3, **20%** (target 25%) FAIL. Whisper-only now needs 4–5 envelopes on every
chapter 2–3 house (par 1–2), so doors are worth 3 whispers, not 1.

What's left: chapter 3's spare envelope is capped by doors-first, not
whisper-only: with every hallway door shut, each hallway side needs one
timed whisper, so doors-first costs exactly par + 2. A third shut-off
hallway piece (a room below the hallway) would raise that cap. The
remaining gap is timing slips: the junction whisper has a 1–2 turn window.

## Pre-build go/no-go (2026-10-04, before v1)

**Not built yet.** Brief: `docs/ideas/surprise-party.md`. Harness:
`node scripts/balance-surprise-party.mjs [trials] [1|2|both]` (one block per
house, a few minutes at 100 trials). The rules, the five houses and the
house generator live in the script between `// § sim` and `// § end sim`;
the game should copy that block, and the harness then cuts it from
`games/surprise-party.html` (`buildDebug()` already looks there first).

Dev tools in the same script: `show <id>` (the house with guest letters and
who tells whom), `gen <ch> <cols> <rows> <guests> [n]` (generated houses),
`design <id> [iters]` (hill-climbs guest positions; it never found
anything better than hand placement, see below).

### What the sim implements (from the brief)

- 8 actions, 6:00 to 7:45; each is followed by a tick (+15 min). Whisper
  (any guest who doesn't know, one envelope), toggle a door, or wait.
- Tick: every *fresh* guest tells everyone within 2 walking steps (4-way,
  through floor, guests and open doors; not walls or closed doors), then
  goes quiet. Fresh = tells on the next 1 (or 2) ticks. A whispered guest
  tells on the tick right after the whisper.
- Loss: the birthday person hears on a tick before the last one. The last
  tick (to 8:00) still spreads: guests reached then count, and the birthday
  person hearing then is fine ("Just in time"). So a guest within 2 steps of
  the birthday person may first hear at 7:45 (wave) or be whispered at 7:45.
- Win: every guest knows after the last tick.
- Solver: exact layered BFS over (who knows, who's fresh, doors), keeping the
  cheapest path per state: fewest whispers, then fewest non-wait moves.
  With no whispers left it prunes states whose fresh guests can't reach the
  rest in time. 2–40 ms per house at fresh 1 (22 guests, 6 doors: 10 ms).
- Bots: `solver` (par), `whisper-only` (exact search, never touches a
  door), `doors-first` (closes every door of the birthday person's room,
  then exact search with them locked), `habit` (closes those doors, then
  whispers the unknown guest farthest from the birthday person that the
  wave won't reach next tick), `novice` (follows the solver, makes k wrong
  taps at random turns: a door, a whisper or a wait the plan didn't make,
  re-plans after each, never undoes).

### The five houses

| id | ch | idea |
|---|---|---|
| 1-3 Three rooms | 1 | 16 guests in 3 rooms joined by gaps; one whisper |
| 2-1 The junction | 2 | a guest at a 3-way junction just outside the birthday person's den; one branch behind a closed door |
| 2-2 A friend inside | 2 | 2-1 plus a guest in the den beside the birthday person |
| 3-1 The hallway | 3 | two U-shaped rooms joined by a closed door; the hallway below holds the birthday person and a guest on each side |
| 3-2 Crossroads | 3 | rooms above and below the hallway, doors at both hallway ends and next to the birthday person |

### Results, fresh for 1 turn (100 novice trials)

`wo` = fewest whispers whisper-only needs. Novice = % still winnable after
2 wrong taps of any kind / door-or-wait slips only / any kind with one more
envelope.

| house | guests | doors | env | par | decisions | wo | doors-first | habit | novice 2 taps |
|---|---|---|---|---|---|---|---|---|---|
| 1-3 | 16 | 0 | 1 | 1 | 1 | 1 | win | 2 missed | 65 / 80 / 91 |
| 2-1 | 18 | 2 | 2 | 1 | 3 | 4 | win | 7 missed | 72 / 59 / 64 |
| 2-2 | 19 | 2 | 3 | 2 | 4 | 5 | win | 6 missed | 29 / 38 / 46 |
| 3-1 | 18 | 3 | 2 | 2 | 3 | 3 | fails | 3 missed | 15 / 18 / 29 |
| 3-2 | 22 | 6 | 2 | 2 | 3 | 3 | fails | 17 missed | 31 / 42 / 25 |

Solver plans (action per turn, `·` wait, `wN` whisper guest N, `dN` door N):
2-1 `· · w2 d0 d1 · · ·` (whisper the far end of the top hall at 6:30, open
the side door, shut the den as the wave passes); 2-2 `· · d0 w3 d1 · · w17`
(the friend in the den is whispered at 7:45); 3-1 `· · w6 · d0 · · w8`
(start in the right room, open the connecting door at 7:00 so the wave
crosses into the left room late, whisper the far corner at 7:45);
3-2 `· · · w2 w20 d1 · ·`.

Checks: every house solvable PASS; whisper-only fails every ch2+ house
PASS; doors-first fails every ch3 house PASS; habit fails every ch3 house
PASS; decisions ≥ 3 on ch2+ PASS; novice ≥ 50% after 2 wrong taps (median
house) **FAIL (31%)**; ≥ 25% after 3 **FAIL**.

### Results, fresh for 2 turns

| house | env | par | decisions | wo | doors-first | novice 2 taps |
|---|---|---|---|---|---|---|
| 1-3 | 1 | 1 | 1 | 1 | win | 55 / 82 / 86 |
| 2-1 | 2 | 1 | 3 | 4 | win | 51 / 53 / 71 |
| 2-2 | 3 | 2 | 4 | 5 | win | 30 / 30 / 41 |
| 3-1 | 2 | **1** | 4 | 3 | fails | 23 / 42 / 38 |
| 3-2 | - | - | - | - | - | not finished (the run hit its 15-minute cap: string state keys above 17 guests) |

Two tells per guest lets a closed door *hold* a wave for a turn: 3-1's par
drops from 2 to 1 (`· · w5 d0 · d1 d1 ·`: shut the door as the wave arrives,
reopen it next turn while the guest still has a tell left). That makes 3-1
a one-whisper house with a spare envelope, but the solve is 4× slower and
novice survival barely moves. Fresh for 1 turn stays the default; the hold
trick is a candidate rule for a later chapter.

### What the run taught

- **Doors are worth exactly the cut points they guard.** A guest within 2
  steps of the birthday person may hear no earlier than 7:45, so a wave can
  pass that guest with at most one more hop behind it. Whisper-only pays
  one extra whisper for every deep branch behind such a guest; a door shut
  as the wave passes pays nothing. A guest at a 3-way junction outside the
  den (2-1, 2-2) makes whisper-only cost par + 3, so the house can give a
  spare envelope and still need the door. The hallway houses (3-1, 3-2)
  guard one branch each: whisper-only costs par + 1, so they can't give a
  spare envelope, and the novice numbers show it.
- **Timing is exact, so slips are fatal.** Even door/wait slips (no wasted
  envelope) leave only 18–42% of ch2–3 runs winnable after two: the par
  plans start the wave at one specific quarter hour. A spare envelope helps
  most (2-1: 72% with any 2 wrong taps).
- **Random guest placement doesn't make puzzles.** The generator's random
  houses need 5–6 whispers for 10 guests (isolated guests). Clustered
  placement (each guest 2 steps from one already placed) gives 2–3
  whispers and 3–4 decisions, but the houses are loose sprawls, the
  hill-climbing placer found nothing better than hand placement, and an
  exact solve takes 50–300 ms with 6+ doors. Party Season needs a
  template-based generator (junction + den, hallway + rooms) with ≤ 4 doors.
- **Validation needs distinct verbs.** `validate.mjs` rejects two mechanics
  with the same verb, so whisper (tap a guest) and door can't both be taps
  as the brief says. Proposal: door = `{hold}` (a short hold with a ring,
  like Coat Check's peek), which also guards against toggling a door by
  accident, since every toggle costs a quarter hour.

### Go/no-go

**Conditional: 5 of 7 checks pass, novice fails** (median 31% after 2 wrong
taps, target 50%). Rules, solver and bots work, and doors are required
where intended. Before v1: (1) give every house a spare envelope where
whisper-only still loses with it; (2) rebuild the chapter 3 houses around
junction guests so they can carry one; (3) unlimited Undo in the campaign
and the one-turn-early spoil warning; (4) doors use `{hold}`. Waiting on the
maintainer's call before building.

## Original design brief (2026-10-04, before v1)

Moved here from `docs/ideas/surprise-party.md` in the 2026-10-07 cleanup. What the build changed is above.

### Surprise Party (brief)

Proposed 2026-10-04. A proposal, not a spec. Picked from the simple-games
discussion (`simple-grid-ideas.md`): turn-based, ASCII levels, an exact
solver as the balance harness, one new rule per revision.

#### Pitch

It's 6:00 pm; the party starts at 8:00. Every guest in the house must hear
about it in time, and the birthday person must not. Start the gossip with a
few whispers, steer it through the house with doors. The news spreads as a
visible ripple.

#### Core rules (deterministic, turn-based)

Each tap advances the clock 15 minutes: 8 turns from 6:00 to 8:00.

- **Whisper** (`{tap}` a guest who doesn't know): they learn. Limited
  whispers per house (envelopes).
- **Door** (`{tap}` a doorway): open/close it. Costs a turn. Closed doors
  block the news.
- **Wait** (`{tap}` the clock): pass a turn.

Spread (the passive system): each tick, every guest who *just* learned
tells everyone within **2 walking steps** (not through walls or closed
doors), then goes quiet (still knows, wears a party hat). The news moves
as a **wave**, not a flood, and never comes back.

- **Loss:** the birthday person learns before 8:00. Retry the house.
- **8:00 rule:** news arriving as the clock strikes eight is fine; a 7:45
  whisper has no time to leak. Timing a wave to arrive exactly at eight is
  the signature move.
- **Win:** every guest knows at 8:00 and the birthday person never heard.

#### Shared state and why both verbs are required

Shared state: who knows (unknown / fresh / quiet) plus door states.
Whispers start waves, doors aim them, the wave rule carries news between.

- Whisper-only fails: some guests are reachable only along a path past the
  birthday person's room; the wave must go around, with a door shut as it
  passes.
- Doors-only starts nothing. "Close the birthday door first" fails when
  that room is the hallway (it splits the house), or guests sit beside the
  birthday person (they need a 7:45 whisper or a wave timed for 8:00).
- Misuse costs (findings: "A two-way verb forgives its own misuse"): a wave
  dies at a closed door, so a mistimed close costs another whisper, and
  every toggle costs a turn.
- The passive system loses something each cycle (findings: "Passive
  systems that create more than they cost play themselves"): each guest
  tells once, then goes quiet.

#### Readability

- Next-turn preview: a faint outline of where the wave reaches next tick.
- The birthday person's 2-step danger zone is tinted.
- Fresh guests glow; quiet ones wear hats. Clock: "7:15 · party at 8:00".
- Undo, restart, one message strip below the house (never over it).
- The solver detects an unavoidable spoil a turn early (no false alarms).

#### Campaign (one new rule per chapter)

| Ch | New rule | Habit it breaks |
|---|---|---|
| 1 Invitations | whisper only, 1 → 3 rooms; wave + deadline | (teaches the 2-step wave) |
| 2 The birthday person | doors; their room is a dead end | "whisper everyone at once" |
| 3 The hallway | their room is the only way through; guests beside them | "shut their door first" |
| 4 (v2) Wandering | they walk a fixed route (footprints shown) | "this room is safe" |
| 5 (v2) The gossip | tells 3 steps instead of 2 | wave-timing intuition |
| 6 (v3) Phones | news at one phone rings the other | local thinking |
| 7 (v3) Headphones | a teen who hears but never passes it on | relying on chains |
| 8 (v3) The dog | wanders and pushes doors open | "a closed door stays closed" |

v1 = chapters 1–3 (about 15 houses) + Party Season.

#### Depth and score

- Campaign: stars for whispers left over.
- Endless **Party Season**: generated houses growing in size; score =
  parties pulled off. Unused envelopes carry over (shared budget); the
  season ends when you run out. Bump `score.epoch` if its meaning changes.

#### Achievements (each verified by a bot run)

- **Word of mouth**: a whole house from one whisper.
- **Just in time**: the wave reaches the birthday person exactly at 8:00.
- **Open house**: finish a chapter 2+ house without touching a door.
- **Party planner**: 10 parties in one season.

#### Level format

```
###########
#g.g#..B..#
#...d...g.#
#g..#.g...#
##d####d###
#g.g...g..#
###########
```

`#` wall, `.` floor, `d` door (open), `D` door (closed), `g` guest,
`B` birthday person. Illustrative only, not solver-checked.

Inputs are all taps (guest, door, clock), so phone and PC play the same;
keyboard: Space = wait, U = undo. Primitives only (pastel floor plan,
round faces). Target file size ~20K.

#### Balance harness: `scripts/balance-surprise-party.mjs`

- State: per guest unknown/fresh/quiet, doors, turn, whispers left. BFS
  with dedup should fit ≤12 guests × 8 turns; fall back to beam search for
  par if not.
- Bots: `solver` (par), `whisper-only`, `doors-first`, `habit` (whisper
  the farthest guest, close the birthday door at once), `novice` (2–3
  wrong taps).
- Generator keeps houses where every single-habit bot fails and the
  solver's solution has ≥3 real decisions (non-wait moves).

#### Open questions and risks

- "Whisper and watch": a house with 1–2 decisions plays itself. Guarded by
  the decision count; confirm by hand.
- Fresh for 1 turn or 2? Two would let a closed door *hold* a wave a turn
  (gentler; adds a hold-and-release trick). Decide with bots + playtest.
- Is "2 steps" readable? The preview should teach it within one turn.
- Solver state space may cap endless houses at ~12 guests.

#### Plan

1. **Go/no-go first** (as Coat Check did): spread rule + solver + 5
   hand-made houses. Pass = whisper-only and doors-first fail where
   intended, solver decision count ≥3, novice survives 2–3 wrong taps.
   Record the run in `docs/history/surprise-party.md`.
2. If it passes, build v1 (chapters 1–3 + Party Season) in one PR, with
   `docs/games/surprise-party.md` and a playtest Artifact.
