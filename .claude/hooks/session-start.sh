#!/bin/bash
# Prints a short git status at session start (a few lines, read by Claude).
# Flags two things that have cost whole sessions: a branch whose PR is already
# merged, and commits left on session branches (claude/*, ccr-*) that never reached main.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
timeout 20 git fetch -q --prune origin 2>/dev/null || { echo "git: fetch failed, status may be stale"; }
git rev-parse -q --verify origin/main >/dev/null || exit 0
br=$(git branch --show-current)
read -r behind ahead < <(git rev-list --left-right --count origin/main...HEAD 2>/dev/null)
echo "git: on $br, $ahead ahead / $behind behind origin/main"
if [ "$br" != main ] && [ "${ahead:-0}" = 0 ] && [ "${behind:-0}" != 0 ]; then
  echo "git: $br has nothing unmerged (its PR was merged). Restart it: git checkout -B $br origin/main"
fi
for b in $(git branch -r --format='%(refname:short)' | grep -E '^origin/(claude/|ccr-)'); do
  [ "$b" = "origin/$br" ] && continue
  n=$(git cherry origin/main "$b" 2>/dev/null | grep -c '^+')
  [ "$n" != 0 ] && echo "git: $b has $n commit(s) not in main: $(git log -1 --format=%s "$b")"
done
# Is the live site on main? The deploy tags index.html's assets/ links with
# ?v=<commit> (pages.yml). In Oct 2026 one stuck deploy held the Pages queue
# and 12 merges never went live while every PR looked done.
site=$(sed -nE 's/.*siteUrl: *"([^"]*)".*/\1/p' assets/config.js 2>/dev/null)
live=$(timeout 10 curl -fsS "${site}?nocache=$(date +%s)" 2>/dev/null | grep -o 'assets/config\.js?v=[0-9a-f]*' | head -1 | cut -d= -f2)
if [ -z "$live" ]; then
  echo "deploy: couldn't read the live site's commit"
elif [ "$(git rev-parse --short=7 origin/main)" = "$live" ]; then
  echo "deploy: live site is on main ($live)"
elif ! git cat-file -e "$live^{commit}" 2>/dev/null; then
  echo "deploy: live site is on $live, not in origin/main's history"
else
  n=$(git rev-list --first-parent --count "$live..origin/main")
  since=$(git log --first-parent --reverse --format=%ct "$live..origin/main" | head -1)
  mins=$(( ($(date +%s) - since) / 60 ))
  if [ "$mins" -lt 20 ]; then
    echo "deploy: $n merge(s) on main still deploying (${mins} min)"
  else
    echo "deploy: LIVE SITE IS $n MERGE(S) BEHIND MAIN, oldest undeployed one $((mins / 60))h $((mins % 60))m ago. Tell the user. A stuck Pages run (status waiting/pending) blocks every later deploy: cancel it (mcp__github__actions_run_trigger cancel_workflow_run) and the queued one deploys main."
  fi
fi
exit 0
