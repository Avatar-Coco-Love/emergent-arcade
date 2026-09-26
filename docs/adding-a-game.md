# Adding or revising a game

Everything reaches the live site through a reviewed PR into `main`. Nothing is
published from a branch.

## New game

1. Write `games/<id>.html`: one self-contained file (inline CSS/JS, no
   external files, no network calls). Use `games/pressure-grid.html` as the
   reference for structure, mobile-friendly sizing and pointer handling.
2. Add an entry to `games/games.json`:

   ```json
   {
     "id": "my-game",
     "title": "My Game",
     "file": "my-game.html",
     "version": 1,
     "added": "YYYY-MM-DD",
     "updated": "YYYY-MM-DD",
     "blurb": "One sentence for the gallery card.",
     "mechanics": [
       { "name": "pump", "verb": "tap", "description": "..." },
       { "name": "siphon", "verb": "drag", "description": "..." }
     ],
     "sharedState": "Which value(s) the mechanics read and write.",
     "accent": "#hex color for the card"
   }
   ```

   `id` is the game's permanent identity: feedback is keyed on it, so never
   rename it.
3. Run `node scripts/validate.mjs` and play it locally
   (`python3 -m http.server`, then open http://localhost:8000).
4. Open a PR and fill in the template checklist.

## Revising a game from feedback

1. Pull feedback: `node scripts/fetch-feedback.mjs --game <id>` (or search
   GitHub issues for `"[feedback] <id>"`).
2. Edit `games/<id>.html` in place. The PR diff is the record of what changed.
3. In `games/games.json`, bump `version` by 1 and set `updated`. New ratings
   are then tagged with the new version, so you can compare before and after.
4. Open a PR; mention which feedback motivated the change.

A revision that changes the core mechanics enough to be a different game
should be a new `id` instead.
