# Findings: Accessibility

Part of the findings checklist; index, evidence tags and how to add one in
[../findings.md](../findings.md). The full story behind each rule is in
[../findings-log.md](../findings-log.md) under the heading in *italics*
(grep it, don't read the whole log).

Short form: the measured numbers and the full story are in the log entry
named in *italics*.

- Make only the title a link, stretched over the card with `::after`;
  never wrap a whole card in `<a>`. High-contrast browser modes paint all
  link text (yellow, visited green). *A card-sized link turns the whole
  card into link colour.* Gallery. player screenshot (n=1).
- A game that opens on a still card reads **pass** on the motion audit
  even if play moves: record the in-play verdict by hand. *An opening
  card hides play motion from the audit.* Murmuration v8. audit.
- Anti-aliased card text can "merge" with the sky in the colour audit:
  shorten or lay out the text before changing colours. *Card text edges
  tripped the colour audit.* Murmuration v9. audit.
- Read the keyboard line verb by verb: every verb needs a key path; Tab
  stays the browser's. *A keyboard line can hide that no verb has a key.*
  audit.
- Reduced motion: keep the simulation, stop the decoration. *Most games
  ignore reduced motion; idle turn-based games pass for free.* audit.
- Size canvas text from the CSS width (12 px+) and give labels a backing.
  *Canvas text shrinks with the board.* audit.
- State told by hue alone merges for colour-blind players: add lightness
  or shape. *Colour ramps that carry state merge for colour-blind
  players.* audit.
- Give each state its own lightness band, and keep glows and smoke from
  carrying one into another's. *Effects carry a state into another's
  lightness band.* Wildfire Line. audit.
- Point and path verbs by keys: arrow cursor, a toggle key for the path
  verb, Enter for the point verb, calling the pointer's functions. *A
  cursor gives point and path verbs a key path.* Wildfire Line. audit +
  bots.
- Never pick with Tab; Space picks, but lets Space through to a focused
  button. *A picker key must leave Tab and focused buttons alone.* Rail
  Yard v3. audit.
- Grep for `prefers-reduced-motion` before trusting a motion pass;
  freeze decoration with its own clock. *A motion pass can mean small, not
  still.* Tidewright v3. audit.
- Under protanopia a hue fix moves the merge: pick lightness against
  every neighbour, use shape where you can. *A hue fix moves the merge to
  the next neighbour.* Tidewright v3. audit.
- A smooth ramp under numbers crosses a zone no ink reaches 4.5:1 in:
  jump at a rule threshold. *A lightness ramp under text needs a jump,
  not a slope.* Pressure Grid v11. audit.
- Turn-based live region: one line per move, written from the move's
  result; paint once per frame. *A turn-based game's live region comes
  from its move result.* Pressure Grid v11. audit + keys.
- Colour-blind eyes see saturated small fills as text grey: use
  near-greys or blue-bearing colours, audit late screens. *A saturated
  colour turns into text grey for colour-blind eyes.* Island Census v3.
  audit.
- Buttons with text use the site accent, not the daily game's. *A daily
  game's accent made the gallery audit fail by date.* Topic zip PR. audit.
- Arrow picking over a fixed set needs a least-turn matching, not
  nearest-in-direction. *Picking by arrow direction needs a matching, not
  a nearest.* Island Census v3. reachability script.
- Hide the moving pieces before chasing the motion cell; if the sim is
  the motion, partial is the end state. *When the simulation is the
  motion, a motion partial is the end state.* Murmuration v6. audit.
- A held key verb that punishes closeness needs a cursor that starts
  clear and speeds up while held. *A held key verb needs a cursor that can
  get ahead.* Murmuration v6. keys-only bot.
- Audit a fast-forwarded late screen too, and give mid-tone UI fills a
  near-grey. *Late screens grow their own greys.* Geode v3. audit.
- Keep arrow bindings players know; one switch key moves the arrows
  between slider and cursor. *A switch key keeps an arrow binding players
  know.* Geode v3. keys.
- A path verb between places gets jump keys to its ends; hide the shared
  state too when measuring motion. *Jump keys give a path verb its ends.*
  Ant Trails v7. keys.
- Measure motion past the game's first mover, not just the audit's 3–6 s
  window. *An early audit screen can miss the game's own motion.*
  Hourglass Delivery v5. audit.
- "Balance identical" needs a baseline: run the old file twice first.
  *Run the old file twice before comparing balance.* Hourglass Delivery
  v5. bots.
- Put the aim preview in words (what it reaches), never where the shot
  lands. *Say what the preview shows, not where the shot lands.* Orbit
  Garden v8. keys.
- Put a ramp's lightness step exactly on the rule's threshold and check
  bands by number. *A band's step belongs on the rule's line, not near
  it.* Hot Iron v6. L* by number.
- Picking among moving pieces: the opposite arrow walks back a trail, a
  jump key reaches plan starts. *A picker over moving pieces needs a way
  back.* Loom v4. keys-only bot.
- A warning ramp must not end at the resting state's lightness. *A
  warning ramp can end where the resting state sits.* Loom v4. L* by
  number.
- Speak a move once its danger check is back, warning included. *A move's
  line waits for its warning.* Surprise Party v4. keys-only bot.
- Real time: speak settled changes, word numbers from the state, give an
  aimed target's place. *A real-time live region speaks settled changes.*
  Terrace Garden v4. keys-only bot.
- Audit one scripted screen per level kind, at its start and late. *A
  warm-up hides the labels later levels add.* Terrace Garden v4. audit.
- Script held and rare states (charging, out of oil) for the audit. *A
  held verb's preview hides from the audit.* Lighthouse Keeper v4. audit.
- Spoken bearings need the beam's resolution; speak danger, not state.
  *A bearing in words needs the beam's resolution.* Lighthouse Keeper v4.
  keys-only bot.
- Name what stands in the way, not just the goal's direction; report once
  the pieces that matter stop. *A goal's direction needs what stands in
  the way.* Bubble Glass v7. keys-only bot.
- In a memory game, speak only what the screen shows now. *A memory
  game's live region must not hold the memory.* Coat Check v4. keys-only
  bot.
- Let the point key on an open target grow from the nearest piece. *A
  path verb's start can come from its end.* Mycelium v4. keys-only bot.
- Speak states the player holds, not ones the stream passes; pin `.sr`
  so it adds no scroll. *Speak held states, not passing ones.* Aqueduct
  v8. scripted turns.
- New dialogs and hidden states join the audit as views. *An audit only
  sees the views it opens.* Recovery code PR. audit.
