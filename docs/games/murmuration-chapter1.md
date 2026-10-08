# Murmuration v8: Chapter 1 build brief

**Status: built as v8 (2026-10-08).** Results, deviations and the live
numbers: `docs/games/murmuration.md`. Written 2026-10-08 after a brainstorm and a bot simulation. All six open
decisions were confirmed by the user. Background, the full idea ledger
and later chapters: `docs/games/murmuration-story.md`. Current game:
`docs/games/murmuration.md` (v7). Sessions reading this for other reasons:
not an instruction.

## Next session prompt (paste into a new conversation)

```
Build Murmuration v8, Chapter 1 ("The Gathering"), from
docs/games/murmuration-chapter1.md. Read it first, then
docs/games/murmuration-story.md and docs/games/murmuration.md. Follow the
brief's build order and definition of done. One PR, a private playtest
Artifact, a short handoff with the build-or-learn call. Do not touch the
gallery (assets/, index.html): the save/load feature is the next PR after
this one.
```

## Confirmed decisions

1. A lost night does not replay: the run moves on with the flock penalty.
2. Same game id (`murmuration`), edited in place as **v8**; the current
   5-gate night stays as **Classic night**.
3. Night 1 keeps `LURE_SPOOK` 0.45; the value used is recorded in telemetry
   (`spook`), and a constant `AB_SPOOK = false` can later split night 1 by
   run id parity. No random assignment now (3-7 players cannot power one).
4. Score = total gates cleared in a migration (max 23).
5. Night 6 stays at about 62% for `lure60` (a chapter test).
6. Telemetry tooling (small `fetch-telemetry.mjs` change) goes in this PR,
   as its own commit. If it passes ~60 lines, drop it and say so.

## Scope

In: six nights, dawn/tally/chapter cards, flock carry-over, recruits, the
per-night config, new telemetry fields, the score change, achievements,
a11y, notes, balance tooling, the telemetry-reading change.
Out: gallery changes of any kind (save/load is the **next PR**: keep run
state save-ready, below), chapters 2-3, gate types, bird types, wind, Daily,
Apps Script. Keep the two verbs and shared fear per bird. Never rename the
id. Never push to `main`.

## The nights (source of truth for numbers)

Built: the game's `NIGHTS` table is now the only copy (the JSON prototype copy was deleted).
Sky 400x600, flock starts around (270, 480). Gate = x, y, angle (degrees,
the line between the posts). Spook is `LURE_SPOOK`. "Startle" = taps allowed.

| # | id | name | startle | need | half | window | DUSK | spook | gates |
|---|---|---|---|---|---|---|---|---|---|
| 1 | dusk | Dusk | off | 12 | 70 | 5 | 45 | 0.45 | (120,430,105) (300,320,59) (110,210,120) (280,90,55) |
| 2 | second-flight | Second flight | off | 13 | 65 | 4.5 | 50 | 0.65 | (300,330,10) (120,260,110) (260,150,52) (100,440,29) |
| 3 | first-tap | First tap | on | 13 | 60 | 4.5 | 60 | 0.9 | (130,440,106) (310,160,33) (90,250,68) (300,480,138) |
| 4 | open-sky | Open sky | on | 13 | 55 | 4 | 60 | 0.9 | (90,380,119) (290,200,48) (270,470,4) (100,150,152) |
| 5 | breather | Breather | on | 12 | 65 | 5 | 40 | 0.9 | (200,400,135) (310,230,33) (150,90,131); recruits: 4 birds near (165,320) |
| 6 | the-edge | The edge | on | 13 | 50 | 4 | 60 | 0.9 | (70,420,90) (330,300,90) (70,170,90) (250,70,0) |

Classic night: today's constants and gates, unchanged (`classic`).

Bot targets (win % at the night's DUSK; 50-60 seeds; typical human ~
`lure60`; accept about +-8 points after the final harness):

| # | lure60 | lure80 | smart90 / rear100 | notes |
|---|---|---|---|---|
| 1 | 98% (median 18 s) | 100% (11 s) | - | |
| 2 | 94% (31 s) | 100% (21 s) | - | |
| 3 | 92% (29 s) | 96% (19 s) | 100% (21 s) | tap helps, optional |
| 4 | 70% (49 s) | 100% (27 s) | 100% (23 s) | tapping pays (23 vs 49 s) |
| 5 | 94% (16 s) | 94% (13 s) | - | recruits not simulated |
| 6 | 62% (48 s) | 92% (29 s) | 92% (25 s) | lure bots lose 9-12 birds on a win, tappers 1-3 |

Caveat: nights 1-3 and 5 were first measured without the lure clamped to
the sky; nights 4 and 6 with it. The prototype now clamps everything and a
re-run of nights 1 and 5 agrees. Re-run all six once the game has the
config; if a night is off by more than ~8 points, tune that night's DUSK
or half-width first, and write the change in the notes.

What the simulation taught (keep in the notes): path length does not
predict difficulty (625 units took 8-10 s, 1,268 took 40 s); the edge night
punishes the *lure* near the border (spook -> panic -> birds ignore the
border), not the tap.

## Run rules

- Start flock 40. Cap 55. Fear resets to 0 at each dawn; birds keep their
  quirks. Night ends on: all gates cleared (win), `elapsed >= DUSK`, or
  `birds.length < GATE_NEED` (existing rule, with the night's `GATE_NEED`).
- Tally after every night: `after = min(55, alive - 3 * unclearedGates +
  (allCleared ? 4 : 0))`. Recruits are in `birds` from the start of their
  night, so they are already in `alive`.
- Next dawn needs `after >= next night's GATE_NEED`; otherwise the run is
  over (the flock is too small to pass a gate). Show it plainly, offer
  "Fly the migration again" (back to night 1, flock 40) and "Classic night".
- After night 6, always show the chapter card: "Chapter complete" if night 6
  was cleared, else "The flock lands short of the roost". Score counts
  either way; the `gathered` achievement needs the clear.
- A lost night is not replayed. After the chapter card, "Fly it again"
  restarts at night 1. (A per-night replay picker is a later idea.)
- Classic night: no flock carry-over, no tally, no score; it plays as v7.
- Startle off (nights 1-2): taps do nothing special; a press lures at once
  (no 200 ms `HOLD_MS` wait). Keys: X/Enter startle is ignored.
- Recruits: `recruits: [{x, y, n}]` per night. Spawn n calm birds near (x,y)
  (jitter ~15 units, slow, flag `recruit: true`; no special behaviour: they
  join by ordinary flocking when the flock comes within `VIEW`). Draw
  `Math.random` for them **only** on nights that have recruits, so the
  classic night's random sequence is untouched (parity proof below).

## Screens (in-game, no gallery changes)

No separate title card: the game opens on **night 1's dawn card**, with a
primary "Fly" and a secondary "Classic night". Cards: dawn (night name,
"Night n of 6", one story line, one rule line, flock size), tally (gates
cleared, birds lost/gained, flock for tomorrow, then "Next night"), run
over, chapter complete. Keep cards short and calm. Copy (touch/mouse words
the way the game's existing hint text does, and `{hold}`/`{tap}` in the
manifest):

| Night | Story line | Rule line |
|---|---|---|
| 1 | The flock gathers at the marsh. | Lure only tonight: hold ahead of the flock and draw it through each gate. |
| 2 | Another dusk, another route. | The sky is less forgiving: birds spook if you press too close. |
| 3 | Open sky. The old birds know a trick. | Tap behind the flock to throw it forward. Taps scare the birds they touch. |
| 4 | Long crossings between the gates. | Tapping behind the flock saves seconds on the long runs. |
| 5 | A short night. Stragglers wait in the reeds. | A small group rests off the route; fly near it and it will join. |
| 6 | The cliffs. The gates hang close to the border. | Near the border a spooked bird can be lost: keep the lure off the flock, tap from inside it. |

HUD: gate `n/need` as now; add "Night n/6". `LIGHT_MARKS` (30/15/5 s spoken
light) must adapt to the shorter `DUSK` values (skip marks above the DUSK).

## Achievements

Keep the 7 ids and make them earnable on Classic night exactly as before:
`first-gate`, `flock-home`, `soft-touch`, `swift`, `chain-panic`,
`no-bird-left`, `last-light`. In the migration they apply per night
(`flock-home` = a night with every gate cleared; `soft-touch` = 3 or fewer
taps on a cleared night; `swift` = cleared with 25% of DUSK left, which is
the 15 s of Classic's 60; `no-bird-left` = cleared with no birds lost;
`last-light` = cleared with under 5 s left). Add three: `gathered` (clear
night 6), `edge-dancer` (clear night 6 losing 2 or fewer birds),
`gentle-hand` (clear a night of 3+ gates with the ring red for under 2 s
and no taps while `lure_s` >= 10). Update the manifest `achievements`
descriptions to match (3+ rule still holds; 10 total).

## Score

Manifest `score`: higher is better, `format: count`, `wins: false`,
`max: 23` (4+4+4+4+3+4), `epoch: 2`, board `ch1` (`boardList: ["ch1"]`).
Each migration night's `arcade:result` carries `score` = gates cleared so
far in this migration, and `board: "ch1"` (monotonic within a run).
Classic night posts **no** `score`/`board`: read `docs/scores.md` and
`assets/scores.js` and confirm a result with no score is ignored; if it is
not, stop and report (do not edit the gallery). Rewrite `goal`,
`howToPlay` (both verbs, the migration, the flock tally), and the
`keyboard` line; `validate.mjs` rules for `{tap}`/`{hold}` apply.

## Telemetry (one `arcade:result` per night)

`outcome` win (all gates) or loss; `time` = night clock; `level` = night
1-6 (classic sends **no** `level`: the pipeline drops 0); `run` = random id
per migration (classic gets its own); `attempt` = times this night has been
started in this page session; `reason` on losses: `night` or `scattered`.

`stats` (15 keys, all numbers): `gates` (cleared), `birds` (alive at end),
`flock0` (alive at dawn, with recruits), `startles`, `lure_s`, `spook_s`
(seconds the ring was red, existing definition), `lost` (birds removed off
the sky), `lost_pan` (of those, with fear >= `PANIC`), `light_left`
(0 on a lost night), `scared_pk` (peak share of birds >= `SCARED`, %),
`cohesion` (mean nearest-neighbour distance, sampled every 0.5 s),
`tap_back`, `tap_side`, `tap_front` (taps behind / beside / ahead of the
flock's heading, centre of the main cluster).

Extra fields (kept in `extra`): `nv` (night revision, 1), `night_id`
(table above, `classic`), `gate_t` (array: seconds when each gate was
cleared), `idle_s` (seconds with no input while playing), `first_in_s`
(seconds to the first input), `input` (`touch` or `keys`, whichever
started the night), `spook` (the night's `LURE_SPOOK`), `flock_end` (after
the tally), `run_over` (0/1), `chapter_done` (0/1, night 6 only). Counts
and seconds only; never player-typed text. Document every key in
`docs/games/murmuration.md`.

**Reading it** (commit 2 of the PR, own commit): in `scripts/fetch-
telemetry.mjs`, group the per-level lines by (`level`, `nv`) when `nv`
is present, print medians of numeric `extra` keys beside `stats`, keep
`--input rows.json` working (test with a small synthetic file), add one
paragraph to `docs/telemetry.md` ("Games with levels"). Do not change
`Code.gs` or `assets/`.

## Save-ready run state (for the gallery save/load PR that follows)

Games run in a sandboxed iframe without `localStorage`; the gallery will
add `arcade:ready` / `arcade:load` / `arcade:save` next (design in
`murmuration-story.md`, "PR A"). Do not implement the messages now. Do:
keep the whole run in one plain object, e.g. `run = { v: 1, id, night,
flock, gates, best }` (under 1 KB, JSON-safe, no functions/Maps), with
`serializeRun()` and `restoreRun(obj)` functions that nothing calls yet but
the build uses internally to start a night. Later, "Continue" restores it.

## Accessibility

- Every card is announced through the live region (`#say`): night, rule
  line, flock; the tally; run over; chapter result. `#msg` stays
  `aria-hidden`.
- Cards take focus; Enter or Space continues; a keyboard player can play
  every night (arrows move the cursor, Space lures, X/Enter startles on
  nights 3-6 only) and say so in the rule line.
- Card text uses `fs()` with a size of at least 12.5 CSS px on the dark
  backing, contrast >= 4.5:1 (see the v6 notes). Reduced motion: cards do not
  animate.
- `node scripts/a11y-audit.mjs murmuration` must still pass (5 pass, motion
  partial by design). Update the Murmuration row in `docs/accessibility.md`.

## Build order

1. **Baseline first:** `node scripts/balance-murmuration.mjs 150
   lure80,smart90` before touching anything; save the lines.
2. **Refactor (no behaviour change):** per-night config table `NIGHTS`
   (index 0 = classic) with `newFlock(night)`; the old constants become the
   classic row. Re-run step 1: output must be **identical** (no new
   `Math.random` calls on the classic path). Mark sections `// § name`.
3. **Run layer:** run state, tally, recruits, cards, HUD, startle-off
   behaviour, score and telemetry fields, achievements.
4. **Nights 1-6** from the table. Extend `scripts/balance-murmuration.mjs`
   with `--night N` (read the game's own `NIGHTS` through `buildDebug`, no
   duplicated gate list; clamp the bot's lure to the sky as the prototype
   does) and a one-line run mode (a bot plays nights 1-6 and prints the
   flock at each dawn). Fold in and delete
   `scripts/proto-murmuration-nights.mjs`.
5. **Check the targets** in the bot table, then
   `node scripts/gestures-murmuration.mjs` on night 1's config (phone
   steering with half spook): note the red-ring share.
6. **Telemetry reading commit** (above).
7. Manifest, notes (`docs/games/murmuration.md` stays under 8 KB: move
   superseded v6/v7 detail to `docs/history/murmuration.md`), ROADMAP row,
   `docs/findings.md` if the run taught something.
8. Finish per CLAUDE.md: `node scripts/validate.mjs`,
   `node scripts/monkey-games.mjs murmuration`, `node
   scripts/a11y-audit.mjs murmuration`, `node scripts/smoke-gallery.mjs`
   once only if `index.html`/`assets/` changed (they should not). Push,
   open the PR (design checklist from the template), publish the game file
   as a private playtest Artifact, put the link in the PR body and the notes.

## Definition of done

Classic night reproduces v7 numbers exactly; all six nights meet the bot
targets (or the notes say why not); the run never soft-locks (every card
reachable by keyboard and touch; pause/resume work on cards); telemetry
rows for all keys above are visible in a monkey run's console log or a unit
check; validate, monkey, a11y pass; notes updated.

## Handoff (at most 5 lines)

PR link; what changed; what is open; next step as a call: **build or go
learn**. Expected answer: go learn first (thin player numbers: v7 has 1
player; watch 2-3 people play night 1 on a phone), then the **gallery
save/load PR** (needed before chapter 2), then chapter 2.

## Risks to watch

- Night 1's half spook may make night 2's 0.65 feel like a step; read
  `spook_s` per night once data exists.
- Recruits are unsimulated; check they join, do not stall the flock, and
  do not trigger `birds.length < GATE_NEED` logic oddly.
- A 6-night migration is 4-6 minutes: well under the 10-minute target. Say
  so in the PR; chapters 2-3 and replay are what get there.
- Telemetry key budget: `stats` has 15 of 16 slots.
