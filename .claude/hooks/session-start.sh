#!/bin/bash
# Prints a short git status at session start (a few lines, read by Claude).
# Flags two things that have cost whole sessions: a branch whose PR is already
# merged, and commits left on claude/* branches that never reached main.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
timeout 20 git fetch -q --prune origin 2>/dev/null || { echo "git: fetch failed, status may be stale"; }
git rev-parse -q --verify origin/main >/dev/null || exit 0
br=$(git branch --show-current)
read -r behind ahead < <(git rev-list --left-right --count origin/main...HEAD 2>/dev/null)
echo "git: on $br, $ahead ahead / $behind behind origin/main"
if [ "$br" != main ] && [ "${ahead:-0}" = 0 ] && [ "${behind:-0}" != 0 ]; then
  echo "git: $br has nothing unmerged (its PR was merged). Restart it: git checkout -B $br origin/main"
fi
for b in $(git branch -r --format='%(refname:short)' | grep '^origin/claude/'); do
  [ "$b" = "origin/$br" ] && continue
  n=$(git cherry origin/main "$b" 2>/dev/null | grep -c '^+')
  [ "$n" != 0 ] && echo "git: $b has $n commit(s) not in main: $(git log -1 --format=%s "$b")"
done
exit 0
