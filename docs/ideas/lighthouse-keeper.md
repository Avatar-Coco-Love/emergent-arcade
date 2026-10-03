# Lighthouse Keeper (idea, not built)

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
