# Counterfeit Scale: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/counterfeit-scale.md`. Add new entries at the top; sessions
don't read this file by default.

## Original design brief (2026-10-02, before v1)

Moved here from `docs/ideas/counterfeit-scale.md` when v1 was built. Parts
v1 changed: tap-to-select loading, a log with coin ids, guesses that can win,
weigh as a tap, coins returning to the tray, `random` expected at ~1/N. See
"Changes from the brief" in the notes file.

### Counterfeit Scale: design brief for implementation

Status: idea, prototyped on paper (this brief), not built, not yet approved by
the maintainer. `id`: `counterfeit-scale` (permanent feedback key). Category:
generated puzzle, information theory. Ranked first in `puzzle-ideas.md`.
Read first: `docs/PROJECT_BRIEF.md`, `docs/findings.md` (every rule applies),
`docs/adding-a-game.md`, `docs/scores.md`, `docs/telemetry.md`. Base the bot
harness on the closest existing one (a discrete, turn-based game; Pressure
Grid's `scripts/balance-pressure-grid.mjs` or Rail Yard's) as
`scripts/balance-counterfeit-scale.mjs`.

#### Pitch

One coin in the tray is a fake. Load coins onto a balance, weigh them, mark
what you know, and name the fake before you run out of weighings. Every case
is generated; every case is solvable in the solver's par number of weighings.
Players discover thirds (and later halves) without being told. Score = cases
cracked in a run, no ceiling.

#### Verbs (2-3, orthogonal) and shared state

- **Load** (`drag`): drag a coin onto the left or right pan, or back to the
  tray. Also `tap` a coin to select it, then `tap` a pan (touch-friendly,
  findings: every input device must reach every verb). Keyboard: number keys
  or arrows pick a coin, `L` / `R` place it, `Esc` clears the pans.
- **Mark** (`tap`): tap a coin in the tray to cycle its note:
  `?` (unknown) -> `H` (could be heavy) -> `L` (could be light) -> `OK` (known
  genuine). Marks are the player's own bookkeeping: the game never fills them
  in. Keyboard: `M`.
- **Weigh** (`tap`): tap the beam. Spends one weighing and writes a line to
  the log. The pans tip, then clear (coins return to the tray).
- Accuse is a button, not a verb: select a coin, press Accuse. It ends the
  case (right: win; wrong: a strike). Like Reset, it commits the answer.

Shared state, written by one verb and read by another:

- `weighings_left` and the **log** (which coins were on which pan, which way
  the beam tipped) are written by Weigh. Mark reads the log (a result only
  means something when you know who was on the pans); Load reads the budget
  (a case with 2 weighings left forbids a wasteful split).
- `tag[i]` (the marks) are written by Mark. **Load reads them**: only coins
  marked `OK` are known references, so a case with unknown direction can only
  be solved if earlier weighings produced `OK` coins and the player loads
  them as ballast. Load without reading the marks fails; that is the point
  (findings: a verb shares state only if succeeding needs to read it).
- Carry-over inside a case: each weighing changes which coins can still be
  the fake, so the next Load is decided by the last Weigh. Nothing decays and
  there is no timer (findings: a decay rate turns a puzzle into a speed test;
  cost is per action, here the weighing budget, not per second).

Note for the mechanic map (`node scripts/mechanic-map.mjs`): `drag + tap` is
the most-tried pair (7). Accepted because the game is discrete and the verb
split is natural; an untried pair would need a different design (tilt does
not fit a balance puzzle).

#### Generator and solver (the core of the game)

- A case = `(N coins, rule set, budget, seed)`. Seeded RNG; the fake's
  index, and for unknown-direction rules its direction, are drawn from the
  seed. Show the seed in the notes/telemetry so a case can be replayed.
- **Solver** (shared by the generator and the bots): a minimax over
  count-states, `(unknown, maybeHeavy, maybeLight, knownGood)`, trying every
  pan loading `(a unknowns, b maybeHeavy, c maybeLight, d knownGood, per
  pan)`. Count-states are small, so it is instant and needs no clever
  maths; check it against the classic results (1 fake known heavy: 9 coins in
  2 weighings, 27 in 3; the 12-coin unknown-direction case in 3 weighings).
  The minimax depth is **par**: the fewest weighings that always win.
- `budget = par + slack`. Slack is 1 in the first campaign cases, 0 after
  (tight). Never generate a case the solver cannot finish in the budget.
- Rule set changes what the best strategy is, not just the size (findings:
  a general trick beats a set of levels; break it with rules, not sizes).

#### Rules ladder (campaign) then endless

The one-line habit after case 1 is "split the suspects into thirds". Each
rule below breaks it in a new way. Order and examples:

1. **Known heavy, balance** (hook, first minute): 3 coins / 1 weighing, then
   9 / 2. Thirds works. First case must be won by a novice bot in under ~40 s
   (findings: the first round is a hook, not a test). Show the hint
   "heavier side tips down" at the start.
2. **Unknown direction** (heavier or lighter, find the coin): 12 / 3 and
   smaller. Thirds fails; the player must keep `H`/`L` marks and reuse `OK`
   coins as references (marks become required here).
3. **Pan capacity** (each pan holds at most `c` coins): forces uneven splits.
4. **Two fakes, both heavier**: the answer is a pair; counts replace
   "one suspect".
5. **Spring scale** (reports a weight, not a tip; one pan): a weighing now
   asks "is the fake in this group?", so halves beat thirds. Thirds must
   fail this case.
6. **Mixed**: rules combine (capacity + unknown direction, spring scale + two
   fakes), sizes capped (~27-30 coins, so the tray fits a phone), then
   difficulty comes only from rules (findings).

- Campaign: ~12 curated cases (2 per rule) so a first player sees the whole
  ladder. Then **Endless**: cases drawn from random rule mixes at rising
  tightness, continuing until 3 strikes. A lost case (budget spent or a wrong
  accusation) can be retried from its start once per case in the campaign;
  in Endless it costs a strike.
- Tuning target: 10+ minutes for a player who likes it (about 12 campaign
  cases at roughly 1 minute of thought each, then Endless). Prove it by
  action count times an assumed seconds-per-action, not by a wall-clock bot
  (findings: sweep think time apart from reaction time).

#### Score, manifest, telemetry

- A case is a round: post `arcade:result` with `outcome` (`win` = fake
  found, `loss` = wrong accusation or budget spent), `time`, `level` (case
  number), `run`, `attempt`, `reason` and `stats`. Loss `reason`s: `wrong`,
  `budget`. `stats`: `weighings`, `par`, `marks`, `loads`, `cases`.
- `score`: cases cracked in the run, e.g. `{ "label": "Cases cracked",
  "better": "higher", "format": "count", "wins": false, "max": 500,
  "epoch": 1 }`, with `score` posted by the game (check `docs/scores.md` for
  the exact fields before copying).
- Manifest mechanics: `load` (verb `drag`), `mark` (verb `tap`), `weigh`
  (verb `tap`). Use `{tap}`, `{finger}`, `{swipe}` placeholders only; PC keys
  in the `keyboard` line. `goal`, `howToPlay`, 3+ achievements, for example:
  *Perfect Thirds* (a 9-coin case in exactly 2 weighings), *Reference Coin*
  (load an `OK` coin as ballast on an unknown-direction case), *Halving*
  (a spring-scale case in `ceil(log2 N)` weighings), *Cold Case* (crack 10
  cases in one run), *Under Par* (finish a tight case with a weighing left;
  possible only on slack-1 cases).
- Handle `arcade:pause` / `arcade:resume`, fill the window with no
  scrolling, ignore input ~1 s after a case ends.

#### Readability (findings)

- Messages (results, hints, "2 weighings left") get their own strip, never
  drawn over the play area. The layout refits on every case change, not only
  on resize. Screenshot every rule at phone portrait and landscape with a
  hint showing.
- Show the **log** as compact chips (`1 2 3 | 4 5 6 -> left heavier`), the
  budget as pips, and the marks as coloured coin faces. Put the rule on a
  line above the board ("one fake, heavier or lighter").
- Show a rule's key fact where the player acts, not in the manifest only
  (findings: show the threshold where the player acts): e.g. a pan with a
  capacity shows its slots.
- Optional hint (once per case, costs the under-par achievement): shows the
  size of the best first split, not the coin ids.

#### Balance and playtest

Bots, one line each (findings: bots model skilled play, add a `novice`):

- `skilled`: the solver's optimal play with perfect marks.
- `novice`: obvious first guesses (equal halves), forgets to mark half the
  time, makes 2-3 wrong splits per case; a first-timer should win the first
  three campaign cases, mostly lose rule 2 without help.
- `habit`: always splits into thirds and ignores `OK` coins. Must pass rule 1
  and fail rules 2 and 5.
- `halves`: always splits in half. Must fail rule 1 tight cases and pass
  rule 5.
- `memory`: skilled, but remembers only the last weighing (a human with 27
  coins). Proves whether Mark is really required. It must fail rule 2 cases
  unless it marks.
- `random`: weighs once, accuses at random. Expect ~1/N win; with 3 strikes
  it must die by case ~4.
- `allWeigh`: spends the whole budget, then guesses. Must lose tight cases.

Targets for the notes file: `skilled` clears every case and the Endless
median; `novice` reaches case 4-6; `habit` dies at rule 2; `memory` dies
without marks and survives with them. Bot rates are optimistic for new
humans (findings): expect humans below them.

#### Risks

- Famous puzzle: the hook is the generated variety and the rule breaks, not
  the classic 12-coin riddle. If cases 1-2 feel like a quiz, shorten them.
- Marks may feel optional to a good memory: the `memory` bot and phone
  playtests decide; if needed, shuffle the tray order after each weighing so
  position stops carrying memory.
- Guessing: with N = 9, an accusation is a 1/9 shot. Strikes make a guess
  cost; if players spam it, require at least one weighing before Accuse.
- Tight cases that need the classic trick may feel unfair without a hint;
  keep slack 1 until rule 2 is done.
- Keep the file under ~40 KB.
