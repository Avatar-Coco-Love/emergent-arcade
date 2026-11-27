# Ripple Tank: design notes

**v1** (2026-11-27, new game) · playtest: [private Artifact](https://claude.ai/artifact/96UkjYJ9V3f7Cca9HF73NY) ·
balance: `node scripts/balance-ripple-tank.mjs 200` (~2 min; `50 skilled,novice` for a quick look)
Verbs: **place** (drag, or {tap} a pad) and **retime** ({tap} a dipper), sharing
**the interference pattern** (one wave height per point, the sum of every
dipper's ripples) and the ripple budget. Lanterns need calm (swell ≤ 3), bells
a crest (≥ 13), all at once. 8 campaign ponds (a lost one is retried from its
start), then endless ponds until one runs out of ripples. Score: ponds solved
in the run. Daily from 2026-12-01 (endless from pond 1, date seed). Topics:
`waves` (new tag), `planning`. Pre-build design changes: history file.

## How it works

- Field (`// § sim`): A(p) = Σ g(r)·shade·e^{i(k·r + φ)}, g(r) = √(R0 / max(r, R0)),
  k = 2π/λ, φ = timing × 45°. Swell = round(|A|×10). The water shows
  Re(A·e^{-iωt}) (reduced motion: |A| as lightness, still); marks on a 26×26
  grid: a flat dash where swell ≤ 3, a + where ≥ 13 (shape, not colour).
- Rocks: a dipper's ripple is 0 where the straight line to the point crosses
  a rock, with a 0.03 soft edge (no reflection).
- Dippers stand only on **lily pads** (n + 8 per pond, ≥ 0.12 apart). A
  drop (place from the hand, or move to a new pad) costs 1 ripple; a drag
  shows the field live and costs nothing until it lands on a new pad
  (dropped off a pad = put back). Retime: +1/8 per {tap} (Shift+T −1/8);
  the first step costs 1, more steps on the same dipper right after are free.
  At 0 ripples after a retime the pond stays open only if some timing of
  that dipper solves it (`freeFix`).
- Generator (`makePond`): plants n dippers (lattice, ≥ 0.22 apart), puts
  bells where the plant gives swell ≥ 15 and lanterns ≤ 1 (≥ 0.13 from the
  plant, ≥ 0.16 apart), scatters the start (`right` dippers on their planted
  pad, `given` elsewhere, the rest in the hand), adds pads, then **par = the
  exact optimum** from `solve()` (every pad choice × relative timing;
  ~10 ms). Rejects ponds below `minWays` solving layouts (halved every 150
  tries); pond 2 must need a retime (`offTime`: unsolvable at par without).
- Arrival: ripples = carried + par + extra, capped at 12. Campaign ponds
  have fixed seeds (same for everyone); endless ponds come from the run seed.

## Key constants

| Const | Value | Note |
|---|---|---|
| G | 20 | lattice the pads sit on (0.05 steps of the 1×1 pond) |
| R0 | 0.15 | full height out to here, then 1/√r |
| PHASES | 8 | timing steps |
| CALM / CREST | 3 / 13 | swell lines; plant margins 1 / 15 |
| PADS | 8 | pads beyond n |
| TARGET_GAP | 0.08 | no pad this close to a light |
| BANK_CAP | 12 | ripples carried at most |
| λ | 0.3, 0.26, 0.22, 0.19 | endless: shorter ones from pond 6 on |
| SKIP_BANK | 8 | "Start at pond 9" (best ≥ 8): credits 8 ponds, 8 ripples |

Campaign (n dippers, lights, par, extra): 1 First bell (2, 1 bell, 1, +4) ·
2 Still water (2, 1 lantern, 2, +4: needs a retime) · 3 Two lanterns (2, 3,
2, +3) · 4 Short waves (λ 0.22, both dippers misplaced, 3, 3, +3) · 5 The
rock (2, 3, 2, +3) · 6 Third dipper (3, 3, 2, +3) · 7 Shoal (2 rocks, 3, 3,
2, +3) · 8 Full pond (3, 4, 3, +3). Endless k: n = 2 on ponds 1-3 then 3 on
2 of every 3; lights 3 + k/5 (max 4 with 2 dippers, 6 with 3); rocks 0-2
from pond 3; extra 2 (ponds 1-4), 1 (5-16), then 0; minWays 16 − k (3
dippers) or 8 − k/2 (2), at least 4 / 2.

## Layout

HUD (pond, ripples, solved, best) · square pond (fills the space) · message
strip (hint, result) · status line (lights x/y, par, in hand, "retiming is
free") · Next / Try again / New run, and "Start at pond 9" on pond 1 when the
gallery's best is 8+. Each light has a gauge under it (above near the bottom
edge): a bar for its swell out of 20, a white line at its threshold, the
side that counts shaded. Lit lantern: pale fill + rays; ringing bell: pale
fill + arcs; unlit: dark fill, light outline.

## Balance (v1, 200 runs; seconds: drop 9-10, retime 2.5 + 1.5 a step, 5 per pond)

| bot | C1-8 first try % | campaign retries | ponds (p10, p90) | minutes |
|---|---|---|---|---|
| skilled (2-ply) | 100 ×8 | 0 | 19 (13, 25) | 10.7 (p90 14.6) |
| greedy (1-ply) | 100/100/100/0/0/0/0/0 | gives up | 3 | — |
| novice | 99/91/92/50/67/89/45/4 | 8 | 7 (7, 9) | 18.9 to its stop |
| noTune | 100/0/… | gives up | 1 | — |
| tuneOnly | 100/100/100/0/… | gives up | 3 | — |
| bellHabit | 100/100/0/… | gives up | 2 | — |

Planted check: 208/208 ponds solved at par by the solver's plan; solving
layouts median 14 (p10 6). Bots give up a campaign pond after 6 retries
(players retry without limit). Pond 1: 14-15 s. Both verbs are required
(noTune, tuneOnly). Achievements: skilled reaches all five (deep-water
46%); novice: still-water 100%, clean-ripples 95%, trio 99%,
pond-keeper 28%. Not met: novice first try on pond 8 is 4% (it moves a
random dipper each turn); the human answer is retries, watch `attempt` on
pond 8.

## Telemetry fields

One `arcade:result` per pond: `level` = pond in the run, `level_id`
`pond-N` (campaign) or `endless`, `attempt`, `score` = ponds solved,
`reason: ripples` on a loss, `daily` on daily runs, `arcade:final` when a
daily run ends. `stats`: pond, dippers, lights, par, moves (ripples spent),
places, drags, tunes (ripples spent retiming), taps (retime steps), bank,
rocks, wave (λ×100), ways, endless (endless pond number, 0 in the campaign).

## Accessibility (v1, `node scripts/a11y-audit.mjs ripple-tank`)

Audit: motion pass (reads the setting; shimmer and bob still, 32.5% → 0.0%),
contrast 8.5:1, colour pass (states by shape + lightness: dash/plus marks,
lit vs dark lights, gauge line), text 12 px, label pass, keyboard pass.
Keys: arrows pick a pad (least-turn pick), Enter puts in / lifts / drops
(while lifted, arrows walk free pads and the live region reads the lights
line for each: free exploration, like a drag), T / Shift+T retime, 1-3 jump
to a dipper, L reads each light, I status, N next. Keys-only check (scratch
script reading only the live region): solved pond 1 by lifting and walking
pads until "Every light is right".

## Open ideas / known limits

- Novice pond 8 (4 lights, 3 dippers) is the wall: watch attempts there.
- Daily starts at endless pond 1 with no tutorial (as other Daily games).
- Hint to read the gauges if players drop without dragging (`drags` 0,
  `places` only).
- Reflections off the pond edge or rocks, a moving dipper, two frequencies.

Older material: `docs/history/ripple-tank.md`.
