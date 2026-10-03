# Lighthouse Keeper: design notes

**v2** (2026-10-03) · playtest: https://claude.ai/artifact/KcKMZ1aX9ZqmRBDhqpCQmT ·
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
  so the patch stays clear ~4–6 s (the beam's ~2 s). It pays only if fired
  when the ships are ~5 s from their reefs: earlier, the patch fades before
  they see the rock (findings: *A burst verb fired too early looks useless*).
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

- Nights last ~62 s (v1 ~1.7 min). Skilled median run 11.4 min.
- Action rate: skilled at 0.5 / 1 / 2 s per action scores 57 / 59 / 52
  (noflare 51 / 48 / 52): no speed test, but at 2 s flares stop paying.
- Achievements (skilled / novice): starburst 26/0, storm-keeper 56/0,
  clear-passage 96/18, thrifty-keeper 100/20, last-drop 20/90.
- The skilled bot flares only when 2+ fogged ships outside the beam are
  <5 s from rock, sized to cover them (8 s was too early).

## Telemetry

One `arcade:result` per night: `level` (night), `run`, `attempt`, `score`
(ships home over the run), `reason` on a loss (`wrecks`, or `oil` if the
lamp was dry 5+ s), and `stats`:

| key | meaning | key | meaning |
|---|---|---|---|
| `home` / `ships` | ships home / ships that night | `wrecks` | wrecks |
| `oil` | oil at the end | `dark_s` / `shut_s` | s dark (shut or dry) / s shuttered |
| `flares` / `flare_oil` | flares fired / oil spent on them | `lit_s` / `blind_s` | ship-seconds seeing / blind |
| `first_input` | s to the first action (-1 none) | | |

`shut_s` near 0 with `dark_s` high means the player never found the
shutter and ran dry (the noshutter pattern); `flare_oil` vs `flares` shows
flare size.

## Player data

None yet.

## Open ideas / known limits

- **Flare is still short of its target:** never-flare scores ~89% of
  skilled at 0.5 s per action (target 80%), 76% at 1 s, tied at 2 s.
  It pays only on convoy nights, and only fired ~5 s before the reefs;
  most nights skilled fires none. Tried and not enough: tighter/wider
  convoys, a slower lamp, slower ship turns, longer patches, more oil
  pressure. Next lever: blind ships that drift off course over time, so
  one look no longer fixes a ship for good.
- The lit-once rule is why the beam can serve a crowd: a ship that saw holds
  its course blind (findings: *A spotlight serves a crowd one by one*).
  Stronger flare levers if needed: blind ships that drift off course over
  time, or convoys on more nights.
- The skilled bot does better at 1 s per action than at 0.5 s (it switches
  targets too eagerly); not a speed test, but the bot is not optimal.
- Novice wall now at night 6 (Thick night, threes in fast fog). The
  thirstier lamp (1.4/s) costs the novice ~15 pts at nights 3–5 but makes
  the shutter matter (noshutter 89% → 77% of skilled).
- Not hand-played on a phone yet.
- Ideas: a lit ship signals back (morse) to say where it is; a tide that
  covers and uncovers reefs; a second lighthouse to hand ships over to.

History (brief, departures from it): `docs/history/lighthouse-keeper.md`
