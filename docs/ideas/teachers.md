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
| 4 | Class challenge link (teacher-chosen seed) | medium | later |
| 5 | Download a whole subject at once | medium | later |
| 6 | Accessibility audit | audit, then per-game fixes | audited (`docs/accessibility.md`); gallery fixed; Wildfire Line fixed (v4), Tidewright (v3), Pressure Grid (v11), Island Census (v3), Murmuration (v6); every canvas labelled, Rail Yard frees Tab (2026-10-05); other games open |
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

`assets/download.js` builds one standalone file per game. A "Download all
fluid dynamics games" option (zip, or a folder of files plus a small index
page) for offline lab computers. No zip library is allowed by the rules
(no dependencies): either a tiny store-only zip writer or several files.

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
- orbit-garden: no keyboard play.
- wildfire-line: done (v4, 2026-10-05): ground told apart by lightness, keyboard cursor for both verbs, reduced motion, role and label. The pattern for the others (`docs/games/wildfire-line.md`, "Accessibility").
- ant-trails: keys only fast-forward; ignores reduced motion; bonus line 11.5 px.
- hourglass-delivery: no keyboard play; ignores reduced motion (small).
- hot-iron: no keyboard play.
- island-census: done (v3, 2026-10-05): meadows, turf, paths and sand in their own lightness bands (plus grass tufts), counts and strikes told by shape, HUD 12.5 px+, a keyboard cursor (Enter releases, F then an arrow picks a path), a live region (`docs/games/island-census.md`, "Accessibility").
- loom: no keyboard play.
- terrace-garden: keys tilt but can't work the gates; ignores reduced motion.
- tidewright: done (v3, 2026-10-05): labels 12 px+ on backings, handles told apart by lightness and shape, a surface line on water, reduced motion read (`docs/games/tidewright.md`, "Accessibility").
- pressure-grid: done (v11, 2026-10-05): cells in two lightness bands (numbers 6.3:1+), labels on backings, a keyboard cursor (Enter pumps, S then an arrow aims a pour), a live region that says what each move did (`docs/games/pressure-grid.md`, "Accessibility").
- rail-yard: "Run 0" 11.5 px. (Tab freed in v3: Space picks a car.)
- aqueduct: no live region.
- bubble-glass: keys turn the box only; ignores reduced motion (small).
- mycelium: ignores reduced motion (small).
- lighthouse-keeper: "harbour" 8.5 px; ignores reduced motion.
- counterfeit-scale: no live region for weighings.
- coat-check: hook letters 11 px at 4.3:1; no live region.
- surprise-party: keys only wait/undo/restart; no live region.
- geode: keys reach the thermostat only; labels 9.4 px; shimmer stays with reduced motion.

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

## Next: Geode accessibility revision (prompt below)

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
