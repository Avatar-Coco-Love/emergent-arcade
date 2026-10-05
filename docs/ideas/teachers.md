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
| 6 | Accessibility audit | audit, then per-game fixes | later |
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

Schools often have accessibility requirements. Only 3 files in `assets/` +
`games/` mention `prefers-reduced-motion`; contrast, colour-blind-safe
colours and keyboard play across the 20 games are unchecked. First an
audit (one line per game per check), then fixes game by game in their own
revision PRs.

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

## Next: idea 6, accessibility audit (prompt below)

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
