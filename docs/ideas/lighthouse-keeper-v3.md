# Lighthouse Keeper v3: next steps (proposed)

Written 2026-10-03 after v2 merged (PR #79). Current design and balance:
`docs/games/lighthouse-keeper.md`.

## What v2 left open

- **Flare is still optional:** the never-flare bot scores 89% of skilled
  (target 80%); 76% at 1 s per action, tied at 2 s. Flares pay only on
  convoy nights, fired ~5 s before the reefs. Tried in v2 and not enough:
  tighter/wider convoys, aligned convoy reefs (helped), a slower lamp,
  slower ship turns, longer flare patches, more oil pressure.
- Root cause: a ship lit once holds its harbour course blind, so the beam
  serves a convoy one ship at a time (findings: *A spotlight serves a
  crowd one by one when one look is enough*).
- Not hand-played on a phone yet. Final oil setting (lamp 1.4/s) rests on
  50-run samples (~±8 pts against 100 runs).
- Novice wall is now night 6 (Thick night).

## Order

1. **Play v2 on a phone first** (a few nights): https://claude.ai/artifact/KcKMZ1aX9ZqmRBDhqpCQmT
   or the gallery's `#/play/lighthouse-keeper`. Note in
   `docs/games/lighthouse-keeper.md` ("Player data"): did flares feel
   optional, or just hard to time? Did nights 4–6 feel fair?
2. If flares felt optional, run the prompt below. If they felt fine, pick
   another game's review pass instead (`docs/ROADMAP.md`) and leave this
   file for later.
3. After some play: `node scripts/fetch-telemetry.mjs` and compare
   `flares` / `flare_oil` per night (nights 6–8) with the bots.

## Prompt for the v3 conversation

```
Revise Lighthouse Keeper (games/lighthouse-keeper.html, v2, PR #79) so the flare is required. One PR for this game only. Read CLAUDE.md first and follow it.

1. Read docs/games/lighthouse-keeper.md (current design, v2 balance, open ideas: "Flare is still short of its target"), docs/ideas/lighthouse-keeper-v3.md, docs/findings.md (note "A spotlight serves a crowd one by one when one look is enough" and "A burst verb fired too early looks useless"), and grep docs/findings-log.md for those two headings. Map the file with `node scripts/outline.mjs lighthouse-keeper` and read by range.

2. Bug hunt first. Run `node scripts/balance-lighthouse-keeper.mjs 5 idle` and confirm the self-test passes. Check:
   - Anything v2 left behind: convoy reefs (REEF_U) landing on top of each other or on a side ship's lane; a convoy slot pushed off-screen by the modulo; side-lane ships in a convoy all spawning at the same y.
   - The hint strip on convoy nights (does the flare hint come early enough on night 3, the first night with pairs?).
   - arcade:pause mid-charge, Space after a pause, a drag that starts on the lamp (all fixed in v2; keep them fixed).
   - Layout at 390×760, 800×400 and 1200×800 with a long hint; console free of errors through a drawn run of every night with rAF running.
   Extend the self-test if you find a new class of bug.

3. Then fine-tune, running `node scripts/balance-lighthouse-keeper.mjs 50` before and after each change (confirm the final numbers at 100 runs for skilled and noflare; 50-run results were off by ~8 points):
   - Make the flare required: noflare at 80% of skilled or below at ACT=0.5 and ACT=1, without lifting flarespam. Root cause: a ship lit once holds its harbour course blind, so the beam visits a convoy one ship at a time. First lever to try: blind ships drift off course over time (a heading random walk that grows the longer a ship is blind, or a cross-current on some nights), so a ship needs light again near its reef. Before trusting it, list every automatic way a convoy can clear itself (lit-once heading, the beam's 2 s trail, 2 free wrecks, staggered reef distances) and test noflare against each.
   - Keep: nights ~1–1.3 min; skilled median run 10+ min but not forever; sweep and nearest well below skilled; noshutter clearly below skilled (v2: 77%); novice nights 4–5 no worse than v2 (70/58%); no difference across ACT=0.5/1/2. Run sweep, flarespam and noshutter after any oil change.
   - Starburst 30–60% for skilled (v2: 26%).
   - Harness waits: never wait on `pgrep -f <pattern>` from a shell whose own command line contains the pattern (it matches itself and never ends); wait on saved PIDs instead.

4. Bump version to 3, set updated, add a changes line (280 characters max), and bump score.epoch only if the meaning of "ships home" changed. Update docs/games/lighthouse-keeper.md (move v2 balance to docs/history/lighthouse-keeper.md), mark docs/ideas/lighthouse-keeper-v3.md done, add any new findings (docs/findings.md + docs/findings-log.md), validate, push to the session's branch, open the PR, republish the playtest artifact at its existing link (https://claude.ai/artifact/KcKMZ1aX9ZqmRBDhqpCQmT), and end with a 5-line handoff.

5. After the handoff, give me a ready-to-paste prompt for the next conversation, for whatever you recommend next (per docs/ROADMAP.md: another game's review pass, a playtest-driven revision, or a new game), in the same shape as this prompt (read, bug hunt, fine-tune, version bump and PR). Include this same step 5 at its end.
```

## Loose ends

- Branch `origin/ccr-ca9a3052-eqyn5k` has one commit not in `main` ("Add
  Mycelium and Lighthouse Keeper idea briefs"); both games are built, so
  it is probably safe to delete, but check it first.
