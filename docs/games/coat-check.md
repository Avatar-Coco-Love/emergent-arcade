# Coat Check: design notes (pre-build)

**Not built.** Brief: `docs/ideas/coat-check.md` (idea, not yet approved).
This file records the go/no-go harness run before any game file exists.
Harness: `node scripts/balance-coat-check.mjs 300` (~15 s). The rules live in
the script between `// § sim` and `// § end sim`; the game should copy that
block, and the harness should then cut it from `games/coat-check.html` with
`buildDebug()` like Counterfeit Scale's.

## What the sim implements (from the brief)

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

## Baseline (brief's numbers, 300 runs, 2026-10-03)

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

## Go/no-go

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

## Lever sweep (`COAT_VARIANT=…`, 300 runs)

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

## Recommendation

Go, with changes, before writing the game file:

- Use `load=+1, friend=0.2` from S2 (encode 2.3× scatter, habit fails rules
  4–8, cap7 still clears).
- Call S2–S3 tutorial shifts and check the habit only on rules 4–8.
- Lower the cap4 target to "reaches S8 most runs" (67% in this variant), or make
  the scheme worth more. One way: rule out pin tickets on look-alike
  pairs until S9. Pin tickets are the third of tickets no scheme can index.
- Calibrate k on the first playtest (`wrong`, `peeks`, `purity` against the
  cap rows; purity 75 means "no scheme").

## Open questions

- The memory model is a guess (most-recent k, no chunking). Humans who chunk
  "row A = reds" may keep more. Recalibrate when real `purity`/`wrong` rows exist.
- Should a ⇄ ticket let a peek confirm the coat? A player who forgot the
  friend's coat can't tell it on sight, so bots don't peek there. That makes
  friends the main killer.
- Reshuffle budget uses coats in row − 1 (exactly what `perfect` needs). The
  brief's "row length − 1" (always 3) is more generous and easier to read.
