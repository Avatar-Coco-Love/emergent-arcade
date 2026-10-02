# Counterfeit Scale: design notes

**v1** (2026-10-02) · playtest: https://claude.ai/artifact/SYLhAXySXMqp9oH6aC5y5k (private, republished each push) ·
balance: `node scripts/balance-counterfeit-scale.mjs 400`
Verbs: **load** (drag), **mark** (tap) and **weigh** (hold), sharing **the coins'
marks and the weighing budget**. 12 campaign cases (2 per rule), then Endless
until 3 strikes. Score: cases cracked in the run. 5 achievements.
Original brief: `docs/history/counterfeit-scale.md`.

## How it works

- One coin (or two) is fake. Drag coins onto the pans, hold the beam (or
  Weigh) to spend a weighing. The coins stay on the pans with the beam tipped
  until you move one, so the last weighing is visible and older ones aren't.
- Tap a coin to cycle its mark: `?` → `H` → `L` → `✓` (`L` skipped when fakes
  can only be heavy). The game never fills marks in; the log chips show counts
  only (`3|3 L↓`), so marks are the only memory of older weighings.
- Accuse (after 1+ weighing), then pick the coin(s). **Cracked only if the
  weighings prove it**: a right but unproven guess loses (`guess`). If the last
  weighing leaves it unproven, the case ends at once (`budget`).
- A loss is a strike, except the first loss on each campaign case (free retry,
  new coins). Campaign losses retry the same case; Endless moves on.
- Hint (once per case, costs Under Par): counts per mark class for the best
  next weighing, from the game's own knowledge (not the player's marks).

## Key constants

`COIN_G` 10 g (fake ±1), `HOLD_MS` 450, `TIP_MS` 900, `END_LOCK_MS` 1000,
`STRIKES` 3, `MAX_K` 8 (solver depth). Solver: minimax over count states,
one fake `(u, h, l, good)`, two fakes = groups of interchangeable coins (same
pans every weighing) + the list of ways the pair spreads over them. Memoised,
every case < 20 ms. Checked: 9/2, 27/3, 28/4 heavy; 12/3, 13/3, 14/4
heavier-or-lighter; spring 16/4, 17/5.

| # | case | coins | rule | par+slack |
|---|---|---|---|---|
| 1-2 | First weighing, Nine coins | 3, 9 | heavy | 1+1, 2+1 |
| 3-4 | Light or heavy, The twelve | 3, 12 | either | 2+1, 3+1 |
| 5-6 | Small pans (cap 4), Two per pan (cap 2, either) | 9, 8 | capacity | 2, 3 |
| 7-8 | A pair, Two of seven | 4, 7 | two heavy fakes | 2, 3 |
| 9-10 | Spring scale, Sixteen grams | 8, 16 | spring | 3, 4 |
| 11-12 | Tight twelve (either, cap 3), Spring pair | 12, 7 | mixed | 4, 4 |

Endless (`endlessSpec`): random mix of heavy / either / two / spring /
spring+either / spring+two, sizes grow over 12 cases (≤ 26 coins), a pan cap
25% → 60% of the time, slack 0.

## Layout

Canvas: scale region + tray region, stacked or side by side, whichever gives
the biggest coin (`layout()` tries both at 5 splits; refit on each case and
resize). Pans show capacity slots; the spring shows a dial (reading and
`n × 10`). Top line: case, rule, pips (● left), ✓ cracked, ✕ strikes. Hint
strip and message strip under the board, then buttons. Tested at 390×640,
740×320 (touch) and 1100×700: no scroll, no errors.

## Balance (v1, 400 seeds per case)

First-try win % on C1..C12; runs = 3 strikes, free retries.

| bot | C1-12 | endless | run: cracked |
|---|---|---|---|
| skilled | all 100 | 100% | never dies |
| novice | 84 46 65 26 25 25 36 19 24 15 29 25 | 28% | 4 (reach C5) |
| habit (thirds) | 100 100 **33 18** 100 **0** 54 51 73 74 **17** 61 | 66% | 3 |
| halves | 100 100 33 0 **9** 0 53 51 100 100 0 70 | 58% | 3 |
| memory (no marks) | 100 78 84 23 72 23 49 5 26 17 26 35 | 25% | 5 |
| memory + marks | all 100 | 100% | never dies |
| random | 33 1 11 0 … | 0% | 1 |
| allWeigh | 100 68 94 55 37 55 59 44 26 19 61 29 | 45% | 7 |

- Targets: habit dies at rule 2 ✓; halves fails the tight 9-coin case
  (9%) ✓; memory dies without marks and never with them ✓ (Mark is
  required, so no tray shuffle); novice reaches C5 ✓; skilled clears all ✓.
- Depth by action count (drag 1.2 s, mark 0.6 s, weigh 2.2 s, think 8 s per
  weighing): skilled campaign **11.2 min**, then Endless; novice case 1
  **23 s** (< 40 s), novice run 8.6 min.
- Weak spot: on spring cases thirds still wins 73-74% (a lopsided yes/no
  split only fails when the fake keeps landing in the bigger part). It fails
  1 in 4, not always.

## Telemetry fields

`arcade:result` per case: `outcome`, `time`, `level` (case number in the
run), `run`, `attempt`, `reason` (`wrong`, `guess`, `budget`), `score`
(cracked so far), `stats`: `weighings par budget coins marks loads cases
strikes hint`.

## Changes from the brief (findings win)

- Tap = mark, drag = load (the brief's tap-to-select would collide with mark).
- Log has counts, not coin ids: an id log lets a player skip marks (*A verb
  only shares state if succeeding needs to read it*).
- Proof rule added: with guesses allowed, habit/halves/allWeigh won 50-80%
  by luck and no rule could break a habit. `random` is ~0, not 1/N.
- Weigh is a hold (verbs must differ, and a stray tap can't spend a weighing).
- Coins stay on the pans after weighing (brief: return to tray).
- Retries draw new coins (same coins would give the answer away).

## Open ideas / known limits

- File is 45 KB (brief aimed at ~40).
- Make spring cases break thirds harder (two spring cases in a row already
  cost habit a case about half the time).
- Daily seed board; "skip to Endless" once the campaign is cleared
  (`arcade:best` could unlock it).
- No human data yet: expect humans below the bots (findings).

History (original brief, superseded targets): `docs/history/counterfeit-scale.md`
