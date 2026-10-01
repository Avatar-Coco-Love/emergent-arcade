# Launch post drafts

Link (gallery): https://avatar-coco-love.github.io/emergent-arcade/
Direct game link: `<gallery>#/play/<id>` (e.g. `#/play/terrace-garden`).
Use the `play/<id>/` URL when pasting into a social app so the preview card shows.
Check each community's self-promotion rules before posting. Replace [bracketed] bits.

## Reddit: r/WebGames / r/playmygame (title + body)

**Title:** I made a free browser game where you tilt a hillside to slosh water onto plants (no ads, no download, phone or PC)

Terrace Garden: each plant needs its own depth of water. Tap the spring's valve, open gates between terraces, and tilt the whole hillside to push water where it's needed. Water that spills or leaks is gone for good, so it's a planning puzzle, not a timer. No clock, no way to lose a life.

It's one of 13 small games in an arcade where every game combines 2-3 simple verbs that share one piece of state. They were all designed and written by an AI (Claude) under strict design rules, and I'm trying to find out which ones are actually fun for people.

Play: [link]

What I'd love to know: which garden did you get stuck on, and did tilt feel natural on your phone? There's a feedback button inside each game.

## Reddit: r/incremental_games / r/INDYGAMES variant (Ant Trails)

**Title:** Ant Trails: draw scent trails, survive six days. Day 6 brings a rival colony.

Drag to draw scent trails; ants follow them to crumbs and lay more scent on the way home, so busy routes become highways. Spiders follow scent too (fastest on the strongest trails), and rain washes trails away, including yours. Your colony carries over between days, and each day adds a twist: storms, a second spider, a rival red colony.

Free, runs in the browser, works on phone and PC: [link]

Does day 4 feel fair? That's where I'm least sure.

## Hacker News (Show HN)

**Title:** Show HN: An arcade of 13 browser games designed by an AI under strict design rules

I've been running an experiment: an AI designs and ships small browser games, and every game has to follow one rule. It combines 2-3 orthogonal verbs that share state (e.g. in Bubble Glass, turning a box of sand moves sand down and bubbles up at once, and melting glass changes what each turn does).

The arcade is a static site: each game is a single self-contained HTML file, no build step. Balance is checked with headless seeded bots, and there's anonymous play telemetry and a feedback form. The weak point is that the bots are the only players so far, so I need real people. Where do the bots and humans disagree?

Play: [link]  Notes on what we've learned about shared-state mechanics: [link to docs/findings.md on GitHub]

## Mastodon / Bluesky (short, attach a clip or GIF)

Tilt a hillside to slosh water onto thirsty plants. No clock, no ads, plays on your phone. 💧🌱
Terrace Garden: one of 13 tiny browser games built around shared-state mechanics. Tell me where you get stuck.
[link]
#indiegame #browsergame #webgame #puzzlegame #gamedev

## X (under 280 chars)

I'm testing 13 tiny browser games designed by an AI. Free, no download, phone or PC. Try Terrace Garden (tilt a hillside to water plants) and tell me where you get stuck: [link] #indiegame #browsergame #puzzlegame

## itch.io (page description)

**Short:** A tilt-and-tap water puzzle in the browser. No clock, no lives.

**Body:** Terrace Garden is part of Emergent Arcade, a set of small games where two or three simple verbs share one piece of state. Open the spring, open the gates, and tilt the hillside so every plant gets its own depth of water. Water you lose never comes back. Plays on phone (tilt the phone) or PC (← → keys). Feedback button inside every game.

## Friends and group chats (personal, the best-converting one)

I made some little browser games and I need honest testers. Could you play [game] for 5 minutes on your phone, then tell me where you got stuck or bored? The link is [link]. There's a rate and feedback button inside the game.

## Reply templates

- Someone asks "who made this?": Designed and written by Claude (an AI) with me steering. Source and design notes are in the repo: [link].
- Someone reports a bug: Thanks! Which game, device and level? I'll look at it today.
- Someone says it's too easy/hard: Which level or day? Telemetry shows me where people quit, but not why.

## Posting order

1. Friends/group chats first, to catch obvious breakage.
2. Mastodon/Bluesky/X the same day, with a 10-15 s screen recording.
3. Reddit (one sub per day, with a reply to every comment for the first 2 hours).
4. Show HN last, once you've fixed whatever the first wave found.
