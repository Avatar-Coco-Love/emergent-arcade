# Surprise Party (brief)

Proposed 2026-10-04. A proposal, not a spec. Picked from the simple-games
discussion (`simple-grid-ideas.md`): turn-based, ASCII levels, an exact
solver as the balance harness, one new rule per revision.

## Pitch

It's 6:00 pm; the party starts at 8:00. Every guest in the house must hear
about it in time, and the birthday person must not. Start the gossip with a
few whispers, steer it through the house with doors. The news spreads as a
visible ripple.

## Core rules (deterministic, turn-based)

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

## Shared state and why both verbs are required

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

## Readability

- Next-turn preview: a faint outline of where the wave reaches next tick.
- The birthday person's 2-step danger zone is tinted.
- Fresh guests glow; quiet ones wear hats. Clock: "7:15 · party at 8:00".
- Undo, restart, one message strip below the house (never over it).
- The solver detects an unavoidable spoil a turn early (no false alarms).

## Campaign (one new rule per chapter)

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

## Depth and score

- Campaign: stars for whispers left over.
- Endless **Party Season**: generated houses growing in size; score =
  parties pulled off. Unused envelopes carry over (shared budget); the
  season ends when you run out. Bump `score.epoch` if its meaning changes.

## Achievements (each verified by a bot run)

- **Word of mouth**: a whole house from one whisper.
- **Just in time**: the wave reaches the birthday person exactly at 8:00.
- **Open house**: finish a chapter 2+ house without touching a door.
- **Party planner**: 10 parties in one season.

## Level format

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

## Balance harness: `scripts/balance-surprise-party.mjs`

- State: per guest unknown/fresh/quiet, doors, turn, whispers left. BFS
  with dedup should fit ≤12 guests × 8 turns; fall back to beam search for
  par if not.
- Bots: `solver` (par), `whisper-only`, `doors-first`, `habit` (whisper
  the farthest guest, close the birthday door at once), `novice` (2–3
  wrong taps).
- Generator keeps houses where every single-habit bot fails and the
  solver's solution has ≥3 real decisions (non-wait moves).

## Open questions and risks

- "Whisper and watch": a house with 1–2 decisions plays itself. Guarded by
  the decision count; confirm by hand.
- Fresh for 1 turn or 2? Two would let a closed door *hold* a wave a turn
  (gentler; adds a hold-and-release trick). Decide with bots + playtest.
- Is "2 steps" readable? The preview should teach it within one turn.
- Solver state space may cap endless houses at ~12 guests.

## Plan

1. **Go/no-go first** (as Coat Check did): spread rule + solver + 5
   hand-made houses. Pass = whisper-only and doors-first fail where
   intended, solver decision count ≥3, novice survives 2–3 wrong taps.
   Record the run in `docs/history/surprise-party.md`.
2. If it passes, build v1 (chapters 1–3 + Party Season) in one PR, with
   `docs/games/surprise-party.md` and a playtest Artifact.
