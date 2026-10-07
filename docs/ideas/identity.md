# Idea: keep your leaderboard name across browsers (no accounts)

**Built 2026-10-07** (save, use a saved code, callout, word codes, export
opt-in, classroom hiding). How it works now: [scores.md](../scores.md),
"Recovery code". Decisions on the open questions are there too: restore
replaces the identity and keeps local progress; "New anonymous id" warns
when a typed name is held; the stored id is the code. Still open: "Lost
codes heal" (builder side).

Proposed 2026-10-07, after the maintainer lost "AvatarCoco ·110A": a new
browser got a new random name (Glassy Jackal), and typing AvatarCoco there
is refused because the old browser's id still holds the claim
(`leaderboards.json` `names`, first claim wins, [scores.md](../scores.md),
"Typed names").

## The problem

There are no accounts. A player is `arcade.clientId`, a random UUID in
localStorage (`assets/feedback.js`); the public player hash `p` and the
name tag ("·110A") come from it (`assets/scores.js`, `ArcadeNames.tag`).
The id is lost with a new browser or device, a private window, cleared site
data, Settings → "New anonymous id", or Safari's 7-day storage limit for
sites not visited. Export/Import (`assets/progress.js`) moves achievements,
bests and daily results, but **not** the id, the typed name or the random
handle, so nothing brings the identity back. The typed name stays claimed
by the lost id until a takedown frees it, and the tag then changes.

## Decision: no accounts

Discussed 2026-10-07. Accounts would break the teacher promise ("free, no
accounts"; classroom mode leaves no trace; many students are under 13,
which brings COPPA / GDPR rules for minors), need password storage and
resets the Apps Script + Sheet backend isn't built for, and "Sign in with
Google" means holding emails, a privacy policy, and school networks that
block third-party logins. Revisit only if a community feature truly needs
them, and then sign-in stays optional and never needed to play.

## Proposal: a recovery code

The id already *is* the identity, so let the player carry it.

- **Save**: in the 🏆 Records panel and the Records view, next to the name
  controls, "Save your leaderboard identity". Shows the code (the client id,
  maybe grouped for reading) with Copy, and one line: "Anyone with this
  code can play as you. Keep it like a password."
- **Restore**: "Use a saved code" on a new browser: paste, check the
  format (UUID), confirm ("Your scores and name on this browser will be
  replaced by the saved ones"), set `arcade.clientId`, reload. The hash,
  tag, typed name claim and published bests come back with it; the typed
  name and random handle are re-read from the next build's `names`.
- **Export**: also add `clientId`, `name` and `handle` to the export file
  as an opt-in checkbox ("include my leaderboard identity"), so one
  export/import moves everything. Same warning.
- **Classroom mode**: both hidden (like the name controls), so students
  don't swap codes.

No backend or Apps Script change: rows already carry `client_id`; the
builder keys on the hash. No new data is collected.

## Making people use it (added 2026-10-07)

Many players will want to keep a name without an account; the code only
helps if they save it. Fold these into the build:

- **Offer it at the right moment**: right after a name is typed and
  accepted, a callout "Keep AvatarCoco on other devices: save your code".
  Players who never type a name never see it.
- **Words, not hex**: show the code as ~6 random words
  (`maple-otter-rocket-violet-harbor-seven`), easy to note or read off a
  phone, still unguessable. New ids would be generated as words; existing
  UUIDs keep working and show as they are.
- **No player-chosen secret**: a chosen word ("coco123") is guessable,
  and the public hash `p` comes from the id, so names could be taken by
  offline guessing. Generated words only.
- **Lost codes heal**: free a typed name automatically when its id hasn't
  played for several months (builder side, `scripts/build-leaderboards.mjs`),
  so a lost name comes back without a takedown.

## Open questions

- Restore over an id that already has bests and a claim: replace (simple,
  with the confirm) or merge local bests first (they're per browser anyway;
  the published boards keep both hashes' scores apart)?
- Should "New anonymous id" warn when a typed name is held ("You'll lose
  AvatarCoco ·110A unless you saved your code")?
- A shorter code is friendlier but the UUID is what's stored; a short code
  would need a server lookup. Keep the UUID.

## Interim (until built)

To re-claim a lost typed name now: add the old hash to
`data/name-takedowns.json` (frees the name at the next hourly build), then
type the name again in the new browser; the tag changes. AvatarCoco's old
hash: `0ynf7621rzn7n4` (2026-10-06).

## Ready prompt

```
Build the recovery code from docs/ideas/identity.md in one PR, so a player keeps their leaderboard name and tag across browsers without accounts. Read CLAUDE.md first and follow it.

1. Read docs/ideas/identity.md, docs/scores.md ("Typed names", per-browser keys), docs/gallery.md (Records panel, Records view, classroom mode, Per-browser storage), assets/name-ctl.js, assets/progress.js and assets/feedback.js (clientId).

2. Build: "Save your leaderboard identity" (show the code, Copy, the password warning) and "Use a saved code" (paste, validate, confirm, set arcade.clientId, reload) in the shared name controls (assets/name-ctl.js, so the 🏆 panel and Records view both get it), offered in a callout right after a typed name is accepted, with the code as generated words (see "Making people use it"); an opt-in "include my leaderboard identity" in Export, applied on Import with the same confirm; hidden in classroom mode. Decide the open questions in the brief and say what you chose.

3. Accessibility and wording: names on every control, a 3:1 focus ring, keyboard alone, light and dark, {tap}/click by device where the gallery does; the code field is read-only and selectable.

4. Tests: node scripts/validate.mjs, node scripts/smoke-gallery.mjs (add: save a code in one browser context, restore it in a fresh one, the tag and best come back; a bad code is refused; hidden in classroom mode), node scripts/a11y-audit.mjs --gallery (all pass).

5. Update docs/scores.md and docs/gallery.md (how it works, storage keys, export format version), mark the brief built in docs/ideas/README.md, add to docs/findings.md if anything is new. Push, open the PR (template checklist), watch CI until green.

6. End with the handoff (at most 5 lines).
```
