# Findings: Time pressure and input

Part of the findings checklist; index, evidence tags and how to add one in
[../findings.md](../findings.md). The full story behind each rule is in
[../findings-log.md](../findings-log.md) under the heading in *italics*
(grep it, don't read the whole log).

- A decay rate (or a bleed that undoes actions) turns a puzzle into a speed
  test: sweep the bot's action rate; charge decay per action when decisions
  should matter more than speed. An action budget doesn't fix it while a
  passive system undoes actions over time. *A decay rate turns a puzzle into
  a speed test.* Orbit Garden, Pressure Grid. bots; players (n=1) agree.
- Sweep the action rate even when every verb costs a resource: anything
  that regrows on a clock (a rival right after a cut) makes it a race; give
  it a rest after each setback. *A real-time rival turns a budget game into a
  speed test.* Mycelium. bots.
- For hold verbs, sweep reaction lag separately from think time, and keep
  the held value's rate of change slow next to a ~0.3 s human reaction.
  Keep every warning-to-failure delay above reaction time. *Sweep reaction
  time apart from think time.* Hot Iron, Loom. bots.
- Every input device must reach every verb. *A still screen that's still
  winnable reads as broken.* Terrace Garden. players (n=4).
- An idle/"stuck" detector must tolerate the input's own noise (tilt,
  settling particles); test it with a noisy bot. *A hint that waits for
  stillness never shows in tilt mode.* Bubble Glass. players (n=2) confirm
  the fix.
- When one press picks between two verbs by a timer (still = hold verb,
  moved = drag verb), give the drag the benefit of the doubt: people rest
  a finger before dragging. Hold ≥ ~350 ms, and let an early drag undo
  the hold verb. *A short hold timer steals the drag verb.* Ant Trails v8.
  players (n=1).
- A verb's danger zone must show past the finger. Measure which rule
  fails (switch each off in a gesture check) before retuning, and keep
  fixes draw-only when the rule is the balance brake. *A lure you can't see
  scares the flock for no visible reason.* Murmuration v7. players (n=1).
