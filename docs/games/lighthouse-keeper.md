# Lighthouse Keeper: design notes

**v1** (2026-10-03) · playtest: https://claude.ai/artifact/KcKMZ1aX9ZqmRBDhqpCQmT ·
balance: `node scripts/balance-lighthouse-keeper.mjs 50`
Verbs: **turn** (drag), **shutter** (tap the lighthouse), **flare** (hold the
lighthouse), sharing **fog per cell** and **the lamp's oil**. A run of
nights: 8 scripted, then endless; oil carries over. Score = ships home.

## How it works

- **Sea:** 400×505 over a 20×26 fog grid (20 px cells). Lamp at (230, 522),
  harbour mouth at (92, 500), r 20. Ships arrive from the top edge (and,
  some nights, the right side) aimed at the harbour.
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
  so the patch stays clear ~6 s (the beam's ~2 s).
- **Nights:** lost → retry from its start (+`RETRY_OIL` per retry) or new
  run. Won → +`DAWN_OIL`, next night.

| # | Night | Fog | Ships / every s | Reefs | Twist |
|---|---|---|---|---|---|
| 1 | Calm night | 0.45 | 5 / 10 | 2 | |
| 2 | Sea mist | 0.6 | 6 / 9 | 3 | |
| 3 | Fog bank | 0.55 | 7 / 9 | 3 | 2 drifting banks (+0.45) |
| 4 | Two lanes | 0.6 | 8 / 8 | 4 | 45% from the right |
| 5 | Heavy cargo | 0.6 | 8 / 9 | 4 | 35% heavy ships |
| 6 | Thick night | 0.75 | 8 / 9 | 4 | fog returns 1.5× |
| 7 | Convoy | 0.65 | 9 / 13 | 4 | groups of 3, 30% right |
| 8 | Storm | 0.7 | 10 / 8 | 5 | banks, right lane, heavy |
| 9+ | Night n | 0.68+0.02e | 10+e / 8−0.25e | 5+e/2 | banks, right, heavy, return +6%/night |

## Key constants (`games/lighthouse-keeper.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| HALF / RANGE | 0.15 rad / 470 | BURN / REGROW | 0.9 / 0.2 per s |
| SEE / TURN | 0.35 / 1.0 rad/s | LAMP / DOCK_OIL | 1.0/s / 6 |
| OIL0 / OIL_MAX | 70 / 120 | DAWN_OIL / RETRY_OIL | 35 / 15 |
| FLARE_MIN / MAX / S | 10 / 34 oil / 1.2 s | FLARE_R0 / R1 / CLEAR | 70 / 230 / 0.8 |
| SPEED / BIG_SPEED | 13 / 9 px/s | STEER / BIG_STEER / LOOK | 0.7 / 0.35 rad/s / 85 |
| WANDER / WRECK_MAX | 0.25 / 2 | HOLD_MS / LAMP_R | 260 ms / 34 |

## Layout (400×560)

Message strip above the sea, HUD below (night, home x/ships, wrecks x/3,
oil meter and value, score with best from `arcade:best`). Fog is a 20×26
image scaled up smoothly; reef surf and mast lights draw above it.

## Balance (v1, 50 runs, retries 2; ±7 pts)

| Bot | Nights 1–8 won % | Median nights | Run (1st loss) | Score | Per night |
|---|---|---|---|---|---|
| idle | 32/6/0… | 0 | 3.8 min | 1 | 3 wrecks |
| sweep | 100/82/62/24/4/0/0/0 | 3 | 9.7 (2.7) min | 16 | 3 wrecks |
| nearest | 98/90/70/28/8/0/0/0 | 3 | 8.9 (3.3) min | 15 | 6 s dry |
| skilled | 100/100/100/96/96/96/96/78 | 9 | 20.6 (14.1) min | 72 | 51 s shut, 1 flare |
| noshutter | 100/100/98/80/62/58/56/44 | 7 | 20.4 (5.4) min | 49 | 13 s dry |
| noflare | 100/100/100/92/86/86/82/70 | 9 | 21.3 (13.7) min | 70 | |
| flarespam | 100/100/100/88/88/86/72/46 | 7 | 19.3 (9.0) min | 53 | oil 19 at dawn |
| novice | 100/100/88/42/10/2/2/0 | 3 | 9.8 (4.2) min | 19 | 23 s dark, 10 s dry |
| novice, 4 retries | 100/100/100/83/50/27/23/7 | 5 | 17.9 min | 28 | night 8 by 33 min |

- Skilled endless median ends at night 9–10 (~20 min, nights ~1.7 min).
- Action rate: skilled at 0.5 / 1 / 2 s per discrete action scores 72 / 66
  / 72: no speed test.
- Achievements (skilled / novice): safe-harbour 100/100, clear-passage
  100/28, starburst 98/0, thrifty-keeper 100/2, last-drop 42/98,
  storm-keeper 78/0.

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

- Flare is a margin verb: never-flare scores 97% of skilled, but spamming
  flares costs a quarter of the score, so it does need reading. If players
  never flare, make convoys tighter in time and wider in angle.
- Starburst (4 ships in one flare) is easy for skilled play (98%).
- Novice bot walls at nights 4–5 (two lanes, heavy ships) and runs the lamp
  dry ~10 s a night; watch `shut_s` and `attempt` per night.
- Not hand-played on a phone yet; screenshots at 390×760, 800×400, 1200×800.
- Ideas: a lit ship signals back (morse) to say where it is; a tide that
  covers and uncovers reefs; a second lighthouse to hand ships over to.

History (brief, departures from it): `docs/history/lighthouse-keeper.md`
