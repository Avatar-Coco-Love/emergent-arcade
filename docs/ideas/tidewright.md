# Tidewright: design brief for implementation

Status: idea, approved by the maintainer, not built. `id`: `tidewright`
(permanent feedback key). Fills the untried `flick` + `tap` pair
(`node scripts/mechanic-map.mjs`). Read first: `docs/PROJECT_BRIEF.md`,
`docs/findings.md` (every rule applies), `docs/adding-a-game.md`,
`docs/scores.md`; copy the closest bot harness (`scripts/balance-loom.mjs`
or `balance-terrace-garden.mjs`) for `scripts/balance-tidewright.mjs`.

## Pitch

Build a seawall before the tide comes in, and keep the village behind it dry
through wave after wave. Flick sand to raise the wall; tap sluice gates to let
trapped water out. Score = waves survived, endless.

## Layout (single scene, primitives only)

Side view. Sea on the left, a sloping beach, a sand-castle village on the
right. The beach is a row of ~30-40 sand columns with a height `H[i]`. Behind
the wall, water pools: `W[i]`. A few (3-5) sluice-gate slots sit at fixed
columns. A sand pile at the bottom is the flick ammo.

## Verbs (orthogonal) and shared state

- **Flick** (`flick`): fling a sand pellet from the pile; it lands on a column
  and adds height (neighbours get a little too, so it builds a mound).
  Keyboard: aim with arrows/A-D, hold+release Space for power, or map to a
  drag-aim if the gallery's flick already does (check `hourglass-delivery`).
- **Tap** (`tap`): toggle a sluice gate open/closed.
- **Shared state**, both read and write it:
  - `H` (wall height): flick writes it; gates read it (a gate only holds
    water up to its column's height); waves read it.
  - `W` (water pooled behind the wall): waves that overtop the wall write
    it; gates drain it; flick reads it (sand thrown into standing water
    washes out to a fraction of its height, onto dry columns it packs
    fully), and seepage from `W` erodes `H` each second.
- The decision: sealing gates keeps the waves out but traps water that
  undermines the wall; opening a gate drains it, but the gate column is the
  weak point and the next wave pours through. The player must read `W` to
  choose when to drain and where to flick. Check (findings rule 2): a
  bot that only flicks at the lowest column and ignores gates must lose by
  a mid wave number; a bot that only taps gates must lose early.

## Loop and depth (target: 10+ minutes for someone who likes it)

- A wave rises on a visible timer (show the next crest height as a marker on
  the wall, findings: show the threshold where the player acts). Between
  waves: calm, the player rebuilds and drains.
- Decay (findings rule 1): the wall slumps slightly each cycle and ammo
  refills slowly, so nothing plays itself.
- Waves escalate by rules, not just size (findings: break the general
  trick): a double wave, a rogue wave aimed at one column, rain that adds
  `W` everywhere, a spring tide where gates must stay shut, a storm that
  shifts which columns are weak. Early waves are gentle so the first minute
  is a hook (novice bot, first round under ~40 s of learning).
- Lose: the village is flooded (water reaches it past a threshold).
  Retry starts over at wave 1 or at the last calm; decide in the notes file.

## Manifest

Two mechanics: `flick` and `tap` (write `{flick}`/`{tap}`, `{finger}` etc.,
plus a `keyboard` line), `goal`, `howToPlay`, 3+ achievements (for
example: survive wave 5, drain 50 water in one wave, hold a wave with no gate
opened). `score`: `{ "label": "Waves survived", "better": "higher",
"format": "count", "wins": false, "max": 500, "epoch": 1 }`, posting a
`score` in `arcade:result` when the village floods. Also handle
`arcade:pause` / `arcade:resume` and fill the window with no scrolling.

## Balance and playtest

Bots (one line each): `novice` (first obvious guesses, 2-3 wrong taps),
`habit` (flick the lowest column, never touch gates), `gates` (taps only),
`skilled` (reads `W`). Sweep reaction lag separately from think time.
Targets for the notes file: skilled bot reaches wave 15+, novice reaches 4-6,
median first-wave win for the novice, habit bot dies before wave 10.

## Risks

- Flick on mouse and keyboard must reach every verb (findings).
- Do not let it read as a tower-defence reskin: the point is that both verbs
  touch the same water and sand values.
- Keep the file under ~40 KB (the largest games are 30-40 KB).
