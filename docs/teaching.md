# Emergent Arcade for teachers

The teacher guide is on the site now, so teachers don't need GitHub (which
school networks may block):

**https://avatar-coco-love.github.io/emergent-arcade/#/teachers**

It has what this file used to: practical details (free, offline copies),
games by subject (built from `games/games.json` and `assets/topics.js`, so
it never lags), privacy, and going further. Plus the **classroom mode**
link (`?class=1`: no play stats, no leaderboard names, no rating) and the
**"I used this in class"** form.

## For maintainers

- Page: `#teachersView` in `index.html`, `assets/teachers.js`; classroom
  mode: `assets/classroom.js`. Design notes: [gallery.md](gallery.md),
  "Teacher page" and "Classroom mode".
- Edit the page's wording in `index.html`. The subject table needs no edits:
  tag a game's `topics` ([adding-a-game.md](adding-a-game.md), "Topics").
- Read classroom reports with `node scripts/fetch-feedback.mjs --classroom`
  (also at the end of the default summary), or GitHub issues titled
  `[feedback] classroom: …` when the backend was unreachable.
- More ideas for teachers: [ideas/teachers.md](ideas/teachers.md).
