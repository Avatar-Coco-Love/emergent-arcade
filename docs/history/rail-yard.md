# Rail Sorting Yard: history

Older material for `docs/games/rail-yard.md`, newest first. Grep it; don't
read it whole.

## Moved from the notes at v2 (2026-10-01)

Hint in Chromium (phone viewport): 1.2 s cold on level 9 (27k states),
2.9 s cold on level 10; ~60 ms on the par path once the background plan
(`PREPLAN_MS` per frame from the level's start) has finished.

Open idea, not planned: Slopes (no v1). Mass (heavier cuts roll shorter) was left out to keep
  one number to read.

## v1 development (2026-09-30): rule changes found by the bots

The brief (verbs, complexity list, achievements, v2 ideas) came from the
maintainer's request for this PR. While building it, the solver and the
two "one verb" bots forced these rule changes before anything shipped:

- **Bounce speed.** First rule: a too-fast car bounced back at
  `impact − C_MAX`. The max-strength bot (full planning, speed 9 only)
  then won level 1: the rebound itself arrived inside the coupling window.
  Now every bounce rolls back at `BOUNCE_V = 1`, too slow to couple.
- **Top speed 9 → 12 → 15.** With rebounds fixed, the max-strength bot
  still won most yards (e.g. 7 flicks vs par 3) by parking cars one length
  off a buffer and detouring through a gravel siding, so that full
  strength arrived at exactly impact 2-4. At 12 it still found detours.
  At 15, above the longest route cost in the compact yards (≤ 10), it
  loses every level. Yards were redrawn smaller for this (main line ≤ 8
  cells, departure track 4) and that also keeps hint searches small.
- **One coupling per car end.** At a switch, a car could couple to cars
  on both legs at once (one end, two couplings); moving it later
  "teleported" a coupling. Now a car hitting a coupler end that is
  already taken just stops against it (or bounces if too fast).
- **Every car of a cut obeys the gates.** Only the lead car was checked,
  so a car coupled across a 1× gate could be pulled through it without
  spending it. Now each car checks each gate edge it crosses; a crossing
  arms a 1× gate, which drops once nothing straddles the gateway.
- **Flick-only wins.** The bot that never touches a switch won yards where
  a car started on the departure track, by coupling to it and moving
  trains through the switch along their couplings (trailing moves ignore
  the lever). Levels now start with the departure track empty and levers
  set against the needed route (`sw`); it wins only level 1.
- **Siding order.** Cars that leave a dead-end siding facing away from the
  departure track come back in reverse order, which made the first
  drafts of levels 9 and 10 unsolvable (the solver said so). The cars in
  those sidings were swapped.
- **Solver speed.** A step-by-step BFS ran ~80 µs per state; `successors()`
  walks each car/side/route once and yields every speed's outcome (all
  bounces collapse to one result), and the state became one `Uint8Array`
  (~25 µs per state in Node). Checked against the step simulator on 2,000
  random states from six yards: identical successor sets.
