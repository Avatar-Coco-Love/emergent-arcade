# Idea: classroom and accessibility checks in the normal game steps

Proposed 2026-10-07. Most recent PRs were accessibility revisions that
retrofitted the same things into finished games (keyboard path for every
verb, live region, lightness instead of hue, 12 px text, reduced motion,
canvas label). `docs/adding-a-game.md` and the PR template don't list
them, so a new game would need the same revision later. Teachers add a few
checks of their own (a round fits a class period, honest topics,
classroom-safe content). Docs only. **Done 2026-10-07**: the checks are in
`docs/adding-a-game.md`, "Classroom and accessibility", and the PR
template.

## Ready prompt

```
Docs-only PR: make classroom and accessibility part of the normal steps for adding or revising a game, so new games build them in from day one instead of needing an accessibility revision later. Read CLAUDE.md first and follow it. No game or gallery code changes.

1. Read docs/adding-a-game.md, .github/pull_request_template.md, docs/accessibility.md (the rules and what the audit checks), the "Accessibility" section of docs/findings.md, and idea 6 in docs/history/teachers.md (the per-game rows: what each accessibility revision added). Skim one finished revision's notes for the pattern (docs/games/wildfire-line.md, "Accessibility"). Don't read docs/findings-log.md whole; grep a heading only if a rule needs its story.

2. Add a "Classroom and accessibility" section to docs/adding-a-game.md, as checks a new game or revision must pass, each one line with a pointer to where the detail lives:
   - Keyboard: every verb has a key path (not only housekeeping keys), listed in the manifest's `keyboard` line; Tab stays the browser's.
   - Live region: status text in the DOM that says what each move did and what the cursor is over, read from the game state, never per frame.
   - Colour: states told apart by lightness and/or shape, never hue alone; small fills near-grey or blue-bearing (saturated colours turn into text grey for colour-blind eyes); check late screens too.
   - Text: 12 px or more at 360 px wide, on a backing over the scene.
   - Reduced motion: read prefers-reduced-motion and still the decoration (the simulation itself may keep moving).
   - Canvas: role="img" and an aria-label naming the game and its verbs.
   - Classroom: a meaningful round or level fits a class period (5–10 minutes) as well as the 10+ minute depth target; topics only where the core rules really model the subject; nothing a school would object to; no typed text in the game.
   Say how to check them: node scripts/a11y-audit.mjs <id> (game rows report, they don't fail CI) and the game's balance script with a keys-only bot that reads only the live region, where earlier revisions did that.

3. Add matching checkboxes to .github/pull_request_template.md under "For new or revised games" (short lines, one per check above, accessibility grouped). Keep the template's existing items as they are.

4. If docs/findings.md or docs/accessibility.md says something the new section contradicts, fix the stale side and say which. Keep docs/adding-a-game.md readable: if it grows long, link to docs/accessibility.md rather than repeating it.

5. Tests: node scripts/validate.mjs. Mark this brief done in docs/ideas/README.md (and move it out of "Next up"). Push, open the PR (template checklist), watch CI until green. No artifact needed.

6. End with the handoff (at most 5 lines), then a ready-to-paste prompt for the next job in docs/ideas/README.md, "Next up", using any classroom feedback and telemetry received so far. Include this same step 6 at its end.
```
