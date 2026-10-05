# Coat Check: design notes

**v3** (2026-10-05, canvas label; v2 2026-10-04) · playtest: https://claude.ai/artifact/U4NaLDKJ5bL7NjHZnrcDZU (private, republished each push) ·
balance: `node scripts/balance-coat-check.mjs 300` (~12 s)
Verbs: **hang** (drag), **fetch** (tap) and **peek** (hold), sharing **the hooks
and the peek budget**. A cloakroom of identical closed doors: where you hang a
coat is the only record of it. 12 campaign shifts (one new rule each, then
mixes), then Endless until a lost shift. Score: coats returned in the run.
6 achievements. Topic: `working-memory`. Original brief and the pre-build
go/no-go run: `docs/history/coat-check.md`.

## Daily Challenge (v2)

`?daily=<date>` (the gallery's `#/daily`, [daily.md](../daily.md)): the run
skips the campaign and starts at Endless 1 with `run.seed = dailySeed() % 1e6`
(FNV-1a of `coat-check:<date>`), so every player gets the same shifts. HUD
says `Daily N`, rule line `Daily · …`. Results carry `daily`; the losing
shift posts `arcade:final` (`score` = coats). A new run after it replays
the same seed (practice). Open: newcomers meet 2-3 rules at load 8 with no
tutorial; watch the first-run levels median (`fetch-telemetry.mjs`).

## How it works

- Coats have colour (red, blue, yellow, pink), pattern (plain, striped,
  dotted, checked) and pin (★ star, ☾ moon, ♥ heart, ■ square). Shift 1 has no
  pins and only colour tickets.
- Hang: drag the coat from the counter onto a free hook (the coat rides
  `min(70, 0.6 × door height)` px above the finger; the door under the coat is
  the target). A tap on the coat never hangs it. Closed doors all look the
  same; free hooks show an empty alcove. Rows A-C (D), columns 1-4, no tints.
- Fetch: tap a door. Right coat: the guest leaves. Wrong: the door shows what
  it holds for 0.9 s and the guest complains. 3 complaints lose the shift.
  Taps do nothing while a coat waits to be hung.
- Peek: hold a door. Under 0.2 s is a fetch, 0.2-0.45 s does nothing (counted
  as `cancels`), from 0.45 s the door opens a crack for as long as you hold and
  one peek is spent. The ring is drawn around the finger (radius 30-46 px), grey
  in the tap zone, amber after. Peeks work any time in play.
- After each shift: every door opens for 2 s (input ignored, covers the 1 s end
  lock), showing the last coat on each hook (returned ones faded). The doors
  stay open until Next.
- Campaign: the first loss of each shift is a free retry with new coats; a
  second loss ends the run. Endless: a loss ends the run.
- Regulars stay on their hooks into the next shift, with up to 2 unused peeks.
- No timer: the stream advances only on hangs and served guests. The clock
  only feeds `time` and `think_s`.

## Key constants

`TAP_MS` 200, `HOLD_MS` 450, `END_LOCK_MS` 1000, `RECAP_MS` 2000, `SHOW_MS`
900, `DRAG_PX` 10, `SLIDE_PX` 22 (a press that slides this far is neither a tap
nor a hold), `COMPLAINTS` 3. Sim (`// § sim` … `// § end sim`, run by the
harness): `TUNE = { reshuffle: [5, 7], friendP: 0.2 }`, budget = slack (2
campaign, 1 Endless) + per reshuffle (coats in row − 1).

| # | shift | grid | guests | load | rules |
|---|---|---|---|---|---|
| 1 | Colour tickets | 2×3 | 4 | 3 | colour |
| 2 | Any feature | 3×3 | 6 | 5 | (tutorial) |
| 3 | Look-alikes | 3×4 | 8 | 7 | look (tutorial) |
| 4-8 | Coach, Reshuffle, Friends, Two-feature, Regulars | 3×4 | 10 | 8,8,8,9,9 | one each |
| 9-11 | Look+coach, Reshuffle+friends, Pairs+regulars | 3×4 | 10 | 9 | two |
| 12 | All rules | 3×4 | 12 | 10 | all six |

Endless (`endlessSpec`): 2-3 random rules, load 8 + ⌊e/2⌋ (max 12), 4×4 from
load 10, guests load + 6, slack 1.

## Layout

Rule line and message strip on top (own rows, never over the doors), a thin
HUD (shift, complaints ✕○○, peeks ◆◇, coats ✓ and best), then the canvas.
Portrait: counter (guest + coat or ticket, 100-150 px) above the grid.
Landscape (W > 1.15 H): counter on the left third, grid on the right. Doors
fit both ways (height ≤ 1.3 × width); refit on every shift and resize. Checked
at 360×640, 640×360 and 1100×700: no scroll, no errors, a full 14-shift run
driven through real pointer events at both phone sizes, keyboard path checked.

## Balance (v1, 300 runs)

First-try win % S1-S12; runs = one free retry per campaign shift, then Endless.

| bot | S1-S12 | coats | reach | camp | run min (4 s) |
|---|---|---|---|---|---|
| cap3 | 100 100 70 45 71 35 53 47 23 43 46 15 | 40 | S6 | 0 | 8 |
| cap4 = encode | 100 100 88 70 88 60 74 63 44 59 70 29 | 72 | S9 | 16 | 13 |
| cap5 | 100 100 99 86 95 80 90 83 75 70 86 50 | 111 | S13 | 50 | 19 |
| cap7 | 100 … 95 100 99 98 86 100 84 | 198 | S19 (+6) | 96 | 30 |
| scatter | 100 100 75 33 48 22 17 17 5 32 17 4 | 31 | S5 | 0 | 7 |
| habit | 100 100 81 37 32 32 35 29 19 19 36 2 | 36 | S5 | 0 | 7 |
| noPeek | 100 100 100 100 **40** 95 99 96 96 **35** 98 **9** | 88 | S10 | 8 | 14 |
| novice | 100 93 31 8 27 5 3 2 1 14 3 2 | 20 | S4 | 0 | 5 |
| peekOnly | 92 8 0 … | 8 | S2 | 0 | 2 |
| random | 62 3 0 … | 6 | S2 | 0 | 2 |
| perfect | all 100, 0 wrong doors | 810 | cap | 100 | - |

Checks: PASS clock (identical at 1/4/10 s per action), encode 2.3× scatter,
habit clears S1 and fails rules 4-8 (29-37%), peekOnly and random die by S2,
perfect clears all, cap3 dies at S6, cap4 reaches S8 in 67% of runs, cap7
clears 96% and ends Endless after a median +6, novice wins S1 (24 s at 3 s per
action) and S2 (93%). Not targets: habit on tutorial S2/S3 100/81%.
FAIL (accepted, as at go/no-go): scatter reaches S5 (free retries carry it
past rule 3); noPeek 40/35/9% on reshuffle shifts (target ≤ 25; still far
under cap7's 100/86/84, so Peek stays); depth to S8 (cap4 9.7 min at 4 s,
novice never; whole runs are 13 min for cap4, 19 for cap5); cap5 Endless +1
shift (2.8 min). Achievement reach (greedy bots): Filing System 21-82% per
12-hook shift; Full House only from S12 and Endless load 10.

## Telemetry fields

`arcade:result` per shift: `outcome`, `time`, `level` (shift in the run, 13+ =
Endless), `run`, `attempt`, `reason` (`complaints`), `score` (coats so far),
`stats`: `coats wrong peeks peeks_left load hooks rule reshuffles cancels
actions think_s purity guests budget`. `rule` is a bitmask: colour 1, look 2,
coach 4, reshuffle 8, friends 16, pair 32, regulars 64. `think_s` = median
unpaused seconds per action. `purity` 75 ≈ random placement, not 0.

## Changes from the brief

- Levers from the go/no-go run applied: load +1 from S2, `friendP` 0.2.
- *Full House* = return a coat while 10+ coats hang. "Every hook full" never
  happens (arrivals stop at the load target, always below the hook count).
- The sim's fetch function is `retrieve` (the self-contained check rejects the
  word `fetch`).
- Peeks are allowed any time in play, not only while a ticket is up.
- Doors stay open after the 2 s recap until the player moves on.

## Open ideas / known limits

- Accessibility (`docs/accessibility.md`, 2026-10-05): hook letters 11 px at 4.3:1; no live region.
- The memory model is a guess (k most recent, no chunking). Calibrate k from
  the first playtest: compare `wrong`, `peeks`, `purity` with the cap rows.
- ⇄ tickets: a peek can't confirm the friend's own coat unless you remember
  it. Kept; watch S6/S10 win rates in playtest (friends is the hardest rule
  for every memory bot).
- Swap the assumed 4 s per action for the measured `think_s`.
- File is ~41 KB (target ~40).
- `planning` as a second topic only if playtests show players plan the scheme.

History (original brief, go/no-go run): `docs/history/coat-check.md`
