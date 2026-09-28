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
     "howToPlay": "A short paragraph shown in the gallery's How to play panel.",
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
4. Make the game **fill whatever window it's given** and never scroll:
   `html, body { height: 100%; overflow: hidden }`, then scale the play area
   to the largest size that fits both the width and the height (see
   `fitBoard()` in Pressure Grid or `fitSky()` in Orbit Garden). The gallery
   shows the game inside a "cabinet" that fills the screen.
   - Keep instructions **out** of the game file. The title, how to play and
     goal live in the manifest and appear in the cabinet's ⓘ panel.
   - Only a small status line and buttons (e.g. Reset) belong under the
     play area.
   - Pause when the gallery covers the game with a panel:

     ```js
     let paused = false;
     window.addEventListener('message', evt => {
       if (evt.data && evt.data.type === 'arcade:pause') paused = true;
       if (evt.data && evt.data.type === 'arcade:resume') paused = false;
     });
     // skip simulation steps while paused
     ```
   - Anything that ends a round (win/lose screen) should ignore input for
     about a second, so fast tapping can't skip it.
   - When a round ends, report it for play telemetry
     ([telemetry.md](telemetry.md)). `elapsed` is the round's unpaused
     seconds. Sandboxes with no rounds skip this and start their `goal` with
     "Sandbox".

     ```js
     window.parent.postMessage({ type: 'arcade:result', game: GAME_ID,
       outcome: won ? 'win' : 'loss', time: Math.round(elapsed * 10) / 10 }, '*');
     ```

     A game with levels/days/stages also sends `level`, `run`, `attempt`,
     `reason` and a few `stats` numbers (see
     [telemetry.md](telemetry.md#games-with-levels-optional-fields)).
5. Optional: give the game its own gallery card art by adding an entry for
   its `id` to `assets/thumbs.js` (a function returning a 72×72 inline SVG
   drawn from primitives). Without one, the card shows a generated pixel
   pattern in the game's `accent` color.
6. Run `node scripts/validate.mjs` and play it locally
   (`python3 -m http.server`, then open http://localhost:8000).
7. Write `docs/games/<id>.md`: key constants, layout, balance numbers and
   open ideas (see `docs/games/murmuration.md`). Sessions read this file,
   not PR bodies, so keep it current and short.
8. Open a PR and fill in the template checklist.

## Revising a game from feedback

1. Pull feedback: `node scripts/fetch-feedback.mjs --game <id>` (or search
   GitHub issues for `"[feedback] <id>"`), and play data:
   `node scripts/fetch-telemetry.mjs --game <id>` (human win rate vs. bots).
2. Edit `games/<id>.html` in place. The PR diff is the record of what changed.
3. In `games/games.json`, bump `version` by 1 and set `updated`. New ratings
   are then tagged with the new version, so you can compare before and after.
4. Update `docs/games/<id>.md` in the same PR (new constants, balance
   numbers, open ideas).
5. Open a PR; mention which feedback motivated the change.

A revision that changes the core mechanics enough to be a different game
should be a new `id` instead.
