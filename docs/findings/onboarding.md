# Findings: Onboarding and readability

Part of the findings checklist; index, evidence tags and how to add one in
[../findings.md](../findings.md). The full story behind each rule is in
[../findings-log.md](../findings-log.md) under the heading in *italics*
(grep it, don't read the whole log).

- The first round is a hook, not a test: if a novice bot's first round
  takes over ~40 s, add a warm-up or a speed-up. *Onboarding: the first
  round is a hook, not a test.* Ant Trails. feedback (n=1).
- If a round can reach a still state that only an unknown verb breaks, show
  that verb then, or end the round. *A still screen that's still winnable
  reads as broken.* Terrace Garden. players (n=4).
- If success depends on a threshold in a continuous display (a colour, a
  level), show the threshold where the player acts. More lives don't teach
  an invisible rule. *A player can know the verbs and miss the moment.* Hot
  Iron. players (n=1).
- A hint needed before the first move is on screen from the start; every
  hint has a minimum time on screen. *A hint that waits for stillness never
  shows in tilt mode.* Bubble Glass. players (n=2).
- Messages get their own strip, never drawn over the play area, and the
  layout refits on every level change, not only on resize. Screenshot
  every level at phone sizes (portrait and landscape) with a hint showing.
  *Text over the board and a stale fit read as broken.* Rail Yard.
  feedback (n=1).
- Check telemetry for a verb nobody uses: a median of 0 for its count on
  every level means players never found it, whatever the bots say. Hint
  it at the moment it pays, once, and watch the count. *A second verb
  nobody finds.* Ant Trails. players (n=5).
