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
| 6 | Accessibility audit | audit, then per-game fixes | audited (`docs/accessibility.md`); gallery fixed; Wildfire Line fixed (v4); other games open |
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

Per game, picked up by its next revision (same line in its notes). Every
game but Aqueduct also wants `role="img"` on its canvas and a label that
says "click" on PC.

- murmuration: no keyboard play; ignores reduced motion; counter 10 px at 3.5:1.
- orbit-garden: no keyboard play.
- wildfire-line: done (v4, 2026-10-05): ground told apart by lightness, keyboard cursor for both verbs, reduced motion, role and label. The pattern for the others (`docs/games/wildfire-line.md`, "Accessibility").
- ant-trails: keys only fast-forward; ignores reduced motion; bonus line 11.5 px.
- hourglass-delivery: no keyboard play; ignores reduced motion (small).
- hot-iron: no keyboard play.
- island-census: no keyboard play; HUD 9.4 px; meadow colours close for deuteranopia.
- loom: no keyboard play.
- terrace-garden: keys tilt but can't work the gates; ignores reduced motion.
- tidewright: labels 8.5 px, "flood" 1.3:1; red handles merge with the wall for protanopia.
- pressure-grid: keys only undo/restart/next; cell numbers 2.0:1.
- rail-yard: keeps Tab and Shift+Tab (can't leave the cabinet frame by keyboard); "Run 0" 11.5 px.
- aqueduct: canvas has no aria-label.
- bubble-glass: keys turn the box only; ignores reduced motion (small).
- mycelium: ignores reduced motion (small).
- lighthouse-keeper: "harbour" 8.5 px; ignores reduced motion.
- counterfeit-scale: label only (no live region for weighings).
- coat-check: hook letters 11 px at 4.3:1; no live region.
- surprise-party: keys only wait/undo/restart; label doesn't name the verbs.
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

## Next: Tidewright accessibility revision (prompt below)

Chosen 2026-10-05, after Wildfire Line v4. Still no classroom reports (0),
so 3 vs 4 keeps waiting. Tidewright now has the worst row: three fails,
one of them a label nobody can read ("flood" at 1.3:1), text at 8.5 px,
and red handles that vanish into the wall for protanopia. Its keyboard
already passes, so this is the colour, contrast and canvas-text half of
the Wildfire Line pattern. If classroom reports have arrived, read them first.

```
Revise Tidewright for accessibility (docs/accessibility.md, its row; docs/ideas/teachers.md, idea 6) in one PR: readable canvas labels (contrast and size), colour-blind-safe sluice handles, reduced motion, canvas role and label. Read CLAUDE.md first and follow it.

1. Read docs/games/tidewright.md (its "Open ideas" accessibility line), docs/accessibility.md, docs/findings.md (the Accessibility section, especially "Effects carry a state into another's lightness band" and "Canvas text shrinks with the board"), docs/games/wildfire-line.md ("Accessibility", the pattern), and run node scripts/fetch-feedback.mjs --classroom and node scripts/fetch-telemetry.mjs --game tidewright. If classroom reports mention accessibility or ask for ideas 3 or 4 instead, say so before starting.

2. Contrast and text: every canvas label ("flood", column and gate labels) at least 12 CSS px at 360 px wide and 4.5:1 against what is behind it (size from the CSS width; give labels a backing or strip, not bare text over sand or water). Check with node scripts/a11y-audit.mjs tidewright: contrast and text must pass.

3. Colour: sluice handles, wall, sand and water told apart by lightness or shape, not hue (protanopia: red handle ≈ brown wall). Colour must pass on several runs (the meadow-style randomness made one pass luck for Wildfire Line). Screenshot before and after at 360×740, normal and simulated protanopia.

4. Reduced motion: the audit row says pass but the notes say it ignores the setting; find out which, and with prefers-reduced-motion stop decorative motion (shimmer, foam, waves) while the tide and sand (the game) stay. Canvas gets role="img" and a label that says "click" on PC (pointer: fine) and names its verbs. Keep the keyboard line working and Tab free; update KEY_COVER only if the line changes.

5. Tests: node scripts/validate.mjs, node scripts/monkey-games.mjs tidewright, node scripts/balance-tidewright.mjs (balance must not move: same constants; keep render-time Math.random calls equal so seeded bots reproduce exactly), node scripts/a11y-audit.mjs tidewright (all six pass). Bump version and updated, score.epoch only if the score's meaning changed.

6. Update docs/games/tidewright.md (what changed, open ideas), its row in docs/accessibility.md, the game's line in docs/ideas/teachers.md (idea 6), and add what the revision teaches to docs/findings.md. Push, open the PR (template checklist), publish the playtest artifact, watch CI until green.

7. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next teacher idea, chosen from docs/ideas/teachers.md 3–5 (or a game's accessibility revision, if the audit found something serious) using any classroom feedback received so far, in the same shape as this prompt. Include this same step 7 at its end.
```
