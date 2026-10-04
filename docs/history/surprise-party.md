# Surprise Party: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/surprise-party.md` (once the game exists). Add new entries at
the top; sessions don't read this file by default.

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

FRESH2_TABLE

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

GO_NOGO
