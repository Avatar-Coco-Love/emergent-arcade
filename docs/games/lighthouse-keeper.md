# Lighthouse Keeper: design notes

**v4** (2026-10-05, accessibility; v2 2026-10-03 gameplay) · playtest: https://claude.ai/artifact/KcKMZ1aX9ZqmRBDhqpCQmT ·
balance: `node scripts/balance-lighthouse-keeper.mjs 50`
Verbs: **turn** (drag), **shutter** (tap the lighthouse), **flare** (hold the
lighthouse), sharing **fog per cell** and **the lamp's oil**. A run of
nights: 8 scripted, then endless; oil carries over. Score = ships home.

## How it works

- **Sea:** 400×505 over a 20×26 fog grid (20 px cells). Lamp at (230, 522),
  harbour mouth at (92, 500), r 20. Ships arrive from the top edge (and,
  some nights, the right side) aimed at the harbour. A **convoy** arrives
  together (`CONVOY_GAP` apart), one ship per slot across the width, and
  each of its ships has a reef the same way (`REEF_U` + 0–0.15) along its
  course, so they all need light at the same moment.
- **Fog:** each cell moves toward the night's density (+ drifting fog banks)
  by `REGROW`/s. The open beam (half-width `HALF`, reach `RANGE`) burns
  `BURN`/s near the lamp, 30% of that at full reach, down to 0.
- **Ships:** a ship sees if the fog in its cell is under `SEE` or it is in
  the beam (green mast light). Seeing, it steers for the harbour around
  reefs within `LOOK` px (heavy ships turn at half rate). Blind (flashing
  red), it holds the course it had when the fog closed in, wobbling, and
  always keeps some way toward the coast. Reef or shore = wreck; the
  harbour = home (+`DOCK_OIL`). A third wreck loses the night.
- **Turn:** drag anywhere on the sea: the lamp turns toward the pointer at
  `TURN` rad/s (a tick shows where it is heading).
- **Shutter:** tap the lighthouse: lamp shut (no oil, no light) or open.
  The open lamp burns `LAMP`/s; at 0 oil it is dark until a ship docks.
- **Flare:** hold the lighthouse ≥ `HOLD_MS`, release to fire: charge c
  over `FLARE_S` sets radius `FLARE_R0`→`FLARE_R1` and cost
  `FLARE_MIN`→`FLARE_MAX` oil (the preview ring shows both). Centre 0.9 ×
  radius out along the beam. Fog in it drops to −`FLARE_CLEAR`·(1 − d/2r),
  so the patch stays clear ~4–6 s (the beam's ~2 s); it pays fired ~5 s
  before the reefs.
- **Nights:** lost → retry from its start (+`RETRY_OIL` per retry) or new
  run. Won → +`DAWN_OIL`, next night.

| # | Night | Fog | Ships / every s | Reefs | Twist |
|---|---|---|---|---|---|
| 1 | Calm night | 0.45 | 5 / 6 | 2 | |
| 2 | Sea mist | 0.6 | 6 / 5.4 | 3 | |
| 3 | Fog bank | 0.5 | 6 / 8.4 | 3 | 2 drifting banks (+0.45), pairs |
| 4 | Two lanes | 0.55 | 6 / 10.8 | 3 | 35% from the right, pairs |
| 5 | Heavy cargo | 0.5 | 6 / 10.8 | 3 | 30% heavy ships, pairs |
| 6 | Thick night | 0.75 | 9 / 10.8 | 4 | fog returns 1.5×, threes |
| 7 | Convoy | 0.65 | 12 / 13.2 | 5 | fours, 30% right |
| 8 | Storm | 0.7 | 10 / 9.6 | 5 | banks, right lane, heavy, threes |
| 9+ | Night n | 0.68+0.02e | 10+e / max(3.3, 4.8−0.15e)·g·0.75 | 5+e/2 | convoys of g = 3/4 alternating, banks, right, heavy, return +6%/night |

"every" is the gap between arrivals (a convoy is one arrival), ×0.8–1.2.

## Accessibility (v4; audit: 5 pass, motion partial, 3/3 runs)

- Keys (`// § keys`, outside the sim): hold ← → turn; N aims at the next
  ship in the dark (`setAim`; most urgent first, again within 4 s = the
  next); S shutter; hold Space flare; I status; Enter next night. Tab
  free; Space/Enter on a focused button press it.
- Live region `#say` (`#msg` aria-hidden): `seaWatch()` reads state after
  each frame, never in `step()`. Bearings in quarter-hour clock times
  from the lamp (whole hours put every top arrival at 11 or 12) + near /
  halfway / far / out of reach. Says arrivals (a convoy = one line), a
  ship blind with rocks or shore ahead in n s and seeing again (held
  0.7 s, ≤ 1 per ship per 2 s; plain blindness is silent: lit-once ships
  hold a safe course), wrecks, home, lamp shut/open/dry, oil < 40/20/10/5,
  flares (oil, ships reached), the beam once it arrives (ships lit,
  nearest in the dark, which way), the result.
- Without hue (L*, normal/deutan/protan alike): mast seeing 91 vs blind
  6 core in a ring; hulls 90, heavy 74 + hold, wreck 32 + cross; lamp 91
  vs 27 + "shuttered"/"no oil"/"flare"; preview 83 vs 59–67 + "too much".
- `fs(12)` labels: "harbour" (was 8.5 px), lamp state, flare cost (was
  10 px, 2.3:1 while charging). Scripted nights 4–8, 12, shut, dry,
  charging: contrast, colour, text pass.
- Reduced motion (`still()`, clock `deco`): night 7 decoration 0.5% →
  0.00%; ships + fog hidden 0.02% (HUD oil): the rest is the simulation.
- Balance identical (old ×2, new). Keys bot (`#say` only, 4 runs): won
  nights 1–4/5 first try (N, S, arrows by bearing, flares).

## Key constants (`games/lighthouse-keeper.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| HALF / RANGE | 0.15 rad / 470 | BURN / REGROW | 0.9 / 0.2 per s |
| SEE / TURN | 0.35 / 1.0 rad/s | LAMP / DOCK_OIL | 1.4/s / 6 |
| OIL0 / OIL_MAX | 70 / 120 | DAWN_OIL / RETRY_OIL | 35 / 15 |
| FLARE_MIN / MAX / S | 10 / 34 oil / 1.2 s | FLARE_R0 / R1 / CLEAR | 70 / 230 / 0.8 |
| SPEED / BIG_SPEED | 16 / 11 px/s | STEER / BIG_STEER / LOOK | 0.7 / 0.35 rad/s / 85 |
| CONVOY_GAP / REEF_U | 0.25 s / 0.35 | DRAG_PX | 10 (a drag from the lamp aims) |
| WANDER / WRECK_MAX | 0.25 / 2 | HOLD_MS / LAMP_R | 260 ms / 34 |

## Layout (400×560)

Message strip above the sea, HUD below (night, home x/ships, wrecks x/3,
oil meter and value, score with best from `arcade:best`). Fog is a 20×26
image, blurred 3×3 for display and scaled up smoothly (quality high); reef
surf and mast lights draw above it. Input: a press within `LAMP_R` of the
lamp is a tap (shutter) or a hold (flare) unless it moves `DRAG_PX` first,
then it aims; a pointer below the lamp's horizon picks a side (beam along
the coast). A Space held through a pause must be let go before it charges.

## Balance (v2)

50 runs, retries 2, `node scripts/balance-lighthouse-keeper.mjs 50` (±7 pts).
The harness starts with a self-test (retry restores the night; every ship
ends its voyage; reefs clear of arrival points).

| Bot | Nights 1–8 won % | Median nights | Run | Score | Per night |
|---|---|---|---|---|---|
| idle | 32/4/2/0… | 0 | 2.7 min | 1 | 3 wrecks |
| sweep | 98/68/56/42/32/4/0/0 | 3 | 6.3 min | 15 | 3 wrecks |
| nearest | 100/88/68/58/46/8/2/0 | 4 | 7.5 min | 20 | 3 wrecks |
| skilled | 100/100/98/98/96/78/62/56 | 8 | 11.4 min | 57 | 23 s shut, oil 80 |
| noshutter | 100/100/100/98/94/70/54/42 | 7 | 11.0 min | 44 | 4 s dry, oil 8 |
| noflare | 100/100/98/98/96/76/56/50 | 8 | 10.7 min | 51 | |
| flarespam | 100/100/92/86/68/26/6/4 | 5 | 8.2 min | 26 | oil 8 |
| novice | 100/98/80/70/58/6/0/0 | 5 | 7.6 min | 23 | 14 s dark, 6 s dry |
| novice, 4 retries | 100/98/98/96/92/34/4/4 | 5 | 11.2 min | 25 | |

- Nights ~62 s; skilled median run 11.4 min.

## Telemetry

One `arcade:result` per night: `level` (night), `run`, `attempt`, `score`
(ships home over the run), `reason` on a loss (`wrecks`, or `oil` if the
lamp was dry 5+ s), and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `home` / `ships` | ships home / ships that night | `wrecks` | wrecks |
| `oil` | oil at the end | `dark_s` / `shut_s` | s dark (shut or dry) / s shuttered |
| `flares` / `flare_oil` | flares fired / oil spent on them | `lit_s` / `blind_s` | ship-seconds seeing / blind |
| `first_input` | s to the first action (-1 none) | `jumps` | N presses (v4) |

## Player data

2026-10-05 (`fetch-telemetry --game lighthouse-keeper`): 3 players, all
touch. Night 1 won 3/3; night 2 lost 2/2 by oil (dark 9 s, shut 1 s);
no classroom reports.

## Open ideas / known limits

- Accessibility: done in v4 (above). Not tried with a real screen reader or
  a colour-blind player yet. Starburst's text says 5 ships, the code needs 6.
- **Flare short of its target**: never-flare ~89% of skilled (target
  80%); pays only on convoy nights. Details, levers and a ready prompt:
  `docs/ideas/lighthouse-keeper-v3.md`, `docs/history/lighthouse-keeper.md`.
- Not hand-played on a phone.

History (brief, departures from it): `docs/history/lighthouse-keeper.md`
