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
     "goal": "What the player is trying to do (or say it's a sandbox).",
     "mechanics": [
       { "name": "pump", "verb": "tap", "description": "..." },
       { "name": "siphon", "verb": "drag", "description": "..." }
     ],
     "sharedState": "Which value(s) the mechanics read and write.",
     "accent": "#hex color for the card",
     "achievements": [
       { "id": "first-pop", "title": "First Pop", "description": "Make a cell erupt." }
     ]
   }
   ```

   `id` is the game's permanent identity: feedback and achievements are keyed
   on it, so never rename it.
3. Add achievements (at least 3). List them in the manifest, then
   announce each one from the game with this snippet (see either existing game):

   ```js
   const GAME_ID = 'my-game';
   const unlocked = new Set();
   function unlock(id) {
     if (unlocked.has(id)) return;
     unlocked.add(id);
     if (window.parent !== window) {
       window.parent.postMessage({ type: 'arcade:achievement', game: GAME_ID, id: id }, '*');
     }
   }
   // ...later: unlock('first-pop');
   ```

   The gallery records unlocks per player (in their browser), shows a popup,
   and lists them under the game. Good achievements reward interplay between
   the mechanics, not just grinding. Achievement ids are permanent too.
4. Size the game from its **width**, not the screen height (no `vh` or
   `innerHeight` for layout). The gallery sizes its frame to fit the game's
   content, so the game never scrolls separately from the page.
5. Run `node scripts/validate.mjs` and play it locally
   (`python3 -m http.server`, then open http://localhost:8000).
6. Open a PR and fill in the template checklist.

## Revising a game from feedback

1. Pull feedback: `node scripts/fetch-feedback.mjs --game <id>` (or search
   GitHub issues for `"[feedback] <id>"`).
2. Edit `games/<id>.html` in place. The PR diff is the record of what changed.
3. In `games/games.json`, bump `version` by 1 and set `updated`. New ratings
   are then tagged with the new version, so you can compare before and after.
4. Open a PR; mention which feedback motivated the change.

A revision that changes the core mechanics enough to be a different game
should be a new `id` instead.
