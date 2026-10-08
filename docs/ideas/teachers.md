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
| 4 | Class challenge link (teacher-chosen seed) | medium | built (`#/challenge/<id>/<code>`, 2026-10-07) |
| 5 | Download a whole subject at once | medium | built (topic zip, 55–360 KB) |
| 6 | Accessibility audit | audit, then per-game fixes | **done 2026-10-07**: gallery fixed, every game's row pass or partial by design (`docs/accessibility.md`) |
| 7 | "I used this in class" feedback form | small | built (kind `classroom`) |

Ideas 1, 2, 4, 5, 6 and 7 are built. Their full write-ups and the prompts
used to build them (including one per game for the accessibility pass) are
in `docs/history/teachers.md` (moved 2026-10-07); grep the heading you need.

## 3. "What's going on here" notes per game

For each game: the real-world idea behind it (how heat spreads in Hot
Iron, contagion in Wildfire Line) and 2–3 discussion questions. Optional
manifest field (e.g. `classroom: { idea, questions[] }`), shown in the
cabinet's ⓘ panel and on the teacher page; validate checks its shape.
Writing 20 of them is the real work; accuracy matters more than coverage,
so a game without one is fine.
