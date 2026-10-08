# Murmuration: story mode (ideas ledger and plan)

Status: **Chapter 1 is specified and confirmed: build brief in
`docs/games/murmuration-chapter1.md` (v8). Nothing built yet.** After that PR the
next one is the **gallery save/load channel** ("PR A" below), which chapter 2
needs. The rest are ideas. Current design:
`docs/games/murmuration.md` (v7). Written 2026-10-08 from a brainstorm; the
numbers below are starting points worked out from the constants, not
simulated. Sessions reading this for other reasons: not an instruction.

Statuses: **decided** (user agreed), **leaning** (recommended, open),
**candidate** (liked, not designed), **rejected** (with why).

## The idea in one paragraph

A migration of 16 nights in 3 chapters of 5 plus a finale, a flock carried
from night to night, gates with different rules, bird types that matter,
light story framing. Keeps the two verbs (**lure**, **startle**) and the
shared **fear per bird**. Depth target: 10+ minutes (now: 0 of 7 v4 players
got there, longest 556 s).

## Decisions and leanings

| Topic | Status | Notes |
|---|---|---|
| Same `id` (`murmuration`), edit in place, version bump | leaning | CLAUDE.md rule. Bump `score.epoch`. Keep today's 5-gate night as **Classic night** (also the baseline for new stats). |
| Nights in a row, flock carried over | decided | Flock is the health bar. |
| Failing a night costs birds, not the run | leaning | -3 per uncleared gate, +4 for a full clear, recruits add. Run over when flock < the night's `GATE_NEED`. Start 40, cap ~55. Reason: humans win 36% of single nights, so a hard-fail 8-night run is almost never finished. |
| Fear does not carry over | leaning | Each dawn the flock is calm. |
| Slow progression | decided | Four beats per idea: introduce, practice, combine, test. One dial per night; a breather (lower pace) every few nights. |
| Night 1 lure only, startle off, `LURE_SPOOK` ~0.45 | leaning | Free on a night with no startle (the notes rejected a global softening because it erased the startle's edge). Full spook from night 2. Measure `spook_s` on both. |
| Night 2+ needs its own layout | decided | Today's layout gains only 4-5 s from startle; it can't teach the tap. |
| Recruits: calm stragglers placed in the sky | leaning | Join by flocking, no new mechanic. |
| Story: light (landmark names, sky palette per chapter, one line per dawn card, progress strip) | leaning | |
| Persistence: gallery save channel | leaning | Games are sandboxed (`allow-scripts`, no `localStorage`). See prerequisites. Stopgap: a typed chapter code. |
| Ship Chapter 1 first, read the funnel, then chapter 2 | decided | Stacked revisions leave nothing to measure. |

## Pacing pattern (16 nights)

Introduce, practice, combine, test; every 3rd or 4th night a breather.
Do not size a night by path length / `DUSK`: the first estimate was off by
2x (a 625-unit path took lure bots 8-10 s, the 1,268-unit classic path
40 s). Size nights by bot win rates (below). Typical humans track `lure60`
(36% win vs lure60's 45% on the classic night).

**Chapter 1, The Gathering (6 nights, first PR). Simulated 2026-10-08**
(`scratchpad` copy of the balance bots with a per-night gate list, lure
clamped to the sky, 50-60 seeds; classic night calibrates at lure60 45%,
lure80 85%, smart90 93% @60). Win % at the chosen DUSK; lure60 stands in
for a typical human.

| # | Night | Beat | Config (need / half / window / DUSK / spook) | Gates (x, y, angle) | lure60 | lure80 | smart90 |
|---|---|---|---|---|---|---|---|
| 1 | Dusk | introduce lure | 12 / 70 / 5 s / 45 / 0.45 | (120,430,105) (300,320,59) (110,210,120) (280,90,55) | 98% (median 18 s) | 100% (11 s) | - |
| 2 | Second flight | practice | 13 / 65 / 4.5 s / 50 / 0.65 | (300,330,10) (120,260,110) (260,150,52) (100,440,29) | 94% (31 s) | 100% (21 s) | - |
| 3 | First tap | introduce startle | 13 / 60 / 4.5 s / 60 / 0.9 | (130,440,106) (310,160,33) (90,250,68) (300,480,138) | 92% (29 s) | 96% (19 s) | 100% (21 s) |
| 4 | Open sky | practice | 13 / 55 / 4 s / 60 / 0.9 | (90,380,119) (290,200,48) (270,470,4) (100,150,152) | 70% (49 s) | 100% (27 s) | 100% (23 s) |
| 5 | Breather | recruit | 12 / 65 / 5 s / 40 / 0.9 | (200,400,135) (310,230,33) (150,90,131); 4 recruits near (165,320) | 94% (16 s) | 94% (13 s) | - |
| 6 | The edge | test | 13 / 50 / 4 s / 60 / 0.9 | (70,420,90) (330,300,90) (70,170,90) (250,70,0) | 62% (48 s) | 92% (29 s) | 92% (25 s) |

Findings that changed the plan:
- Night 1 with 3 gates took lure bots 8-10 s; 4 gates gives 11-18 s.
- Night 3: the tap helps (smart90 21 s vs lure60 29 s) but lure80 is as
  fast (19 s): the tap is comfortable and optional there, as an intro should be.
- Night 4: tapping pays (rear100 23 s, smart90 23 s vs lure60 49 s).
- **Night 6 reversed the hypothesis.** On the edge layout the *lure* loses
  the birds (lure bots lose 9-12 on a win; rear100/smart90 lose 1-3): the
  lure ahead of the flock near the border spooks birds into panic, and
  panicked birds ignore the border. So the lesson is "the lure's spook near
  an edge costs birds; a tap from inside the flock is cleaner". Gates at
  x=50/350 were too harsh (lure60 20% @70); x=70/330 with half 50 is a fair test.
- Night 4 gates at x>=310 also bled birds (10); keep gates x<=290 there.
- Recruits are not simulated yet.

**Chapter 2 (sketch)**: crosswind alone, narrow/wide gates, calm gates,
ordered gates. **Chapter 3 (sketch)**: hawk, fear gates, bird types and type
gates, storm night. **Finale**: 7 gates, mirrored layouts, tight windows.
After the story: endless mode and a seeded Daily.

## Gate types (candidate)

Each turns a bird state or a count into a rule. Thresholds from constants:
one tap sets fear 0.6, decay 0.12/s, so it stays >= SCARED (0.25) ~3 s but
>= 0.5 only ~0.8 s; a panic gate (>= 0.75) needs contagion or several taps.

| Gate | Rule | Teaches |
|---|---|---|
| Standard | N within the window | today |
| Narrow / wide | half-width 35-90 | squeezing raises `CROWD_FEAR` |
| Calm | only birds < 0.25 fear count | calm lure |
| Fear | only birds >= 0.25 count | tap just before, hurry |
| Toll | most of the flock (e.g. 30 of 35) | cohesion |
| Ordered | numbered, or a rule ("narrow before wide") | planning |
| Free order | clear all, any order | route choice |
| Locked / timed | opens after another; closes after 15 s | pacing |
| Twin | two gates at once, 8 birds each | splitting (late, experimental: one finger can't lure two groups) |
| Type | needs k birds of a type | keep the types together |

Accessibility rule: colour is never the only cue. Post shape (circles =
calm, spikes = fear, number plate = ordered) plus a text label, and the live
region (`#say`) announces the active gate's rule.

## Bird types (candidate)

Elders (bigger, steadier, more neighbours matched, less fear gain), scouts
(faster, looser), fledglings (small, slow, panic easily). Differ by size and
silhouette, not just colour. Arrive as named recruit groups. Teaches the
real result that a small informed minority can steer a flock.

## Other ideas to keep (candidate)

- Obstacles that force startle; a hawk that chases stragglers and panics
  what it touches (fear as a shield); wind bands; fog (next gate shown as
  an arrow until close; ties to the "next gate" keyboard line in the notes);
  storm (contagion up, lure weaker).
- Stars per night from `spook_s` (calm lure); a zero-startle "calm run".
- Achievements: Edge Dancer (night 6 with no birds lost), Calm Hands,
  First Light, Weatherwise.
- Endless "keep migrating" mode; seeded Daily.
- Rejected: global spook softening (erases the startle's edge); carrying
  fear between nights (unfair, one panic poisons the next night).

## Prerequisite work, in order

Rule from CLAUDE.md: with < 3 players on the current version, a revision is
allowed for a bug, crash, accessibility, or the **first depth pass**. This
is that depth pass. Baseline now (2026-10-08): v4 7 players, 36% win; v7 1
player (won, 40 s, `spook_s` 8.5 of `lure_s` 29.9); 94% touch. Thin, so
before locking designs, **watch 2-3 people play on a phone** (night 1 above
all).

**PR A: gallery save channel. Not needed for Chapter 1** (6 nights are
~4-6 min, one sitting; needed before chapter 2). Separate PR, helps every multi-level game;
Pressure Grid's notes already ask for it)
- Handshake mirroring `arcade:best`: the game posts `arcade:ready`; the
  gallery replies `arcade:load { data | null }`; the game posts
  `arcade:save { data, rank }`. The game must start fresh if no reply in
  ~400 ms (opened directly, or the standalone download).
- Storage `arcade.save.<id>` in `assets/progress.js` (key list, size cap
  ~2 KB, plain JSON, validated), included in export (format v3) and import
  (merge: higher `rank` wins), cleared by per-game and full reset.
- The standalone download shim (`assets/download.js`) needs its own
  `localStorage` implementation of the same two messages.
- Decide classroom mode (shared devices): probably saves off.
- Manifest flag (e.g. `saves: true`) that `validate.mjs` checks (game
  handles `arcade:load`); smoke-gallery and monkey-games cover the
  round trip; docs in `adding-a-game.md`, `gallery.md`, `scores.md`.
- Never sent to telemetry.

**PR B: telemetry tooling** (no backend change, no redeploy)
- `fetch-telemetry.mjs`: group the level lines by (`level`, `nv`), print
  medians of numeric `extra` keys too, add `--night`.
- Decide the extra-row budget (48 keys, 8 KB; arrays <= 32 items, 2 deep).
- Optional later: an `arcade:event` message forwarded as a new `play` kind
  (events tab) for non-round things (hint shown, chapter chosen). Not needed
  for Chapter 1: quit points come from session rows.

**PR C: the game (v8)**, two commits
1. Behaviour-neutral refactor: constants into a per-night config
   (`NIGHTS`), `newFlock(night)`; night 0 = classic night. Proof: balance
   numbers unchanged (v7: 150 seeds, lure80 81%, smart90 88% at 60 s).
2. Instrumentation + Chapter 1 nights + dawn card + story shell +
   save/load use. New `howToPlay`/`goal`, `score` (own number, bump
   `epoch`), keyboard line, accessibility (dawn card focus, live-region
   text, reduced motion), achievements, notes file.
- Balance harness: run mode in `balance-murmuration.mjs` (a bot plays a
  whole migration, prints flock at each dawn and the same stat keys the
  game sends); `--night N`. Run `gestures-murmuration.mjs` on night 1's
  config (phone steering with half spook).

## Telemetry plan (per night = one `arcade:result`)

Fields the pipeline already carries: `level` (night), `run`, `attempt`,
`reason`, `stats` (<= 16 numbers, keys <= 16 chars), extra fields.

- `stats` (the ten most useful; bots send the same): `gates`, `birds`
  (left), `startles`, `lure_s`, `spook_s`, `lost_edge`, `lost_panic`,
  `light_left`, `fear_peak`, `cohesion` (mean nearest-neighbour distance).
- `extra`: `nv` (the night's content revision, so retuning one night does
  not reset the others), `night_id`, `gate_t` (seconds per gate, array),
  `gate_n` (birds counted per gate), `tap_pos` (counts: behind, side,
  front of the flock), `idle_s`, `first_input_s`, `input` (touch or keys),
  `hints` (ids shown and acted on), `variant` (A/B, e.g. night 1 spook),
  `flock_start`, `recruits`.
- Derived without new rows: where players stop (session rows), funnel by
  night, first-try win rate per night, bot-vs-human gap per night.
- Counts and seconds only; never text a player typed.
- Limit: 3-7 players per version, so read the funnel first; A/B is a
  hypothesis check with playtesters, not a significance test.

## Open questions

- Is half spook on night 1 teaching, or does it make night 2 feel worse?
- Do wind, edges and fear stack on a phone, or overload? (chapter 2)
- Retry-the-night versus flock-as-health: the second has more stakes, the
  first is gentler.
- Does a rear tap on the edge night lose a sensible number of birds?
  (Measure with the `rear100` bot: aim ~3-10 per night.)
- Classroom mode and saves; whether story progress joins the Records view.
