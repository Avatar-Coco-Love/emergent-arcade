# Lighthouse Keeper: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/lighthouse-keeper.md`. Add new entries at the top of the
relevant section; sessions don't read this file by default.

## History

- v2 (2026-10-03): review pass: input and placement fixes, convoys, shorter nights.
- v1 (2026-10-03): first version, from the brief below.

## v1 nights

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

## v1 balance (50 runs, retries 2; ±7 pts)

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


## v1: departures from the brief and why

- **Shutter is a tap, flare is a hold, both on the lighthouse.** The brief
  had shutter as "tap/hold: dim to save oil". A tap toggles the lamp, and a
  hold charges a flare whose size (and oil) grows with the hold, so the three
  verbs are three gestures (drag, tap, hold) and flare is a strength verb.
- **Shuttering has a real cost:** while shut, nothing burns fog and ships in
  thick fog sail blind; the never-shutter bot runs the tank dry ~13 s a night
  and loses its first night at night 4 instead of 8.
- **The fog had to come back fast, or a sweep plays itself.** With fog
  returning at 10% of the gap per second and a 1.5/s burn, a bot that swings
  the beam end to end without looking won night 8 56% of runs. A linear
  return of 0.2/s, a 0.9/s burn and a 1.0 rad/s lamp drop it to 0% (it
  loses at night 2-3): only a beam that dwells on a ship clears its fog.
- **Flares leave clear air "below zero"** (fog −0.8 at the centre), so a
  flare's patch lasts ~6 s where the beam's lasts ~2 s.
- **Blind ships always make way toward the coast** (heading at least 0.3
  rad below horizontal): a ship sailing nearly sideways could bounce between
  the walls forever and the night never ended.
- **"A lit ship draws more traffic"** was left out: nights already add
  traffic, and a reward loop on lighting would be a passive system that
  pays more than it costs (findings).

## The original brief (2026-10-03, `docs/ideas/lighthouse-keeper.md`)

Category: simulation, light and fog. Rank: **second** of the 2026-10-03
batch (build after `mycelium.md`). Status: proposed.

- **Premise:** one lighthouse, a night sea, ships that need to be lit to
  stay off the rocks.
- **Verbs (3):** *rotate* the beam (drag a dial or the lamp), *shutter*
  (tap/hold: dim the lamp to save oil), *flare* (spend a burst of oil for a
  wide, bright sweep).
- **Shared state:** oil level plus fog density. The beam burns fog away
  only where it points, and fog drifts back; lit ships are safe, but a lit
  ship also draws more traffic (and bigger ships) over time.
- **Decision:** where to point the beam versus the oil budget; flare is
  powerful but its cost must exceed what it saves, or it plays itself.
- **Progress:** nights. Each night adds fog, traffic and rock layouts;
  oil refills partly between nights (carry-over). Endless mode after the
  last scripted night; score = nights survived, then ships guided.
- **Risks:** a pure reaction/aim game (keep ships slow enough to plan);
  check a bot that never shutters or never flares (findings: a verb must
  be required); shuttering must have a real cost (ships go dark).
- **Bots:** sweep-only, hold-on-nearest, novice, skilled.
