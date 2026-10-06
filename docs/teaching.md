# Emergent Arcade for teachers

The teacher guide is on the site now, so teachers don't need GitHub (which
school networks may block):

**https://avatar-coco-love.github.io/emergent-arcade/#/teachers**

It has what this file used to: practical details (free, offline copies),
games by subject (built from `games/games.json` and `assets/topics.js`, so
it never lags), privacy, and going further. Plus the **classroom mode**
link (`?class=1`: no play stats, no leaderboard names, no rating) and the
**"I used this in class"** form.

**Offline lab computers:** on the teacher page, every subject in "Games by
subject" has **Download all as zip** (the gallery shows "Download all
<subject> games" when you pick that subject's chip). You get one zip
(55–360 KB) with each game as a single HTML file and an `index.html` that
lists them with their goal, how to play and keys. Unzip it first ("Extract
all": opened inside the zip, the links between files break), copy the
folder to each computer or a shared drive, and open `index.html` in any
browser. It needs no network and sends nothing.

## For maintainers

- Page: `#teachersView` in `index.html`, `assets/teachers.js`; classroom
  mode: `assets/classroom.js`; topic zips: `assets/bundle.js`
  ([gallery.md](gallery.md), "Topic download"). Design notes: [gallery.md](gallery.md),
  "Teacher page" and "Classroom mode".
- Edit the page's wording in `index.html`. The subject table needs no edits:
  tag a game's `topics` ([adding-a-game.md](adding-a-game.md), "Topics").
- Read classroom reports with `node scripts/fetch-feedback.mjs --classroom`
  (also at the end of the default summary), or GitHub issues titled
  `[feedback] classroom: …` when the backend was unreachable.
- More ideas for teachers: [ideas/teachers.md](ideas/teachers.md).
