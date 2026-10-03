# Lighthouse Keeper: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/lighthouse-keeper.md`. Add new entries at the top of the
relevant section; sessions don't read this file by default.

## History

- v1 (2026-10-03): first version, from the brief below.

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
