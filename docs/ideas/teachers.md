# Ideas: helping teachers use the arcade

Proposed 2026-10-04, after PR #88 (mission, licenses, `docs/teaching.md`)
and PR #89 (copyright name, license notice in downloads). Part of the
arcade's mission: help students, teachers and game developers learn from
the games, not just play them.

| # | Idea | Size | Status |
|---|---|---|---|
| 1 | Teacher page on the site | small | built (`#/teachers`) |
| 2 | Classroom mode link (`?class=1`) | small | built |
| 3 | "What's going on here" notes per game | medium | later: let teacher feedback (7) decide 3 vs 4 |
| 4 | Class challenge link (teacher-chosen seed) | medium | next (prompt at the end) |
| 5 | Download a whole subject at once | medium | built (topic zip, 55–360 KB) |
| 6 | Accessibility audit | audit, then per-game fixes | audited (`docs/accessibility.md`); gallery fixed; Wildfire Line fixed (v4), Tidewright (v3), Pressure Grid (v11), Island Census (v3), Murmuration (v6), Geode (v3), Ant Trails (v7), Hourglass Delivery (v5), Orbit Garden (v8), Hot Iron (v6), Loom (v4), Surprise Party (v4), Terrace Garden (v4), Lighthouse Keeper (v4); every canvas labelled, Rail Yard frees Tab (2026-10-05); other games open |
| 7 | "I used this in class" feedback form | small | built (kind `classroom`) |

## 1. Teacher page on the site

`docs/teaching.md` lives on GitHub, which teachers may not know and school
networks may block. Move its content into the gallery as a `#/teachers`
view (like `#/spotlight`, `#/records`), linked from the About box and the
footer. Build the games-by-subject table from `games.json` + `assets/topics.js`
at runtime so it never goes stale (the hand-written table in `teaching.md`
already lags whenever a game gets topics). Keep `docs/teaching.md` as a
short pointer to the page.

## 2. Classroom mode link

A teacher shares `…/emergent-arcade/?class=1` (or a "Copy classroom link"
button on the teacher page). For whoever opens it, until they leave it:
play stats off, leaderboard name entry hidden (everyone keeps the made-up
name), rating/feedback form hidden. Settings that do this already exist
(telemetry toggle in Settings, `assets/telemetry.js` `active()`); class
mode just switches them on. Decide whether it persists in localStorage for
that browser (likely yes, with a visible "Classroom mode, turn off" note)
and whether it survives navigation into a game (`#/play/<id>`). Must not
change behavior for anyone without the link.

## 3. "What's going on here" notes per game

For each game: the real-world idea behind it (how heat spreads in Hot
Iron, contagion in Wildfire Line) and 2–3 discussion questions. Optional
manifest field (e.g. `classroom: { idea, questions[] }`), shown in the
cabinet's ⓘ panel and on the teacher page; validate checks its shape.
Writing 20 of them is the real work; accuracy matters more than coverage,
so a game without one is fine.

## 4. Class challenge link

The Daily Challenge (`docs/daily.md`) already gives everyone the same
seeded run of one game. Let a teacher make a link with their own seed and
game (only games with `daily` in the manifest), so a class plays the same
run and compares results. Reuse the daily result card.

## 5. Download a whole subject at once

`assets/download.js` builds one standalone file per game (the cabinet's
Download calls it, `assets/cabinet.js`). A "Download all
fluid dynamics games" option (zip, or a folder of files plus a small index
page) for offline lab computers. No zip library is allowed by the rules
(no dependencies): either a tiny store-only zip writer or several files.

**Built 2026-10-06** (`assets/bundle.js`, [gallery.md](../gallery.md),
"Topic download"): a store-only zip from the gallery's topic filter and
each row of the teacher page's subject table, with the standalone copies
and an offline `index.html`. Sizes: one game 55–57 KB, 2–3 games 94–182 KB,
planning 360 KB and timing 312 KB (6 each); all 13 topics 1.99 MB.
`node scripts/test-bundle.mjs` opens every topic's zip from file:// offline.

## 6. Accessibility audit

Schools often have accessibility requirements. Audited 2026-10-05:
`node scripts/a11y-audit.mjs` (motion, contrast, colour-blind, keyboard,
canvas label, text size at 360 px), results in `docs/accessibility.md`.
The gallery, cabinet, teacher page and classroom note pass; fixed in the
same PR (accent and field-border contrast, small text, rating stars).

Per game, picked up by its next revision (same line in its notes). Canvas
labels are done for every game (2026-10-05, one batch PR): `role="img"`,
the game and its verbs, "click" on PC, the keys. "No live region" means
no status text in the DOM, so a screen reader hears nothing change.

- murmuration: done (v6, 2026-10-05): a cursor that moves while an arrow is held, hold Space to lure, Enter or X to startle, gate count 12.5 px+ on a backing, a live region (gates, losses, light left), reduced motion read (decoration frozen; the flock still flies, so motion stays partial) (`docs/games/murmuration.md`, "Accessibility").
- orbit-garden: done (v8, 2026-10-05): a cursor that moves while an arrow is held, Enter places a planet, Space switches the arrows to aiming (angle, strength) and flings, N jumps to the next planet, a live region that puts the aim preview into words (which planet it reaches, or where it ends), the hint on a backing, reduced motion read (petals still) (`docs/games/orbit-garden.md`, "Accessibility").
- wildfire-line: done (v4, 2026-10-05): ground told apart by lightness, keyboard cursor for both verbs, reduced motion, role and label. The pattern for the others (`docs/games/wildfire-line.md`, "Accessibility").
- ant-trails: done (v7, 2026-10-05): a cursor that moves while an arrow is held, hold Space lays a trail along its path, hold W washes, H/N jump to the nest or the next food, text on backings at 12.8 px, a live region, reduced motion read (legs and raindrops still; the ants still walk, so motion stays partial) (`docs/games/ant-trails.md`, "Accessibility").
- hourglass-delivery: done (v5, 2026-10-05): a cursor that moves while an arrow is held, hold Space pours at it, K or X then an arrow knocks there, G/L jump to the next glass or ledge, a live region (what the cursor is over, where a pour lands, knocks, glasses, hopper), `#msg` on a backing, order dots keep outcomes (missed = ×), reduced motion read (belt stripes and dust still; the glasses still roll, so mid-round motion stays partial) (`docs/games/hourglass-delivery.md`, "Accessibility").
- hot-iron: done (v6, 2026-10-05): a segment cursor (← →, Shift for a seam), hold Space heats at it, Enter or H strikes, O jumps to the next segment off the outline, a live region (the band in words, thickness against the outline, the flow preview, each blow, fuel steps), a mark per heat band (crack, hammer, hammer + flame) and a lightness jump at the crack line, reduced motion read (no sparks or shake) (`docs/games/hot-iron.md`, "Accessibility").
- island-census: done (v3, 2026-10-05): meadows, turf, paths and sand in their own lightness bands (plus grass tufts), counts and strikes told by shape, HUD 12.5 px+, a keyboard cursor (Enter releases, F then an arrow picks a path), a live region (`docs/games/island-census.md`, "Accessibility").
- loom: done (v4, 2026-10-05): a knot picker (each neighbour its own arrow by matching, the opposite arrow walks back, C jumps corners), Enter or P pins, hold Space and the arrows lead a pull, a live region (the knot, its strands and load in words, the nearest dot, slips by name), tension bands by lightness with a step at the warning line, crossbars and an outer ring for over-limit strands and loose pins, reduced motion read (no shake, flash or blink) (`docs/games/loom.md`, "Accessibility").
- terrace-garden: done (v4, 2026-10-05): ← → still tilt, ↑ ↓ pick a gate (spring, gates, bottom lip) shown by a ring, Enter/G or 0–4 open or shut it, S status, a live region (the picked terrace's water against each plant's band, toggles, plants growing, drowning or blooming, hints with keys, the result; never per frame), plant states by lightness and shape, the spring label 12 px on a backing, reduced motion read (no sway or splashes; the water still flows, so mid-garden motion stays partial) (`docs/games/terrace-garden.md`, "Accessibility").
- tidewright: done (v3, 2026-10-05): labels 12 px+ on backings, handles told apart by lightness and shape, a surface line on water, reduced motion read (`docs/games/tidewright.md`, "Accessibility").
- pressure-grid: done (v11, 2026-10-05): cells in two lightness bands (numbers 6.3:1+), labels on backings, a keyboard cursor (Enter pumps, S then an arrow aims a pour), a live region that says what each move did (`docs/games/pressure-grid.md`, "Accessibility").
- rail-yard: "Run 0" 11.5 px. (Tab freed in v3: Space picks a car.)
- aqueduct: no live region.
- bubble-glass: done (v7, 2026-10-05): ← → / A D still turn; T switches the arrows to a cell cursor that stays on its cell as the box turns, hold Space melts at it (the pointer's own press), Enter/X shatters (the same confirm), G glass, B bubble, H hint spot, I status; a live region that says the cell under the cursor, the angle once a turn ends, shards, shatters and where the sand falls, a stuck bubble, what is straight above each bubble and where the vent is once things settle, heat steps and the result; glass, the vent and a melting shard out of sand's lightness band (they sat inside it), bubble states by dashes; reduced motion read (sand still pours, so mid-pour motion is the game) (`docs/games/bubble-glass.md`, "Accessibility").
- mycelium: done (v4, 2026-10-06): arrows, Enter, Space kept; X is now a hold (the pointer's own, 450 ms), Enter on open soil with nothing marked grows from the nearest knot, N next patch, H spore, I status; a live region read from the state once a frame (the site under the cursor, a grow's cost and end, a pulse's path and mushroom, cuts, fading, rot, losses, mould near the network, the pool per 25, the frost, the result); fading knots ringed a lightness step below fed ones, mould as diamonds, caps out of the patch's band; labels 12 px (late "×12" was 8.5 px); reduced motion read (the network still moves, measured) (`docs/games/mycelium.md`, "Accessibility").
- lighthouse-keeper: done (v4, 2026-10-05): ← → still turn the beam, N turns it to the next ship in the dark (most urgent first), S shutter, hold Space flare, I status, Enter next night; a live region in clock bearings (quarter hours) that says arrivals, ships blind with rocks ahead, wrecks, home, oil, flares and where the beam points once it arrives; seeing vs blind ships by lightness, wrecks and heavy ships by marks, the lamp's state in words; labels 12 px (the flare's cost was 2.3:1 while charging); reduced motion read (the ships and fog still move, so motion stays partial) (`docs/games/lighthouse-keeper.md`, "Accessibility").
- counterfeit-scale: no live region for weighings.
- coat-check: done (v4, 2026-10-06): hook letters 13 px at 7:1, ticket lines 12 px+, coat colours in lightness steps (red and yellow merged in colour-blind recaps), returned coats badged, pins drawn, a live region that says only what the screen shows (a hang names the hook, a peek is dropped when the door shuts), I for the status, reduced motion read (`docs/games/coat-check.md`, "Accessibility").
- surprise-party: done (v4, 2026-10-05): a tile cursor (arrows, G/D/B jump to the next guest who hasn't heard, the next door, the birthday person), Enter whispers, hold O on a door shuts or opens it, a live region (the tile in words, each move and its tick, result and stars), guest states and the danger zone by lightness and marks, reduced motion read (no pulse or growing ripple) (`docs/games/surprise-party.md`, "Accessibility").
- geode: done (v3, 2026-10-05): T switches the arrows between thermostat and a site-to-site cursor, S/Enter seeds, hold C cleaves, I finds a foreign ion; labels 12.8 px+; reduced motion stills shimmer, pulses and motes (growth still moves, so motion stays partial); a near-grey anneal zone fixes a late-screen colour merge; a live region (`docs/games/geode.md`, "Accessibility").

## 7. "I used this in class" feedback form

A short form on the teacher page: grade/age, subject, which game(s), what
worked, what didn't, optional contact. Send it as a new `kind` (e.g.
`classroom`) to the existing backend; no Apps Script change or redeploy
(`docs/backend-api.md`, "A new kind of record"). Read back with
`node scripts/fetch-feedback.mjs` / `?tab=events&kind=classroom`; add it to
that script's output if it doesn't show up. Hidden in classroom mode
(that's for students), visible on the teacher page.

## Prompt used for ideas 1, 2 and 7 (built)

```
Build three teacher features for the Emergent Arcade gallery in one PR: a teacher page on the site, a classroom mode link, and an "I used this in class" feedback form. No game changes. Read CLAUDE.md first and follow it.

1. Read docs/ideas/teachers.md (ideas 1, 2 and 7 are this PR; 3–6 stay as ideas, don't build them), docs/teaching.md (current content to move onto the site), docs/gallery.md (gallery/cabinet design, routes, footer, support link), docs/backend-api.md ("A new kind of record") and docs/telemetry.md. Look at how #/spotlight and #/records views are built in assets/gallery.js and index.html, and use the same pattern.

2. Teacher page (#/teachers): the content of docs/teaching.md, with the games-by-subject table built at runtime from games.json and assets/topics.js (subjects first, then skills; each game links to #/play/<id>; each subject links to its #/?topic= filter). Link it from the About box (replace the GitHub teacher-guide link) and the footer. Reduce docs/teaching.md to a short pointer to the page plus anything only maintainers need.

3. Classroom mode (?class=1, plus a "Copy classroom link" button on the teacher page): stats off, leaderboard name entry hidden, rating/feedback form hidden, with a small visible "Classroom mode · turn off" note. Decide and document whether it persists per browser and that it carries into games. No change for anyone without the link.

4. Feedback form on the teacher page: grade/age, subject, game(s) used, what worked, what didn't, optional contact. Send as a new kind ("classroom") through assets/feedback.js to the existing endpoint. Do not edit feedback/apps-script/Code.gs. Make sure node scripts/fetch-feedback.mjs (or fetch-telemetry, whichever reads events) can show these. Hidden in classroom mode.

5. Tests: extend scripts/smoke-gallery.mjs (teacher page renders at phone and desktop sizes, table matches games.json topics, classroom link turns stats off and hides name entry and rating, form posts kind "classroom" to the fixture endpoint). Run node scripts/validate.mjs and node scripts/smoke-gallery.mjs. Look at the teacher page at 390px wide.

6. Update docs/gallery.md (new route, classroom mode, form), the status column in docs/ideas/teachers.md and docs/ideas/README.md. Push, open the PR (template checklist; "not applicable" for game items), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–6 using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for idea 6 (audited 2026-10-05)

Chosen 2026-10-05, after 1, 2 and 7 shipped. No classroom reports had
arrived yet (`node scripts/fetch-feedback.mjs --classroom`: 0), and idea 3
vs 4 is waiting on them on purpose. The audit needs no feedback, schools
ask about accessibility before anything else, and it is measurement, not
new features. If classroom reports have arrived by the time this is
picked up, read them first: one that asks for discussion notes or shared
runs moves 3 or 4 ahead.

```
Audit the Emergent Arcade for accessibility (docs/ideas/teachers.md, idea 6) in one PR: a repeatable audit script, its results, and fixes to the gallery and cabinet only. No game changes (each game's fixes are their own revision PR later). Read CLAUDE.md first and follow it.

1. Read docs/ideas/teachers.md (idea 6; 3–5 stay as ideas), docs/gallery.md (cabinet, teacher page, classroom mode), docs/findings.md, and run node scripts/fetch-feedback.mjs --classroom. If classroom reports mention accessibility (or ask for 3 or 4 instead), say so before starting.

2. Write scripts/a11y-audit.mjs (Playwright, like smoke-gallery.mjs; one line per game per check, no per-run logs): prefers-reduced-motion respected (animation keeps running or not when the media query is set), text and key UI contrast (WCAG AA, sampled from the canvas and the DOM), colour-blind safety (are win/lose or team colours told apart only by hue? simulate deuteranopia/protanopia on a screenshot and compare), keyboard play (can the game be started and played without a pointer), canvas aria-label present and accurate, and the game's text size at 360 px wide. Plus the same checks for the gallery, cabinet and teacher page (axe-core is not allowed: no dependencies; write the checks).

3. Save the results as docs/accessibility.md: a table, one row per game, one column per check (pass / fail / partial with a few words), the date, and how to rerun. Under 8 KB; detail goes in the script output.

4. Fix what fails in index.html and assets/ (gallery, cabinet, teacher page, classroom note) in this PR. For games, add one line per failing game to docs/ideas/teachers.md (idea 6) and to that game's docs/games/<id>.md "open ideas", so its next revision picks it up.

5. Tests: run node scripts/validate.mjs, node scripts/smoke-gallery.mjs and node scripts/a11y-audit.mjs. Add the audit to CI only if it runs under 3 minutes and passes on the gallery checks (game checks report, not fail).

6. Update docs/gallery.md (what changed), the status column in docs/ideas/teachers.md and docs/ideas/README.md, and add what the audit teaches to docs/findings.md. Push, open the PR (template checklist; "not applicable" for game items), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Wildfire Line accessibility revision (done, v4)

Chosen 2026-10-05, after the audit. Still no classroom reports (0), so 3
vs 4 keeps waiting. Wildfire Line has the worst row: a colour-blind
student can't tell burning ground from olive grass (deuteranopia, about 1
in 12 boys), there is no keyboard play, and the fire ignores reduced
motion. It is also a classroom game (contagion). The fixes it needs
(keyboard verbs, a colour-blind-safe palette, reduced motion, canvas role
and label) are the same ones most games need, so this revision is the
pattern for the others. If classroom reports have arrived, read them first.

```
Revise Wildfire Line for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: colour-blind-safe fire and fuel, keyboard play for both verbs, prefers-reduced-motion, canvas role and label. Read CLAUDE.md first and follow it.

1. Read docs/games/wildfire-line.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md, docs/adding-a-game.md ("Tap or click", keyboard line), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game wildfire-line. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Colour: burning, burnt and fuel must be told apart by lightness or pattern, not hue (check with node scripts/a11y-audit.mjs wildfire-line: colour must pass). Keep the meadow readable for everyone; screenshot before and after at 360×740.

3. Keyboard: both verbs without a pointer (a cursor moved with the arrows; cut a firebreak along the cursor's path, light a backburn at it), plus a keyboard line in the manifest; Tab must stay free so keyboard users can leave the cabinet frame. Add it to KEY_COVER in the audit script.

4. Reduced motion: with prefers-reduced-motion, no decorative flicker or drifting smoke; the fire's spread (the game) stays. Canvas gets role="img" and a label that says "click" on PC (pointer: fine) and names both verbs.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs wildfire-line, node scripts/balance-wildfire-line.mjs (balance must not move: same constants), node scripts/a11y-audit.mjs wildfire-line (motion, colour, keyboard, label pass). Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/wildfire-line.md (what changed, open ideas), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md. Push, open the PR (template checklist), publish the playtest artifact, watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the canvas-label batch (done, 2026-10-05)

Picked by the user between Wildfire Line v4 and Tidewright: one cheap fix
every game shared (label "partial" on 18 rows, a fail on Aqueduct), plus
Rail Yard's Tab trap. Still no classroom reports (0).

```
Fix the canvas label on every game in one PR (docs/accessibility.md, the label column; docs/ideas/teachers.md, idea 6), plus Rail Yard's Tab trap. No gameplay change in any game except Rail Yard's car-picking key. Read CLAUDE.md first and follow it.

1. Read docs/accessibility.md (the label check and the paragraph under the checks), docs/games/wildfire-line.md ("Accessibility", the label pattern to copy), docs/findings.md (Accessibility section), docs/adding-a-game.md ("Tap or click", keyboard line), docs/games/rail-yard.md, and run node scripts/fetch-feedback.mjs --classroom. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting. Use a subagent for the bulk edits if the reading grows large (one line per game back).

2. Label, every game but Wildfire Line (already done): the main canvas gets role="img" and an aria-label, set at load like Wildfire Line's: the game's title, both or all verbs from its manifest in plain words, "click" with (pointer: fine) and "tap" otherwise, and its keys if it has a keyboard line. Aqueduct has no label at all; give it one. Surprise Party's label must name its verbs. Keep the static HTML attribute as a sensible fallback ("tap or click"). Games with no status text in the DOM: note it in their open-ideas line (live region), don't build one here.

3. Rail Yard: it keeps Tab and Shift+Tab, so keyboard players can't leave the cabinet frame. Move car picking to another key (pick one that doesn't clash with its existing keys), leave Tab to the browser, update its keyboard line and its KEY_COVER entry in scripts/a11y-audit.mjs, and make sure the keyboard check passes without "takes Tab".

4. Each game is a revision: bump version and updated, add a changes entry ("No gameplay change. Screen readers now get a description of the game and its controls." or similar; Rail Yard says which key changed). score.epoch stays. Same constants everywhere, so balance can't move; don't run balance scripts except node scripts/balance-rail-yard.mjs if its input code changed.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs (all games), node scripts/a11y-audit.mjs --table (label passes for every game; no other cell gets worse; keyboard passes for Rail Yard). Run the long jobs in the background with a time limit.

6. Update docs/accessibility.md (label column and the paragraph about it, from --table), each game's accessibility line in docs/games/<id>.md "Open ideas" (drop the label part, keep the rest), the game lines and status in docs/ideas/teachers.md (idea 6), docs/games/rail-yard.md (the new key), and add to docs/findings.md only if the batch teaches something new. Push, open the PR (template checklist; one line per game is too much, so summarize), publish Rail Yard as the playtest artifact (the only input change; reuse the link in its notes file if there is one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Tidewright accessibility revision (done, v3)

Chosen 2026-10-05, after Wildfire Line v4; still next after the label batch
(its canvas label is done). Still no classroom reports (0),
so 3 vs 4 keeps waiting. Tidewright now has the worst row: three fails,
one of them a label nobody can read ("flood" at 1.3:1), text at 8.5 px,
and red handles that vanish into the wall for protanopia. Its keyboard
already passes, so this is the colour, contrast and canvas-text half of
the Wildfire Line pattern. If classroom reports have arrived, read them first.

```
Revise Tidewright for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: readable canvas labels (contrast and size), colour-blind-safe sluice handles, reduced motion. Read CLAUDE.md first and follow it.

1. Read docs/games/tidewright.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "Effects carry a state into another's lightness band" and "Canvas text shrinks with the board"), docs/games/wildfire-line.md ("Accessibility", the pattern), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game tidewright. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Contrast and text: every canvas label ("flood", column and gate labels) at least 12 CSS px at 360 px wide and 4.5:1 against what is behind it (size from the CSS width; give labels a backing or strip, not bare text over sand or water). Check with node scripts/a11y-audit.mjs tidewright: contrast and text must pass.

3. Colour: sluice handles, wall, sand and water told apart by lightness or shape, not hue (protanopia: red handle ≈ brown wall). Colour must pass on several runs (the meadow-style randomness made one pass luck for Wildfire Line). Screenshot before and after at 360×740, normal and simulated protanopia.

4. Reduced motion: the audit row says pass but the notes say it ignores the setting; find out which, and with prefers-reduced-motion stop decorative motion (shimmer, foam, waves) while the tide and sand (the game) stay. The canvas label is done (2026-10-05); keep it in step if the keys change. Keep the keyboard line working and Tab free; update KEY_COVER only if the line changes.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs tidewright, node scripts/balance-tidewright.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly), node scripts/a11y-audit.mjs tidewright (all six pass). Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/tidewright.md (what changed, open ideas), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md. Push, open the PR (template checklist), publish the playtest artifact, watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Pressure Grid accessibility revision (done, v11)

Chosen 2026-10-05, after Tidewright v3. Still no classroom reports (0),
so 3 vs 4 keeps waiting on what teachers ask for. Pressure Grid now has
the most serious row left: its cell numbers (the whole puzzle state) are
2.0:1 on brown, neither verb has a key (only undo/restart/next), and
nothing in the DOM changes, so a screen reader hears no move. Turn-based,
so motion already passes; this is the Wildfire Line keyboard pattern
plus Tidewright's contrast half, plus a live region.

```
Revise Pressure Grid for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: readable cell numbers, both verbs on keys, a live region. Read CLAUDE.md first and follow it.

1. Read docs/games/pressure-grid.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A hue fix moves the merge to the next neighbour" and "Canvas text shrinks with the board"), docs/games/wildfire-line.md and docs/games/tidewright.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game pressure-grid. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Contrast and text: cell numbers and every other canvas label 4.5:1 against the cell behind them at every pressure (check the darkest and lightest cell colours, and near-burst cells), at least 12 CSS px at 360 px wide (size from the CSS width). Check with node scripts/a11y-audit.mjs pressure-grid: contrast and text must pass. Screenshot before and after at 360×740, normal and simulated protanopia; colour must still pass on several runs.

3. Keyboard: both verbs without a pointer: an arrow-key cursor over the cells, a key that pumps the cell under it, and a key path for siphon (e.g. a key that starts a siphon, then an arrow picks the neighbour; no chords). Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. Update the keyboard line in the manifest, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

4. Live region: a DOM status line (role="status") that says what a move did (pumped to N, siphoned N into a neighbour, a burst chain and how many rings are left, level solved), short and not on every frame.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs pressure-grid, node scripts/balance-pressure-grid.mjs and node scripts/playthrough-pressure-grid.mjs (balance must not move: same constants and levels), node scripts/a11y-audit.mjs pressure-grid (all six pass). Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/pressure-grid.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/pressure-grid.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md. Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Island Census accessibility revision (done, v3)

Chosen 2026-10-05, after Pressure Grid v11. Still no classroom reports
(0), so 3 vs 4 keeps waiting on what teachers ask for. Island Census now
has the most serious row left: no keyboard play (tap a meadow, drag a
fence), HUD text 9.4 px (fail) and meadow colours close for deuteranopia
(partial). Its verbs are a point and a path between cells, the Pressure
Grid pattern (cursor, Enter, a key then an arrow).

```
Revise Island Census for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: both verbs on keys, a readable HUD, meadows told apart without hue. Read CLAUDE.md first and follow it.

1. Read docs/games/island-census.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A lightness ramp under text needs a jump, not a slope", "A hue fix moves the merge to the next neighbour" and "Canvas text shrinks with the board"), docs/games/pressure-grid.md and docs/games/wildfire-line.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game island-census. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Text and contrast: the HUD (9.4 px at 360 px wide) and every other canvas label at least 12 CSS px at 360 px wide (size from the CSS width, Tidewright's fs()), 4.5:1 against what is behind it (backings where text sits over the map). Check with node scripts/a11y-audit.mjs island-census: contrast and text must pass.

3. Colour: meadows (and rabbit/fox marks, fences, strikes) told apart by lightness or shape, not hue (the audit flags meadow colours for deuteranopia, borderline). Colour must pass on several runs. Screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

4. Keyboard: both verbs without a pointer: an arrow-key cursor over the meadows, Enter/Space releases rabbits into the meadow under it, and a key path for fencing (e.g. F, then an arrow picks the path to a neighbouring meadow; F on a fenced path takes it down; no chords). Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what each key and move did (meadow and its counts under the cursor, rabbits released, fence up/down, season results), short and not on every frame. Update the keyboard line in the manifest, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs island-census, node scripts/balance-island-census.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly), node scripts/a11y-audit.mjs island-census (all six pass). Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/island-census.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/island-census.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Murmuration accessibility revision (done, v6)

Chosen 2026-10-05, after Island Census v3. Still no classroom reports
(0), so 3 vs 4 keeps waiting on what teachers ask for. Murmuration now has
the most serious row left: 4 of 6 checks not passing (no keyboard play,
ignores reduced motion, a level counter at 3.5:1, the only contrast
finding left in a game, and 10 px text). It is the first real-time game
with a held verb in this series: lure is hold-and-move, startle a tap, so
the cursor moves while an arrow is held (Wildfire Line) and lure needs a
hold key, not a toggle.

```
Revise Murmuration for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: both verbs on keys, reduced motion read, a readable counter. Read CLAUDE.md first and follow it.

1. Read docs/games/murmuration.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A motion pass can mean small, not still", "A saturated colour turns into text grey for colour-blind eyes" and "Canvas text shrinks with the board"), docs/games/wildfire-line.md and docs/games/island-census.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game murmuration. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Text and contrast: the level counter (3.5:1, 10 px at 360 px wide) and every other canvas label at least 12 CSS px at 360 px wide (size from the CSS width, an fs() like Island Census and Tidewright), 4.5:1 against the sky behind it at every time of day (dusk darkens it), with backings where text sits over the sky or the flock. Check with node scripts/a11y-audit.mjs murmuration: contrast and text must pass.

3. Reduced motion: read prefers-reduced-motion and keep the simulation (the flock is the game) but stop or slow whatever moves that isn't the game (find what the audit's idle motion sees first; the flock idling counts as the game, decoration does not); give decoration its own clock. Grep for prefers-reduced-motion before trusting the motion cell. Colour must still pass on several runs, including a screen late in a round (dusk); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

4. Keyboard: both verbs without a pointer: an arrow-key cursor over the sky that moves while an arrow is held (tune its speed against the flock's), a held key that lures toward the cursor (e.g. hold Space; releasing it stops, like lifting a finger), and a key that startles at the cursor (e.g. Enter or X; no chords). Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame (gate passed and how many birds, gates left, flock size when it drops, light left at milestones, round result). Update the keyboard line in the manifest, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs murmuration, node scripts/balance-murmuration.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly), node scripts/a11y-audit.mjs murmuration (all six pass, several runs), and a keys-only playthrough that clears at least one gate. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/murmuration.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/murmuration.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Geode accessibility revision (done, v3)

Chosen 2026-10-05, after Murmuration v6. Still no classroom reports (0),
so 3 vs 4 keeps waiting on what teachers ask for. Geode now has the most
serious row left: 3 of 6 not passing, including a fail (8 of 14 labels
under 12 px, smallest 9.4 px), keys that reach only the thermostat (seed
is a tap, cleave a hold) and a shimmer that stays with reduced motion
although the game reads the setting. Its ← → are already the thermostat,
so the cursor needs a scheme that doesn't take them over silently.

```
Revise Geode for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: seed and cleave on keys, readable labels, reduced motion that stills the shimmer. Read CLAUDE.md first and follow it.

1. Read docs/games/geode.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A motion pass can mean small, not still", "When the simulation is the motion, a motion partial is the end state", "A held key verb needs a cursor that can get ahead" and "Canvas text shrinks with the board"), docs/games/murmuration.md and docs/games/island-census.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game geode. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Text and contrast: the labels (8 of 14 texts under 12 px, smallest 9.4 px "grow" at 360 px wide) and every other canvas label at least 12 CSS px at 360 px wide (size from the CSS width, an fs() like Island Census and Murmuration), 4.5:1 against what is behind them, with backings where text sits over the crystal or the glow. Check with node scripts/a11y-audit.mjs geode: contrast and text must pass.

3. Reduced motion: Geode already reads prefers-reduced-motion, but the shimmer stays (1.2% → 0.9%). First measure what moves while idle with the crystal's growth hidden (findings, "When the simulation is the motion…"): growth is the game, shimmer and glow pulses are decoration. Give decoration its own clock and freeze it. Colour must still pass on several runs, including a screen late in a round; screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

4. Keyboard: the thermostat already has ← →; add seed and cleave without a pointer: a cursor over the crystal's open sites and ions (arrow keys, but ← → are taken: pick a scheme with no chords, e.g. a key that switches the arrows between thermostat and cursor, or a cursor that steps site to site on its own keys), Enter or S seeds at the cursor's open site, and cleave as a hold (e.g. hold C on an ion; releasing early cancels, like lifting a finger). Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame (what is under the cursor, a seed placed, what a cleave removed, strain or melt warnings, the result). Update the keyboard line in the manifest, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs geode, node scripts/balance-geode.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly), node scripts/a11y-audit.mjs geode (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that seeds and cleaves. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/geode.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/geode.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Ant Trails accessibility revision (done, v7)

Chosen 2026-10-05, after Geode v3. Still no classroom reports (0), so 3
vs 4 keeps waiting on what teachers ask for. Ant Trails now has the most
cells left: 3 of 6 not passing, including a keyboard fail (trail is a
drag, wash a hold, keys only fast-forward), reduced motion ignored and an
11.5 px bonus line. Its trail is a path verb drawn while moving, so the
cursor moves while an arrow is held (Murmuration) and trail is a held key.

```
Revise Ant Trails for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: trail and wash on keys, reduced motion, readable labels. Read CLAUDE.md first and follow it.

1. Read docs/games/ant-trails.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A held key verb needs a cursor that can get ahead", "When the simulation is the motion, a motion partial is the end state", "Late screens grow their own greys" and "Canvas text shrinks with the board"), docs/games/geode.md and docs/games/murmuration.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game ant-trails. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: trail is a drag (a path laid in scent) and wash a hold; F already fast-forwards. Add a cursor (arrows, moving while held and speeding up, like Murmuration) and a no-chord key per verb: e.g. Space held lays trail along the cursor's path (key up = finger up), hold W washes under the cursor (letting go early cancels like lifting a finger). Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame (cursor over the nest or food, trail laid, a wash, crumbs home, colony size warnings, raids, the day's result). Update the keyboard line in the manifest, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: Ant Trails ignores prefers-reduced-motion. First measure what moves while idle with the ants hidden (findings, "When the simulation is the motion…"): the ants and the scent are the game; give decoration its own clock and freeze it. Record motion as partial if what's left is the simulation, measured, several runs.

4. Text and contrast: the bonus line (11.5 px) and every other canvas label at least 12 CSS px at 360 px wide (an fs() from the CSS width), 4.5:1 against what is behind them, with backings where text sits over the ground or scent. Colour must still pass on several runs, including a fast-forwarded screen late in a day (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs ant-trails, node scripts/balance-ant-trails.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly; compare old and new output), node scripts/a11y-audit.mjs ant-trails (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that lays a trail and washes. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/ant-trails.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/ant-trails.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Hourglass Delivery accessibility revision (done, v5)

Chosen 2026-10-05, after Ant Trails v7. Still no classroom reports (0), so
3 vs 4 keeps waiting on what teachers ask for. Five games still have no
keyboard play (orbit-garden, hourglass-delivery, hot-iron, loom; surprise
party has wait/undo only); Hourglass Delivery also ignores reduced motion,
so it has the most cells left among them. Pour is a hold at a place (the
spout's x) and knock a flick (a start point and a direction): a cursor, a
held pour key, and a knock key that takes its direction from an arrow.

```
Revise Hourglass Delivery for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: pour and knock on keys, reduced motion, a live region. Read CLAUDE.md first and follow it.

1. Read docs/games/hourglass-delivery.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A held key verb needs a cursor that can get ahead", "Jump keys give a path verb its ends", "When the simulation is the motion, a motion partial is the end state" and "Late screens grow their own greys"), docs/games/ant-trails.md and docs/games/geode.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game hourglass-delivery. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: pour is a hold (sand falls from the spout while held) and knock a flick (grains near its start shoved along its direction); there are no keys at all. Add a cursor (arrows, moving while held and speeding up, like Ant Trails; or a spout that ← → move if that is all pour needs) and a no-chord key per verb: e.g. hold Space pours (key up = finger up), K or X then an arrow knocks at the cursor in that direction (the same knock a flick of that direction makes). Jump keys to the places that matter (the next glass, the ledge) if aiming by arrows alone is slow. Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame (what is under the cursor or spout, a glass filled or empty, sand left in the hopper, a knock that moved sand, the round's result). Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: Hourglass Delivery ignores prefers-reduced-motion. First measure what moves while idle with the sand and the belt hidden (findings, "When the simulation is the motion…"; hide the shared state too): falling sand and the belt are the game; give decoration its own clock and freeze it. Record motion as partial if what's left is the simulation, measured, several runs.

4. Text and contrast: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over sand or glass. Colour must still pass on several runs, including a screen late in a round (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs hourglass-delivery, node scripts/balance-hourglass-delivery.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly; compare old and new output), node scripts/a11y-audit.mjs hourglass-delivery (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that pours and knocks. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/hourglass-delivery.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/hourglass-delivery.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Orbit Garden accessibility revision (done, v8)

Chosen 2026-10-05, after Hourglass Delivery v5. Still no classroom reports
(0), so 3 vs 4 keeps waiting on what teachers ask for. Four games still
have no keyboard play for their verbs (orbit-garden, hot-iron, loom;
surprise party has wait/undo only), the worst cell left: a keyboard player
can't play at all. Orbit Garden's verbs are a point (place) and an aimed
drag from a fixed launcher (fling), both covered by patterns we have (a
cursor + Enter; a switch key for aiming, like Geode's T).

```
Revise Orbit Garden for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: place and fling on keys, a live region, reduced motion checked. Read CLAUDE.md first and follow it.

1. Read docs/games/orbit-garden.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A switch key keeps an arrow binding players know", "An early audit screen can miss the game's own motion", "Late screens grow their own greys" and "Run the old file twice before comparing balance"), docs/games/hourglass-delivery.md and docs/games/geode.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game orbit-garden. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: place is a tap on the sky (a planet at that point) and fling a drag from the launcher (direction and strength set the seed's launch); there are no keys at all. Add a cursor (arrows, moving while held and speeding up, like Hourglass Delivery) and a no-chord key per verb: e.g. Enter places a planet at the cursor; for fling, a key that switches the arrows to aiming (← → angle, ↑ ↓ strength, the aim preview showing) and Space launches the same seed a drag with that vector makes, or another no-chord scheme if it plays better. Jump keys to the places that matter (the launcher, the next planet) if aiming by arrows alone is slow. Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame (what is under the cursor, the aim's angle and strength when it settles, where a seed landed and which planet grew, planets withering, the round's result). Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit passes Orbit Garden's motion cell; check whether that's a threshold or timing pass (grep for prefers-reduced-motion; measure idle motion past the moment the first thing moves on its own, with seeds and planets hidden, then decoration). Give decoration its own clock and freeze it under the setting; record motion as partial only if what's left is the simulation, measured, several runs.

4. Text and contrast: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over the sky or planets. Colour must still pass on several runs, including a screen late in a round (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs orbit-garden, node scripts/balance-orbit-garden.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs orbit-garden (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that places and flings. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/orbit-garden.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/orbit-garden.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Hot Iron accessibility revision (done, v6)

Chosen 2026-10-05, after Orbit Garden v8. Still no classroom reports (0),
so 3 vs 4 keeps waiting on what teachers ask for. Three games still have
no keyboard play for their verbs (hot-iron, loom; surprise party has
wait/undo only). Hot Iron's verbs are a hold at a place (heat) and a tap
at a place (hammer) along a one-row bar: a segment cursor plus a held key
and a press key, the simplest of the three. Its sparks and screen shake
use render-time `Math.random`, so they are both the reduced-motion work and
the trap for "bots reproduce exactly". Its own notes ask whether players
can tell dull red from cherry: a colour question the audit's screen may
not show (no hot bar early in a round).

```
Revise Hot Iron for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: heat and hammer on keys, a live region, reduced motion checked, heat told apart without hue. Read CLAUDE.md first and follow it.

1. Read docs/games/hot-iron.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A held key verb needs a cursor that can get ahead", "Say what the preview shows, not where the shot lands", "An early audit screen can miss the game's own motion", "Late screens grow their own greys", "A lightness ramp under text needs a jump, not a slope" and "Run the old file twice before comparing balance"), docs/games/orbit-garden.md and docs/games/hourglass-delivery.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game hot-iron. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: heat is a hold on the bar (the segment under the finger heats while held) and hammer a tap on a segment; there are no keys at all. Add a segment cursor (← → move it, one segment per press, moving while held and speeding up) and a no-chord key per verb: e.g. hold Space heats at the cursor (key up = finger up; the cursor can move while heating, like the finger), Enter or H hammers the segment at the cursor. Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame: the segment under the cursor (its heat band in words: too cold, working, white-hot; its thickness against the target), a strike's result (thinned, cracked, clang), fuel left at steps, the round's result. Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit passes Hot Iron's motion cell; check whether that's a threshold or timing pass (grep for prefers-reduced-motion; measure idle motion on a hot bar past the first strike, with sparks and shake hidden, then the glow). Sparks and shake are decoration: under the setting draw no shake and fewer or still sparks, but keep every Math.random call the bots depend on (call it and drop the result, or keep the spark list and skip drawing). Record motion as partial only if what's left is the simulation, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over the bar or the glow. Heat bands must read without hue (dull red vs cherry vs working range: lightness steps or a mark per band, findings "A lightness ramp under text needs a jump"). Colour must still pass on several runs, including a hot screen late in a round (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs hot-iron, node scripts/balance-hot-iron.mjs (balance must not move: same constants; keep Math.random calls equal so seeded bots reproduce exactly; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs hot-iron (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that heats and hammers. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/hot-iron.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/hot-iron.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Loom accessibility revision (done, v4)

Chosen 2026-10-05, after Hot Iron v6. Still no classroom reports (0), so
3 vs 4 keeps waiting on what teachers ask for. Two games still have no
keyboard play for their verbs (loom; surprise party has wait/undo only),
the worst cell left. Loom's verbs are a drag that leads a knot (the pull
grows with how far the finger leads it) and a tap that pins a knot: a
knot picker plus a held pull key whose lead the arrows set. Its other
cells pass, but they were read on the audit's first seconds: check them
on a stretched net late in a round too.

```
Revise Loom for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: pull and pin on keys, a live region, reduced motion checked. Read CLAUDE.md first and follow it.

1. Read docs/games/loom.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "Picking by arrow direction needs a matching, not a nearest", "A held key verb needs a cursor that can get ahead", "Say what the preview shows, not where the shot lands", "An early audit screen can miss the game's own motion", "Late screens grow their own greys", "A band's step belongs on the rule's line, not near it" and "Run the old file twice before comparing balance"), docs/games/hot-iron.md and docs/games/island-census.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game loom. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: pull is a drag on a knot (the pull grows with how far the finger leads it) and pin a tap on a knot (up to 4; a tap on a pin takes it out); there are no keys at all. Add a knot picker (arrows pick the knot in that direction, every knot reachable, findings "Picking by arrow direction needs a matching") and a no-chord key per verb: e.g. Enter or P pins or unpins the picked knot; hold Space grabs it and the arrows then lead it (a lead point that moves while held and speeds up; key up = finger up), the same pull a drag with that lead makes. Keys call the same functions as the pointer. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and not on every frame: the picked knot (pinned or not, the tension of its strands in words), a pull's lead and the strands it strains, a pin popping loose, a strand snapping, the round's result. Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit passes Loom's motion cell; check whether that's a threshold or timing pass (grep for prefers-reduced-motion; measure idle motion on a stretched net past the first pull, with the net hidden, then decoration). Decoration gets its own clock and freezes under the setting; keep every Math.random call the bots depend on. Record motion as partial only if what's left is the simulation, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over the net. If tension is shown by colour, it must read without hue (lightness steps on the rule's thresholds, or a mark), checked by number. Colour must still pass on several runs, including a stretched net late in a round (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs loom, node scripts/balance-loom.mjs (balance must not move: same constants; keep Math.random calls equal so seeded bots reproduce exactly; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs loom (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that pulls and pins, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/loom.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/loom.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Surprise Party accessibility revision (done, v4)

Chosen 2026-10-05, after Loom v4. Still no classroom reports (0), so 3 vs
4 keeps waiting on what teachers ask for. Surprise Party is the last game
whose keyboard cell fails (keys only wait, undo and restart; whisper and
doors need a pointer) and it has no live region, so a screen reader hears
nothing of the ripple. Its verbs are a tap on a guest and a hold on a door
on a grid house, turn by turn (each move ticks 15 minutes): a tile cursor
plus a press key and a held key, with the live region written from each
tick's result (findings, "A turn-based game's live region comes from its
move result"). Its harness cuts the `// § sim` block out of the game, so
the keys code must stay outside it.

```
Revise Surprise Party for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: whisper and doors on keys, a live region, reduced motion checked. Read CLAUDE.md first and follow it.

1. Read docs/games/surprise-party.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "A turn-based game's live region comes from its move result", "A picker over moving pieces needs a way back", "Jump keys give a path verb its ends", "An early audit screen can miss the game's own motion", "Late screens grow their own greys", "A warning ramp can end where the resting state sits" and "Run the old file twice before comparing balance"), docs/games/loom.md and docs/games/pressure-grid.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game surprise-party. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: whisper is a tap on a guest who hasn't heard and door a hold on a door (0.32 s, a ring closes); keys only wait (Space/W), undo, restart and next house. Add a tile cursor (arrows move it over the house, one tile per press, held keys repeat) with jump keys to what matters (e.g. G next guest who hasn't heard, D next door, B the birthday person), and a no-chord key per verb: e.g. Enter whispers to the guest under the cursor, hold O on a door shuts or opens it (key up early cancels, like lifting a finger; the same ring). Keep Space/W wait, U undo, R restart. Keys call the same functions as the pointer, outside the `// § sim` block. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and once per move: the tile under the cursor (guest heard / not / party hat, door open or shut, walking steps to the birthday person), each move and its tick ("7:15. Whisper to the guest in the kitchen. 3 heard: … The news is 2 steps from the birthday person."), envelopes and moves left, the house's result and stars. Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit passes Surprise Party's motion cell; check whether that's a threshold or timing pass (grep for prefers-reduced-motion; measure idle motion mid-house, after a tick's ripple, with the ripple animation hidden, then decoration). Decoration gets its own clock and freezes under the setting; the daily seed and the solver must not change. Record motion as partial only if what's left is the game itself, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over the house. Guest states (hasn't heard, just heard, quiet with a party hat, birthday person) and open/shut doors must read without hue (lightness steps or a mark), checked by number, not only by the audit's colour cell. Colour must still pass on several runs, including a late house mid-ripple (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs surprise-party, node scripts/smoke-gallery.mjs, node scripts/test-daily.mjs, node scripts/balance-surprise-party.mjs (balance must not move: same houses and solver; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs surprise-party (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that whispers and works doors, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/surprise-party.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/surprise-party.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Terrace Garden accessibility revision (done, v4)

Chosen 2026-10-05, after Surprise Party v4. Still no classroom reports (0),
so the choice between ideas 3 and 4 still waits on what teachers ask for. Terrace Garden has the
worst row left: its motion cell fails (it ignores the setting, and water
and plants move) and its keyboard cell is partial (← → tilt, but the gates
need a pointer). It is a real-time game, unlike Surprise Party: water
flows while you choose, so the live region must not speak per frame, and
the hint's pulsing tilt bar and gate ring are decoration that can freeze.

```
Revise Terrace Garden for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: gates on keys, a live region, reduced motion read. Read CLAUDE.md first and follow it.

1. Read docs/games/terrace-garden.md (its "Open ideas" accessibility line, the tilt and gate sections), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A picker key must leave Tab and focused buttons alone", "Picking by arrow direction needs a matching, not a nearest", "When the simulation is the motion, a motion partial is the end state", "An early audit screen can miss the game's own motion", "Late screens grow their own greys", "A move's line waits for its warning" and "Run the old file twice before comparing balance"), docs/games/hot-iron.md and docs/games/surprise-party.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game terrace-garden. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: tilt is ← → / A D (held), gate is a tap on a gate. Keep ← → for tilt (findings "A switch key keeps an arrow binding players know") and give gates their own no-chord keys: e.g. 1–9 toggle gate k (gate 0 = the spring valve), or ↑ ↓ pick a gate and Enter/G toggles it, with the picked gate shown by a ring that reads without hue. Keys call the same functions as the pointer, outside the simulation. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and never per frame: the picked gate (open/shut, the terrace's water depth against its plants' bands), each gate toggle, tilt once the key is released, plants blooming or drowning, the stuck hint's line, the garden's result. Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit fails Terrace Garden's motion cell (ignores it). Grep for prefers-reduced-motion; measure idle motion mid-garden with water flowing, then with the water and plants hidden, then decoration (hint pulse, ripples, sway). Decoration gets its own clock and freezes under the setting; the simulation and any Math.random calls the bots depend on must not change. Record motion as partial only if what's left is the simulation itself, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over the garden. Water depth against each plant's band, plant states (thirsty, blooming, drowning) and open/shut gates must read without hue (lightness steps on the rule's lines, or a mark), checked by number, not only by the audit's colour cell. Colour must still pass on several runs, including a late garden with full terraces (a scripted copy, findings "Late screens grow their own greys"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs terrace-garden, node scripts/smoke-gallery.mjs, node scripts/balance-terrace-garden.mjs (balance must not move: same constants; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs terrace-garden (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that tilts and works gates, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/terrace-garden.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/terrace-garden.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Lighthouse Keeper accessibility revision (done, v4)

Chosen 2026-10-05, after Terrace Garden v4. Still no classroom reports
(0), so 3 vs 4 keeps waiting on what teachers ask for. Lighthouse Keeper
has the only failing cell left among the games ("harbour" 8.5 px) and
ignores reduced motion. Its keys already reach every verb (← → turn, S
shutter, hold Space flare), but nothing is spoken: a real-time game where
ships move through fog while you turn the beam, so the live region must
say what the beam finds and what changes, never per frame. Later nights
add convoys, side arrivals and heavy ships: audit them too (findings, "A
warm-up hides the labels later levels add").

```
Revise Lighthouse Keeper for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: labels 12 px+, a live region, reduced motion read. Read CLAUDE.md first and follow it.

1. Read docs/games/lighthouse-keeper.md (its "Open ideas" accessibility line, the turn, shutter and flare sections), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A real-time live region speaks settled changes", "A warm-up hides the labels later levels add", "A switch key keeps an arrow binding players know", "Say what the preview shows, not where the shot lands", "When the simulation is the motion, a motion partial is the end state", "An early audit screen can miss the game's own motion", "Late screens grow their own greys" and "Run the old file twice before comparing balance"), docs/games/terrace-garden.md and docs/games/murmuration.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game lighthouse-keeper. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: keys already reach every verb (← → turn the beam, S shutter, hold Space charges a flare); keep them. Check them against the pointer (same functions, outside the simulation), that Tab stays free and Space/Enter on a focused button press the button, and add what a player without sight needs to aim: e.g. N turns the beam to the next ship in the dark (a jump, like a fast turn, never a free aim the pointer can't do), S status, Enter next night. A live region (role="status") says what matters, short and never per frame: where the beam points once the arrows are let go (a clock bearing, which ships it lights, the nearest ship in the dark and which way to turn), a ship arriving and from where, a ship going blind or seeing again, a wreck, a ship home, oil at a few steps, a flare's charge on release and how many ships it reached, the night's result. Update the keyboard line in the manifest (120 characters at most) if keys change, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit marks Lighthouse Keeper's motion cell partial (ignores it). Grep for prefers-reduced-motion; measure idle motion mid-night with ships moving, then with ships hidden, then with the fog hidden, then decoration (waves, flicker, beam shimmer, flare burst). Decoration gets its own clock and freezes under the setting; the simulation and any Math.random calls the bots depend on must not change. Record motion as partial only if what's left is the simulation itself, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text; "harbour" is 8.5 px), 4.5:1 against what is behind it, with backings where text sits over the sea or fog. Ship states (seeing, blind, heavy, in a convoy, wrecked) and the lamp's state (lit, shuttered, dry, charging a flare) must read without hue (lightness steps or a mark), checked by number, not only by the audit's colour cell. Contrast, colour and text must pass on several runs, including scripted later nights (convoys, side arrivals, heavy ships, thick fog; findings "Late screens grow their own greys" and "A warm-up hides the labels later levels add"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs lighthouse-keeper, node scripts/smoke-gallery.mjs, node scripts/balance-lighthouse-keeper.mjs (balance must not move: same constants; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs lighthouse-keeper (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that turns, shutters and flares, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/lighthouse-keeper.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/lighthouse-keeper.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Bubble Glass accessibility revision (done, v7)

Chosen 2026-10-05, after Lighthouse Keeper v4. Still no classroom
reports (0), so 3 vs 4 keeps waiting on what teachers ask for. Bubble
Glass is the only game left where a verb needs a pointer: ← → turn the
box, but melt (hold on sand) and shatter (tap on glass) have no key path,
so a keyboard player can't play past the first levels. It also ignores
reduced motion. Its verbs aim at cells of a grid that turns, so the
cursor has to stay on the right sand when the box turns (findings, "A
picker over moving pieces needs a way back"). Audit the held state too:
the melt's growing shard and any label it draws (findings, "A held
verb's preview hides from the audit").

```
Revise Bubble Glass for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: melt and shatter on keys, a live region, reduced motion read. Read CLAUDE.md first and follow it.

1. Read docs/games/bubble-glass.md (its "Open ideas" accessibility line, the turn, melt and shatter sections), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A cursor gives point and path verbs a key path", "A switch key keeps an arrow binding players know", "A held key verb needs a cursor that can get ahead", "A picker over moving pieces needs a way back", "A real-time live region speaks settled changes", "A held verb's preview hides from the audit", "A bearing in words needs the beam's resolution", "Late screens grow their own greys" and "Run the old file twice before comparing balance"), docs/games/geode.md and docs/games/lighthouse-keeper.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game bubble-glass. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: ← → / A D turn the box today; keep them (findings "A switch key keeps an arrow binding players know"). Give melt and shatter a key path without chords: e.g. T switches the arrows to a cell cursor (announced), hold Space melts at the cursor (key up = finger up, the same press object the pointer uses), Enter or X shatters the glass under it, G jumps to the next glass shard and B to the bubble's cell; the cursor follows its cell when the box turns, so it stays on the same sand. Keys call the same functions as the pointer, outside the simulation. Tab stays free; Space/Enter on a focused button press the button. A live region (role="status") says what matters, short and never per frame: the cell under the cursor (sand, glass, empty, the bubble; how far from the bubble and which way is up now), the box's angle once a turn settles, a shard growing (size, heat spent) and stopping at the limit, glass shattering and where the sand falls, the bubble reaching the vent or getting stuck, heat left at a few steps, the level's result. Update the keyboard line in the manifest (120 characters at most), the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit marks Bubble Glass's motion cell partial (ignores it). Grep for prefers-reduced-motion; measure idle motion mid-level with sand falling, then with the sand hidden, then with the bubble hidden, then decoration (the held shard's glow, the glowing ring's pulse, the bubble's flashing rim when slowed). Decoration gets its own clock and freezes under the setting; the simulation and any Math.random calls the bots depend on must not change. Record motion as partial only if what's left is the simulation itself, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over sand or glass. Sand, glass, a shard being melted, the bubble (free, slowed, blocked) and the vent must read without hue (lightness steps or a mark), and the cursor must show on all of them, checked by number, not only by the audit's colour cell. Contrast, colour and text must pass on several runs, including scripted later levels and held states (a shard melting, the box mid-turn; findings "Late screens grow their own greys" and "A held verb's preview hides from the audit"); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs bubble-glass, node scripts/smoke-gallery.mjs, node scripts/balance-bubble-glass.mjs (balance must not move: same constants; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs bubble-glass (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that turns, melts and shatters, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/bubble-glass.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/bubble-glass.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Coat Check accessibility revision (done, v4)

Chosen 2026-10-05, after Bubble Glass v7. Still no classroom reports (0),
so 3 vs 4 keeps waiting on what teachers ask for. Coat Check has the most
left on the audit: hook letters 11 px at 4.3:1 (text and contrast partial)
and no live region. It is a memory game, so its live region has a rule no
other game had: say what a sighted player sees, never what a closed door
holds.

```
Revise Coat Check for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: hook letters 12 px+ at 4.5:1, a live region that never gives the memory away, reduced motion read. Read CLAUDE.md first and follow it.

1. Read docs/games/coat-check.md (its "Open ideas" accessibility line, the hang, fetch and peek sections), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "Canvas text shrinks with the board", "A turn-based game's live region comes from its move result", "A move's line waits for its warning", "A held verb's preview hides from the audit", "A warm-up hides the labels later levels add", "Late screens grow their own greys", "A goal's direction needs what stands in the way" and "Run the old file twice before comparing balance"), docs/games/pressure-grid.md and docs/games/bubble-glass.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game coat-check. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: keys already reach every verb (arrows pick a hook, Enter hangs or opens, hold P peeks, Enter next shift); keep them. Check them against the pointer (same functions, outside the game's rules: a held P is the pointer's own hold, with the same 0.2 s / 0.45 s zones), that Tab stays free and Space/Enter on a focused button press the button, and add I for the status. A live region (role="status") says what the screen shows and nothing more, one line per move from the move's result: the coat at the counter (colour, pattern, pin) and the ticket a guest holds, the hook under the cursor as a sighted player sees it (row and column, free or closed: never what a closed door holds), a hang, a fetch's result (right; or wrong, with what the door showed while it was open), a peek's contents only while the door is open, peeks and complaints left, regulars carried over, the end-of-shift reveal hook by hook (short), the shift's result. Memory must stay the game: a player using the live region remembers exactly what a sighted player has to. Update the keyboard line in the manifest (120 characters at most) if keys change, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: the audit passes Coat Check's motion cell; grep for prefers-reduced-motion before trusting it (findings "A motion pass can mean small, not still"). Measure idle motion on a scripted mid-shift screen with a door showing a wrong coat, a peek held and the end-of-shift reveal; decoration (door swings, the peek ring, any pulse) gets its own clock and freezes under the setting; the game's rules and any Math.random calls the bots depend on must not change.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text; hook letters are 11 px at 4.3:1), 4.5:1 against what is behind it, with backings where text sits over doors or coats. Coat colours and patterns must read without hue (each colour its own lightness step, or the pattern and pin carry it; a ticket must match its coat by more than hue), checked by number for normal, deuteranopia and protanopia, not only by the audit's colour cell. Contrast, colour and text must pass on several runs, including scripted later shifts (pins, regulars, a full board, Endless) and held states (a peek open, a wrong door showing); screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs coat-check, node scripts/smoke-gallery.mjs, node scripts/balance-coat-check.mjs (balance must not move: same constants; run the old file twice first to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs coat-check (all six pass; several runs), and a keys-only playthrough of the first shifts that hangs, peeks and fetches, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/coat-check.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/coat-check.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for the Mycelium accessibility revision (done, v4)

Chosen 2026-10-06, after Coat Check v4. Still no classroom reports (0), so
3 vs 4 keeps waiting on what teachers ask for. Mycelium has the most cells
left: it ignores reduced motion and has no live region (its keys already
reach every verb). Its state is a network that fades and grows in real
time with a rival mould, so the live region has to speak settled changes
(Terrace Garden's rule), and its 7 `Math.random` calls make the
render/sim split matter for "bots reproduce exactly".

```
Revise Mycelium for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: a live region, reduced motion read, labels and colours checked on late screens. Read CLAUDE.md first and follow it.

1. Read docs/games/mycelium.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "A motion pass can mean small, not still", "A real-time live region speaks settled changes", "A memory game's live region must not hold the memory", "A goal's direction needs what stands in the way", "A held verb's preview hides from the audit", "Late screens grow their own greys", "A warning ramp can end where the resting state sits" and "Run the old file twice before comparing balance"), docs/games/terrace-garden.md and docs/games/coat-check.md ("Accessibility", the patterns), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game mycelium (if --game 404s, run it without and read the mycelium rows). If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Keyboard: keys already reach every verb (arrows move the cursor, Enter marks a knot then grows to the cursor, Space pulses, X cuts); keep them. Check them against the pointer (same functions; a held cut is the pointer's own hold, if it has a delay), that Tab stays free and Space/Enter on a focused button press the button, and add I for the status. A live region (role="status") says what matters, short and settled, not per frame: what is under the cursor (a knot and its health, open soil, a patch, rival mould, distance from the network), a grow's cost and result, a pulse's path and whether it grew a mushroom, a cut and what withered, knots fading or lost, rival mould spreading near the network, the pool at steps, the result. Update the keyboard line in the manifest (120 characters at most) if keys change, the canvas label (keep "click"/"tap" by device) and the game's KEY_COVER entry in scripts/a11y-audit.mjs.

3. Reduced motion: Mycelium ignores prefers-reduced-motion. Measure idle motion on a scripted mid-game screen with the network, a pulse and the mould hidden one at a time (findings "When the simulation is the motion…"); decoration (shimmer, pulses' glow, spores, any sway) gets its own clock and freezes under the setting; the simulation and every Math.random call the bots depend on must not change (keep the call and drop its result if decoration used it). Record motion as partial only if what's left is the simulation, measured, several runs.

4. Text and colour: every label at least 12 CSS px at 360 px wide (an fs() from the CSS width for canvas text), 4.5:1 against what is behind it, with backings where text sits over the soil or the network. Knot health, patches and rival mould must read without hue (each state its own lightness step, or a mark), checked by number (L* normal, deuteranopia, protanopia), not only by the audit's colour cell. Contrast, colour and text must pass on several runs, including scripted late screens (a big network, mould spreading, fading knots, a pulse held) ; screenshot before and after at 360×740, normal and simulated deuteranopia and protanopia.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs mycelium, node scripts/balance-mycelium.mjs (balance must not move: same constants; keep Math.random calls equal so seeded bots reproduce exactly; run the old file twice first from a frozen copy to confirm the harness is deterministic, then compare old and new output), node scripts/a11y-audit.mjs mycelium (all six pass, or motion partial only if the idle motion is the game itself, measured; several runs), and a keys-only playthrough that grows, pulses and cuts, reading only the live region. Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/mycelium.md (what changed, open ideas; keep it under 8 KB, move superseded parts to docs/history/mycelium.md), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md (full entry in docs/findings-log.md). Push, open the PR (template checklist), publish the playtest artifact (reuse the link in its notes if it has one), watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```

## Prompt used for idea 5 (built 2026-10-06)

Chosen 2026-10-06, after Mycelium v4. Still no classroom reports (0), so
3 vs 4 keeps waiting on what teachers ask for. Every game's audit row now
passes except Rail Yard's text (11.5 px, partial), which is not serious.
Idea 5 needs no teacher input to be right: offline lab computers are a
known school constraint, and the single-file download already exists.

```
Build idea 5 from docs/ideas/teachers.md in one PR: download every game of a subject at once, for offline lab computers. Read CLAUDE.md first and follow it.

1. Read docs/ideas/teachers.md (idea 5, and ideas 1, 2 and 7 for the teacher page), docs/gallery.md (the cabinet, topics, the teacher page and "Link previews"), docs/teaching.md, and the code that builds today's single-game download (grep "download" in assets/, starting at assets/cabinet.js; the idea's note says assets/download.js, check which is right and fix the note). Run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs (the gallery rows: opens, downloads if logged). If classroom reports ask for ideas 3 or 4 instead, or mention downloads, say so before starting.

2. Design: from the teacher page and from a topic's filter in the gallery, "Download all <topic> games": either a store-only zip written in plain JS (no library: local file headers, central directory, CRC-32; sizes stay small) or a folder-style set of files, whichever the browser support and the rules make simpler; say which and why. Inside: each game as the same standalone file today's download makes, plus an index.html that lists them (title, blurb, goal, how to play, keyboard line, topics) and opens each game by a relative link, works from file:// with no network, and passes the same contrast and text-size rules as the gallery (docs/accessibility.md). Achievements, scores and telemetry are off offline; say so on the index page, short.

3. Accessibility and wording: the new controls have names, a focus ring of 3:1, work with the keyboard alone, and say {tap}/click by device where the gallery does; light and dark themes. The index page has lang, a <main>, and headings.

4. Tests: node scripts/validate.mjs, node scripts/smoke-gallery.mjs (add a check: the button exists for a topic with games and the archive lists exactly that topic's games), node scripts/a11y-audit.mjs --gallery (all pass), and a script that builds the archive headless, unzips it (python3 zipfile is fine), opens index.html from file:// in Chromium with the network blocked, opens every game from it, and fails on any console error or a game that doesn't draw. Record archive sizes per topic.

5. Update docs/gallery.md (where it lives, how it is built), docs/teaching.md (one paragraph for teachers), idea 5 in docs/ideas/teachers.md (done, with sizes), and add what the build teaches to docs/findings.md if anything is new (full entry in docs/findings-log.md). Push, open the PR (template checklist), watch CI until green. No playtest artifact is needed for a gallery change unless a game file changed; if the index page is worth a look, publish it as a private artifact and link it in the PR.

6. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–4 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 6 at its end.
```

## Next: Class challenge link (idea 4, prompt below)

Chosen 2026-10-06, after the topic zip (idea 5). Still 0 classroom
reports, so nothing points to 3 over 4; the teacher page had 3 opens and
single-game downloads 2 (pressure-grid). Idea 4 reuses the Daily
Challenge's seeded runs, result card and boards logic, and has no
accuracy risk; idea 3 (what's going on here notes) is mostly writing
that should wait for a teacher to say which games they use. The audit
found nothing serious: Rail Yard's 11.5 px text is partial; Aqueduct and
Counterfeit Scale lack a live region (their next revisions). Only 3 games
have `daily` today (Coat Check, Counterfeit Scale, Surprise Party), so
the challenge list is short until more join the rotation.

```
Build idea 4 from docs/ideas/teachers.md in one PR: a class challenge link, so a class plays the same seeded run of one game and compares results. Read CLAUDE.md first and follow it.

1. Read docs/ideas/teachers.md (idea 4, and ideas 1, 2, 5 and 7 for the teacher page), docs/daily.md (the pick, the game's side of the protocol, the result card, boards), docs/gallery.md (routes, the teacher page, classroom mode, "Topic download"), and assets/daily.js. Run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs (the gallery rows: teachers, download_topic, daily). If classroom reports ask for idea 3 instead, or mention challenges or downloads, say so before starting.

2. Design: on the teacher page, "Make a class challenge": pick a game (only games with `daily` in the manifest) and get a link like #/challenge/<game>/<code> (a short code the seed is derived from; say how, and why it can't collide with a Daily date). Opening it plays that game in daily mode with that seed: same run for everyone, practice runs after the first, and the daily result card with the challenge code instead of "Daily #N". Decide and say: whether challenge results go to any leaderboard (likely not; classroom mode may be on), whether the first run counts once per browser per code, and how the teacher sees the class's results without accounts (likely: students share the card or read their score aloud; no backend change). Must not change the Daily Challenge for anyone else.

3. Accessibility and wording: the new controls have names, a focus ring of 3:1, work with the keyboard alone, and say {tap}/click by device where the gallery does; light and dark themes; the challenge banner/card text passes the same contrast and text-size rules (docs/accessibility.md).

4. Tests: node scripts/validate.mjs, node scripts/test-daily.mjs (add: a challenge code gives the same seed every time and differs from every Daily seed of the next year), node scripts/smoke-gallery.mjs (add a check: make a link on the teacher page, open it, the game gets the challenge seed, the card shows the code), node scripts/a11y-audit.mjs --gallery (all pass, add the challenge view), node scripts/test-bundle.mjs (still passes). If a game file changes, node scripts/monkey-games.mjs <id>.

5. Update docs/daily.md and docs/gallery.md (routes, how it's built), docs/teaching.md (one paragraph for teachers), idea 4 in docs/ideas/teachers.md (done), docs/telemetry.md if a new gallery event is logged, and add what the build teaches to docs/findings.md if anything is new (full entry in docs/findings-log.md). Push, open the PR (template checklist), watch CI until green. No playtest artifact is needed for a gallery change unless a game file changed; if the challenge view is worth a look, publish the gallery as a private artifact and link it in the PR.

6. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–4 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 6 at its end.
```
