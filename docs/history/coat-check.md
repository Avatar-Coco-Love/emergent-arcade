# Coat Check: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/coat-check.md`. Add new entries at the top; sessions don't read
this file by default.

## Pre-build go/no-go (2026-10-03, PR #72, before v1)

Moved here from `docs/games/coat-check.md` when v1 was built. v1 applied its
recommendation: load +1 from shift 2, `friendP` 0.2, habit checked on rules
4-8 only, cap4 target "reaches shift 8 in most runs". The harness then still
held the rules; it now cuts them from the game file.

**Not built.** Brief: `docs/ideas/coat-check.md` (idea, not yet approved).
This file records the go/no-go harness run before any game file exists.
Harness: `node scripts/balance-coat-check.mjs 300` (~15 s). The rules live in
the script between `// § sim` and `// § end sim`; the game should copy that
block, and the harness should then cut it from `games/coat-check.html` with
`buildDebug()` like Counterfeit Scale's.

### What the sim implements (from the brief)

- Coats: colour, pattern, pin, 4 values each (shift 1: colour and pattern, colour
  tickets only). No two identical coats on the hooks at once.
- Stream: arrivals until the load target is reached, then 60/40 arrive/leave.
  Leavers are weighted by time on the hook. The ticket names a feature unique among
  hung coats. Arrivals are the best of 6 random coats (the one that leaves the most
  guests nameable). Fallback when nobody can be named: a pair ticket outside the
  rules (0.8% of tickets). Retention, in counter events: p10 3, median 8, p90 15.
- Rules: look-alikes (50% of arrivals copy 2 features of a hung coat, 70% vary
  the pin); coach (cols + 2 coats of one colour, arriving 1st or 2nd);
  reshuffle (the fullest row, every 5–7 counter events, which comes to ~3 per
  10-guest shift; budget += coats in row − 1); friends (35% of arrivals bring a
  friend; ⇄ ticket 70% when possible); pair (50% when a pair is the only unique
  name); regulars (1–2 guests stay, are fetched next shift, up to 2 unused peeks
  carry).
- Budget = slack (2 campaign, 1 Endless) + reshuffle growth. `perfect` clears
  1200/1200 campaign shifts and 100% of Endless with zero wrong doors.
- Campaign: S1 2×3 4 guests load 3 · S2 3×3 6/4 · S3 3×4 8/6 · S4–S8 3×4 10
  guests, load 7,7,7,8,8 · S9–S11 10/8 · S12 12/9 (all rules). Endless: load
  8 + ⌊e/2⌋ (max 12, 4×4 from load 10), guests load + 6, 2–3 random rules.
- No clock: same runs at 1, 4 and 10 s per action (checked).

Memory model (the brief's guess): k coats, most recently hung, peeked or seen
behind a wrong door, each with hook (or row after a reshuffle) and arrival order.
Forgotten coats are searched by scheme: doors the scheme assigns to the ticket's
feature first, ruled-out doors last. Spills mislead until opened. A ⇄ ticket
can be settled by a peek only if the bot remembers the friend's coat.

### Baseline (brief's numbers, 300 runs, 2026-10-03)

First-try win % per shift S1–S12, then median coats per run, shift reached, campaign %.

| bot | S1–S12 | coats | reach | camp |
|---|---|---|---|---|
| cap3 | 100 100 83 57 84 36 61 56 35 32 60 19 | 62 | S8 | 4 |
| cap4 = encode | 100 100 98 79 94 58 75 76 64 45 82 36 | 84 | S10 | 23 |
| cap5 | 100 100 100 98 100 77 94 93 85 63 94 55 | 114 | S13 | 63 |
| cap7 | 100 … 100 87 100 89 | 192 | S18 (+6 Endless) | 98 |
| scatter | 100 100 95 57 65 43 27 31 18 29 29 8 | 48 | S6 | 0 |
| habit | 100 100 95 56 46 44 49 44 28 16 53 4 | 47 | S6 | 0 |
| noPeek | 100 100 100 100 **47** 100 100 100 100 **34** 100 **11** | 85 | S10 | 3 |
| novice | 100 98 55 15 42 10 4 4 1 16 5 4 | 22 | S4 | 0 |
| peekOnly | 92 24 1 0 … | 10 | S2 | 0 |
| random | 62 11 0 … | 7 | S2 | 0 |

Purity (median per shift): habit 86, encode 83, scatter 75, novice 67, perfect
(fills in reading order) 61. **Random placement already scores ~75**, so compare
human purity with 75, not 0.

### Go/no-go

1. **Encode vs scatter (k = 4): near miss.** 84 vs 48 coats (1.8×, target 2×).
   Per shift the gap is wide from S4 on (S7 75 vs 27, S9 64 vs 18). Scatter
   reaches S6, not "dies by rule 3", because the free retry lets it through
   S3 (95%). The scheme can't help with pin tickets (a third of them), and
   peeks rescue scatter. The premise holds; the margin is thin.
2. **noPeek on reshuffle shifts: Peek earns its place.** noPeek wins 96–100%
   of every non-reshuffle shift and 47/34/11% of S5/S10/S12 (cap7 100/87/89).
   97% of its runs never finish the campaign (median end S10). That misses the strict "must fail"
   (≤ 25%) only at S5. Keep Peek: it is needed exactly where the brief says.
3. **Habit on each rule: fails as sized.** S2 100%, S3 95% (can't fail: see
   below), S4–S8 44–56% (target ≤ 40). With load +1, S4–S8 is 29–37% (pass).
   - **Load ≤ k + 1 is solved by elimination.** A bot that remembers k coats
     knows the last door by elimination, and one peek settles k + 2. S2's
     load (4) and S3's (6) never get past a k = 4 habit, whatever the rule.
     Even with S2 at 10 guests and load 5, habit still wins 100%. A rule
     can only break a habit once load ≥ k + 3. So S2–S3 are tutorial shifts:
     either accept that, or move the habit check to rules 4–8.

Other targets: perfect PASS; random dies at S2 PASS; peekOnly dies at S2–3
PASS; novice wins S1 (24 s at 3 s/action) and S2 98% PASS; cap7 Endless
median +6 PASS. Misses: cap3 lasts to S8 (target 4–5); cap4 clears
the campaign 23% (target ~50%); cap4 reaches S8 after 9.3 min at 4 s (target 10+);
novice never reaches S8 (the bot never learns, so this is a floor, not a
forecast); cap5 rarely reaches Endless (+1 shift, 3 min).

### Lever sweep (`COAT_VARIANT=…`, 300 runs)

| variant | enc/scat | noPeek S5/S10/S12 | habit S4–S8 | cap4 camp | cap7 camp |
|---|---|---|---|---|---|
| baseline | 1.8× | 47/34/11 | 44–56 | 23% | 98% |
| slack=1 | 1.8× | 47/34/11 | 39–49 | 17% | 98% |
| res=4-5 | 1.6× | 38/28/9 | 41–56 | 30% | 97% |
| friend=0.2 | 2.1× | 47/35/12 | 44–56 | 31% | 98% |
| load=+1 | 2.0× | 40/34/7 | 27–37 | 9% | 84% |
| load=+1,friend=0.2 | **2.3×** | 40/35/9 | **29–37** | 16% | 96% |
| load=+1,guests=+2,friend=0.2 | 2.6× | **25/17/4** | 17–25 | 2% | 96% |
| load=+2 | 1.9× | 36/25/9 | 17–29 | 1% | 79% |

Friends is the hardest rule for every memory bot (cap4 58% at S6, 45% at
S10). Fewer friend pairs (0.2) raise cap4 without helping scatter. Load +1
makes habit fail rules 4–8 but halves cap4's campaign. The brief's targets
pull against each other at k = 4: "habit ≤ 40% per rule" and "cap4 clears the
campaign half the time" both use the same memory size. They only fit together if
the scheme is worth more than it is here.

### Recommendation

Go, with changes, before writing the game file:

- Use `load=+1, friend=0.2` from S2 (encode 2.3× scatter, habit fails rules
  4–8, cap7 still clears).
- Call S2–S3 tutorial shifts and check the habit only on rules 4–8.
- Lower the cap4 target to "reaches S8 most runs" (67% in this variant), or make
  the scheme worth more. One way: rule out pin tickets on look-alike
  pairs until S9. Pin tickets are the third of tickets no scheme can index.
- Calibrate k on the first playtest (`wrong`, `peeks`, `purity` against the
  cap rows; purity 75 means "no scheme").

### Open questions

- The memory model is a guess (most-recent k, no chunking). Humans who chunk
  "row A = reds" may keep more. Recalibrate when real `purity`/`wrong` rows exist.
- Should a ⇄ ticket let a peek confirm the coat? A player who forgot the
  friend's coat can't tell it on sight, so bots don't peek there. That makes
  friends the main killer.
- Reshuffle budget uses coats in row − 1 (exactly what `perfect` needs). The
  brief's "row length − 1" (always 3) is more generous and easier to read.

## Original design brief (2026-10-02, before v1)

Moved here from `docs/ideas/coat-check.md` when v1 was built. Parts v1
changed: the levers above; *Full House* counts 10+ coats hanging (every hook
full can't happen: arrivals stop at the load target, always below the hook
count); the `fetch` function in the sim is named `retrieve` (the
self-contained check rejects the word). See "Changes from the brief" in the
notes file.

### Coat Check: design brief for implementation

Status: idea, written on paper (this brief), not built, not yet approved by
the maintainer. Go/no-go harness built and run 2026-10-03:
`scripts/balance-coat-check.mjs`, results and recommended changes in
`docs/games/coat-check.md`. `id`: `coat-check` (permanent feedback key). Category: a
working-memory game with a seeded guest stream. It would be the first game
with the `working-memory` topic (marked `planned` in `assets/topics.js`).
Read first: `docs/PROJECT_BRIEF.md`, `docs/findings.md` (every rule applies),
`docs/adding-a-game.md`, `docs/scores.md`, `docs/telemetry.md`. Base the bot
harness on the closest existing one (discrete and turn-based:
`scripts/balance-counterfeit-scale.mjs`) as `scripts/balance-coat-check.mjs`.

Framing: this is a game *about* working memory, the way Counterfeit Scale is
a game about information. It is not brain training. Evidence that memory
games improve memory outside the game is weak, so no manifest text, blurb
or achievement may claim that.

#### Pitch

You run a cloakroom. Guests hand over coats; you hang each one behind a
door, and the door shuts. Later a guest shows a ticket that names one thing
about their coat ("★ pin") and you open the door you think hides it. Nothing
on screen remembers for you; only *where you chose to hang it* does. Players
end up inventing a filing system (row by colour, column by pattern), and
each new rule breaks the system they have. Score = coats returned in a run,
no ceiling.

#### Verbs (3, orthogonal) and shared state

- **Hang** (`drag`): drag the coat from the counter onto any free hook. The
  door closes over it. A hung coat can't be moved again (findings: *A
  two-way verb forgives its own misuse*; re-sorting with Peek would undo the
  cost of a bad scheme). No tap-to-hang: a stray tap must never place a
  coat. Keyboard: arrows pick a hook, `Enter` hangs.
- **Fetch** (`tap`): when a ticket is up, tap a door to open it. Right coat:
  the guest leaves and the hook is free again. Wrong coat: the door opens,
  shows what it holds (information you paid for), shuts, and the guest
  files a **complaint**; try again. Taps on doors do nothing while a coat
  is waiting to be hung. Keyboard: arrows, `Enter`.
- **Peek** (`hold`): hold a door to open it a crack for as long as you
  hold; release to close. Costs one peek from a small budget (pips in the
  HUD), like Counterfeit Scale's weighings. Read-only: nothing moves, the
  guest isn't served. Keyboard: hold `P` on the selected hook.

Shared state: **the hooks** (which coat is behind which door, and which
doors are free) plus the peek budget.

- Hang writes the hook contents; Fetch and Peek read them (Fetch through
  the player's memory of where things went, Peek directly).
- Fetch writes occupancy (frees a hook); Hang reads it. Once a row fills,
  the next coat goes off-scheme, and the player has to remember the
  exception. With the "coach party" rule this is unavoidable.
- Peek reads the contents and spends the budget. Fetch reads the budget:
  with no peeks left, a doubt becomes a guess, and a wrong guess is a
  complaint.

Findings check, *A verb only shares state if succeeding needs to read it*:

- Fetch while ignoring the hooks is a random door: the `random` bot must die
  in shift 2.
- Hang while ignoring the hooks (random placement) must lose to a scheme at
  the same memory capacity (`encode` vs `scatter`, below). This is the
  target the game stands on: **encoding must beat random**.
- **Peek is kept, but it only earns its place from rule 5 (the manager
  reshuffles a row).** Before that, perfect memory never needs it and it is
  a safety net. After a reshuffle, no memory can know the new order, so
  succeeding needs to read the hooks again. Prove it the Rail Yard way
  (*A route verb is only needed where the other verb can't follow a
  chain*): a `noPeek` bot with a good scheme and k = 7 must fail reshuffle
  shifts, and `peekOnly` (remembers nothing and peeks until it finds the
  coat) must die by shift 3. If `noPeek` passes the reshuffle shifts, cut
  Peek and ship 2 verbs.

The hold must be safe against a slow tap. Under 0.2 s is a fetch, 0.2–0.45 s
does nothing, and from 0.45 s it is a peek. A ring fills on the door, so the
threshold shows where the player acts (findings: *A player can know the
verbs and miss the moment*). Count `cancels` in telemetry.

Mechanic map: `drag + tap + hold` uses only tried pairs (`drag + tap` is the
most tried, 8). We accept that because the topic is new: `working memory`
has no game with any verb.

#### Why there is no N-back clock

N-back shows a new item every ~2–3 s whether or not you are ready. The clock
sets how long you get to rehearse, so the task is partly a speed test.
Coat Check has **no timer and no decay**. The stream advances only when the
player hangs or fetches. Coats never expire. Reshuffles and the
"regulars" rule count guests, not seconds (findings: *A decay rate turns a
puzzle into a speed test*: charge per action). Taking longer gives a player
time to rehearse, but it adds no capacity. Difficulty comes from **load**
(coats hung at once), **retention** (actions between hanging a coat and
fetching it) and **interference** (look-alikes, reused hooks).

Harness check: run every bot at 1, 4 and 10 s per action. Results must be
identical. That shows nothing in the game reads the clock. `time` is
reported only.

#### How the screen stops memory being written down

Counterfeit Scale gives the player a Mark verb because bookkeeping is its
point. Coat Check is the opposite: the only external memory allowed is the
placement itself, and the game makes sure placement can't hold everything.

- Closed doors look identical whatever is behind them: no bulge, no colour
  under the door, no count. Rows and columns get neutral labels (A–C, 1–4)
  for the keyboard. Rows have no tint, because a tint would suggest the
  scheme.
- No log of past coats or tickets, and no queue preview. The ticket shows
  only the feature (icon and word), never a hook.
- Free hooks are visible (Hang needs them). Arrival order is not shown.
- Placement can't encode a whole coat. Coats have 3 features with 4 values
  each, which makes 64 combinations, and there are at most 16 hooks. From
  shift 3 the grid never matches the feature counts (3 rows for 4 colours,
  for example), so a clean lookup table never fits. A scheme encodes one
  feature well and part of a second; the third is always in your head.
- Tickets pick a feature at random among those that single the coat out.
  At hang time you don't know which feature you'll be asked for.
- Pause hides nothing that matters (the doors are already shut). Paper and
  screenshots can't be stopped; see Risks.

#### Generator

- A shift = `(hooks grid, features in play, rule set, guests, max load,
  peek budget, seed)`. Seeded RNG; the seed goes to telemetry so a shift
  can be replayed.
- The stream interleaves arrivals and departures. Arrivals come first, until
  the load reaches the target. Who leaves is weighted toward guests who
  have stayed longer, so retention varies (some coats leave after 2
  actions, some after 15).
- The ticket names a feature that is unique among the coats on the hooks
  right now. If several are unique, one is picked at random. A guest whose
  coat has no unique feature isn't picked to leave, except under the
  two-feature rule.
- Solvability (Counterfeit Scale's "never generate a case the solver
  can't finish"): a `perfect` bot (unlimited memory, best peeks) must clear
  every shift with zero complaints within the peek budget. Budget = what
  `perfect` needs + slack (2 in the campaign, 1 in Endless).

#### Rules ladder (campaign) then Endless

The habit after shift 1: **"hang each coat in its colour's row, left to
right; fetch from the ticket's row"**. Written as the `habit` bot, it never
peeks unless it is stuck. Each rule below must break it in its first shift
(rules, not sizes: *A general trick beats a set of levels*).

1. **Colour tickets** (hook, first minute): 2×3 hooks, coats with colour and
   pattern only, 4 guests, load ≤ 3, every ticket names a colour. The hint
   "Drag the coat onto any hook" is on screen from the start, then "{Tap}
   the door with the red coat". A novice wins it in under ~40 s.
2. **Any feature**: pins appear, and tickets name colour, pattern or pin.
   A colour row answers a third of the tickets; habit has to remember the
   rest. This rewards a second axis (column = pattern).
3. **Look-alikes**: pairs of coats share two of three features, and the
   ticket names the one that differs. A colour × pattern grid puts both in
   the same cell, so the player has to split them by the third feature.
   Grid 3×4, 4 colours (no clean table).
4. **Coach party**: a skewed stream (6 navy coats in a row of 4). The scheme
   row overflows; the player picks where the exceptions go and remembers
   them. Fetch frees hooks mid-shift, so the overflow keeps moving.
5. **Manager's reshuffle**: every ~6 guests the manager reorders one row.
   Its doors rattle and the strip names the row; the contents stay in the
   row. A scheme by row survives, and position in the row is lost. Peek
   becomes required (the budget grows by the row length − 1 per reshuffle).
6. **Friends (swapped tickets)**: a ticket marked ⇄ names the *friend's*
   coat. The guest's own coat was handed in right after it. Feature schemes
   don't store arrival order; a player who fills hooks in arrival order
   can read it back.
7. **Two-feature tickets**: "striped + ★". Neither feature is unique, only
   the pair. The player intersects two parts of their scheme.
8. **Regulars**: 1–2 coats stay overnight and are fetched in the next shift
   (findings: *Carry-over makes the second verb pay more each round*). Unused
   peeks carry over too (max +2), so remembering well pays.

- Campaign: 12 shifts (8 rules, plus mixes of 3+4, 5+6, 7+8 and all). After
  shift 3, hooks stay ≤ 4×4 so doors fit a phone. From then on difficulty
  comes only from rules and load.
- **Endless**: random rule mixes; load rises by 1 every 2 shifts (max 12)
  until 3 complaints in one shift.
- A shift is lost at 3 complaints. In the campaign the first loss of each
  shift is a free retry from its start, with new coats (the same coats
  would replay memory). In Endless a lost shift ends the run.
- Each shift ends with a 2 s **recap**: all doors open, showing where
  everything was. Input is ignored during it. This is how a player sees
  their own scheme.

#### Score, manifest, telemetry

- A shift is a round. Post `arcade:result` with `outcome` (`win` = cloakroom
  emptied; `loss` = 3 complaints), `time`, `level` (shift), `run`,
  `attempt`, `reason` (`complaints`) and `stats`. Check `docs/telemetry.md`
  for the field rules (≤ 16 numeric stats).
- `stats`: `coats` (returned), `wrong` (wrong doors), `peeks`, `peeks_left`,
  `load` (max hung at once), `hooks`, `rule`, `reshuffles`, `cancels`,
  `actions`, `think_s` (median seconds per action, for the depth
  maths), and `purity` (0–100). `purity` is the share of coats hung in a
  row that agrees with that row's most common value of its best feature.
  It measures whether humans build a scheme at all, which is the game's key
  question.
- `score`: coats returned in the run, e.g. `{ "label": "Coats returned",
  "better": "higher", "format": "count", "wins": false, "max": 2000,
  "epoch": 1 }` (check `docs/scores.md` for exact fields). No ceiling:
  Endless keeps going.
- Manifest mechanics: `hang` (verb `drag`), `fetch` (verb `tap`), `peek`
  (verb `hold`). Text uses `{tap}`, `{hold}`, `{drag}`, `{finger}`; PC keys go
  in `keyboard`. `goal`, `howToPlay`, `topics`, 3+ achievements:
  - *First Night*: clear the campaign's first 4 shifts.
  - *Clean Shift*: clear a shift of 8+ guests with no complaints and no
    peeks.
  - *Filing System*: clear a 12-hook shift with `purity` 100.
  - *Sharp Eye*: after a reshuffle, return every coat from that row with at
    most one peek.
  - *Full House*: return a coat while every hook is full.
  - *Night Porter*: return 100 coats in one run.
- Handle `arcade:pause` / `arcade:resume`. Fill the window with no
  scrolling. Ignore input ~1 s after a shift ends (and during the recap).

#### Readability (findings)

- Messages ("Hang this coat", "Find: ★ pin", "Manager reshuffled row B")
  get their own strip, never drawn over the doors. The layout refits on
  every shift change. Screenshot every rule at phone portrait and
  landscape with a hint showing.
- Coats are primitives: a coat outline in one of 4 colours, a pattern fill
  (plain, stripes, dots, check) and a pin glyph (★ ☾ ♥ ■). Patterns and pins
  are told apart by shape. Colours are chosen to survive colour-blindness,
  and tickets always say the word ("navy") next to the swatch.
- Complaints (3 pips) and peeks (pips) sit in the HUD. The current rule
  sits on a line above the grid ("Look-alikes: the ticket names the
  difference").
- There is never a still screen: a guest always waits with a prompt
  (*A still screen that's still winnable reads as broken*).

#### Phone layout

Portrait 360×640: strip (rule and message) on top, then the counter (the
guest, their coat or ticket, ~140 px), then the grid, which fills the rest.
At 4 columns × 4 rows a door is ~80×80 px, well above a 48 px target. The
HUD (complaints, peeks, coats returned, best) goes in a thin bar under the
strip. Landscape: counter on the left third, grid on the right. You drag
from the counter down to a door; the coat follows the finger with an offset
so the finger doesn't hide the target door. A hold shows its ring around
the finger, not under it.

#### Balance and playtest

Memory model (shared by the bots, a guess to be checked against humans): a
bot stores up to *k* hook → coat bindings, keeping the most recently hung or
peeked. On a ticket, its candidates are the occupied hooks consistent with
what it remembers and with its own scheme (row A holds only reds). Then it
opens the best candidate, or peeks first if candidates > 1 and the budget
allows. A scheme helps exactly when a forgotten coat is still pinned down
by its row or column.

Bots, one line each:

- `cap3` … `cap7`: the good scheme (row by the most common feature, column
  by the second, look-alikes split by the third, overflow to the emptiest
  row), memory k = 3..7. Targets: k = 3 clears shifts 1–3 and dies around
  rule 4–5; k = 4 (around a typical adult's span) clears the campaign about
  half the time; k = 7 clears it and dies in Endless after a median of
  6–12 more shifts, so the run ends.
- `encode` vs `scatter` at k = 4: same memory, scheme vs random hooks.
  Target: `encode` returns at least 2× the median coats of `scatter`, and
  `scatter` dies by rule 3. If not, the hooks aren't really shared state,
  so redesign before building.
- `novice`: k = 3, hangs left to right in arrival order, peeks when unsure
  until the budget is gone, 2–3 wrong doors per shift. Must win shift 1 in
  under 40 s (actions × 3 s) and usually shift 2, and survive a shift with 2
  wrong taps.
- `habit`: the shift-1 habit above, k = 4. Must clear shift 1 and win ≤ 40%
  of each rule's first shift (2–8) on its own.
- `peekOnly`: random hooks, no memory, peeks until it finds the coat. Must
  die by shift 3 (proves memory is the game, not the budget).
- `noPeek`: `cap7`'s scheme, never peeks. Must fail reshuffle shifts
  (proves Peek is a verb, not a hint).
- `perfect`: unlimited memory and best peeks. Must clear every shift with
  zero complaints (solvability check).
- `random`: random doors. Must die in shift 2.

Depth target (10+ minutes) is proven by action count, not wall clock. One
action = a hang, a fetch or a peek. The campaign has ~110 guests (4, 6, 8,
then ~10 a shift), so ~220 hangs and fetches plus ~25 peeks and wrong doors
is ~245 actions (12 minutes at 3 s, 16 at 4 s). Reading a coat and choosing a hook takes a human more like
3–5 s than a tap's 1 s. So the harness prints, per bot, `actions` × 3, 4 and
6 s. Target: `novice` and `cap4` need 10+ minutes at 4 s/action to see all
8 rules (counting retries), and the median `cap5` Endless run adds 5+
minutes and then ends. After merge, swap the assumed 4 s for the measured
`think_s`.

Bot rates are optimistic for new humans (findings: *First player data vs
the bots*). Here the memory model is itself a guess, so the first playtest
calibrates k: compare human `wrong`, `peeks` and `purity` against the cap
bots, and note which k the player looks like.

#### Topics

With the tags PR merged (#70): `working-memory`, removing its `planned`
mark in `assets/topics.js`. There is no spatial-memory tag. `spatial-reasoning`
("the whole space turns") doesn't fit: nothing rotates. Don't stretch it.
The spatial side is how this game uses working memory, which the
`working-memory` test already covers ("the game doesn't show it again"). If a
second memory game arrives, it can decide whether `spatial-memory` deserves
its own tag. `planning` is a possible second tag (the scheme is planned
ahead), but only if a playtest shows players plan it rather than drift
into it.

#### Risks

- **The memory model is a guess.** All targets rest on "k bindings,
  most recent first". Humans chunk, rehearse and forget unevenly. Keep the
  targets as ranges and recalibrate from the first `purity` and `wrong`
  rows.
- **Paper and screenshots** beat the game, and with no timer they cost
  nothing. Accept it: the game is for the player's own satisfaction.
  Leaderboard outliers (a perfect Endless run of 500) are a sign; note
  them and don't design around them yet.
- **Forgetting feels worse than miscounting.** A wrong door must teach
  something: it shows what was there, and the recap shows the whole room.
  If playtesters call it punishing, give Endless 4 complaints, not a bigger
  budget.
- **Hold vs tap on the same door**: a slow fetch may become a peek. The
  dead zone and the ring should prevent it; watch `cancels` and
  wrong-door rates on phones.
- **Too easy for a strong encoder**: look-alikes, mismatched grids and
  two-feature tickets are there to stop any single scheme from solving
  everything. If `cap7` never dies in Endless, raise the load cap, not the
  speed.
- **Brain-training drift**: no "improve your memory" copy anywhere, now or
  in a revision.
- Keep the file under ~40 KB (Counterfeit Scale reached 45).
