# Accessibility audit

Run on **2026-10-05** (`teachers.md`, idea 6), after the gallery fixes;
label column and Rail Yard's keyboard rerun after the canvas-label batch;
rows for Rail Yard, Aqueduct and Counterfeit Scale rerun 2026-10-07.
Rerun the audit with:

    node scripts/a11y-audit.mjs            # everything, ~2 min, one line per target per check
    node scripts/a11y-audit.mjs <id> ...   # some games
    node scripts/a11y-audit.mjs --gallery  # gallery side only (what CI runs)
    node scripts/a11y-audit.mjs --table    # also prints the rows below

The script's own output has the details (colours, ratios, which text). It
exits 1 only if a gallery-side check fails. Game rows are reports: each game
fixes its own row in a revision PR (lines in `docs/games/<id>.md`, "Open
ideas", and in `ideas/teachers.md`, idea 6).

## The checks

| check | what passes |
|---|---|
| motion | With `prefers-reduced-motion: reduce`, the screen is still while idle, or the game reads the setting and moves less. Gallery: no running animation or transition. |
| contrast | Every text is WCAG AA against what the screenshot shows behind it (4.5:1, large text 3:1): DOM text and every canvas `fillText`. Gallery: light and dark, phone and desktop, every cabinet panel, plus form-field borders (3:1). |
| colour | The screen's main colours, simulated for deuteranopia and protanopia: no two clearly different colours (ΔE ≥ 20) merge (ΔE < 7). Fail: both cover ≥ 0.5% of the screen. Partial: ≥ 0.2%. |
| keyboard | Games: keys reach every verb (hand-checked table `KEY_COVER` in the script; a changed `keyboard` line asks for a recheck) and the game doesn't keep Tab. Gallery: Tab reaches every control with a focus ring of 3:1, a card opens with Enter, Play puts focus in the game, Shift+Tab leaves it. |
| label | Games: the main canvas has `role="img"` and an `aria-label` naming the game and its verbs. Gallery: every control, frame and dialog has a name; `lang` and `<main>`. |
| text | Smallest text at 360×740 (DOM and canvas, CSS px): pass ≥ 12 px, partial ≥ 10 px. |

Motion numbers (share of the screen changing while idle) vary between runs
with what the audit's taps started; "ignores the setting" is the finding.
When the moving thing is the game itself (Murmuration's flock: 0.00% idle
motion with the birds hidden), "reads the setting, motion unchanged" is
the honest end state, not a fix still owed.

## Results

| | motion | contrast | colour | keyboard | label | text |
|---|---|---|---|---|---|---|
| gallery | pass | pass (fixed) | pass (daily button fixed 2026-10-06) | pass | pass | pass (fixed) |
| cabinet | pass | pass | pass (stars fixed) | pass | pass | pass (fixed) |
| teacher page | pass | pass (fixed) | pass | pass | pass | pass |
| classroom note | pass | pass | pass (daily button fixed 2026-10-06) | pass | pass | pass |
| topic download | pass | pass | pass | pass | pass | pass |
| class challenge | pass | pass (2026-10-07: text under the sticky Play bar no longer sampled) | pass | pass | pass | pass |
| offline index | pass | pass | pass | pass | pass | pass (13.6 px) |
| murmuration | partial (v6: reads it; all idle motion is the flock) | pass (v6: backings) | pass | pass (v6: cursor, hold Space, X) | pass (v6, live region) | pass (v6) |
| orbit-garden | pass (v8: reads it; petals still. The old pass was timing: petals spin only after a bloom, 0.00% with planets hidden) | pass (v8: hint backing) | pass (v8, late screens too) | pass (v8: cursor, Enter places, Space aims and flings, N jumps) | pass (v8, live region) | pass |
| wildfire-line | pass (v4) | pass | pass (v4: lightness bands) | pass (v4: cursor) | pass (v4) | pass |
| ant-trails | partial (v7: reads it; legs and raindrops still; all idle motion is the ants and scent) | pass (v7: backings) | pass (v7, late screens too) | pass (v7: cursor, hold Space trail, hold W wash) | pass (v7, live region) | pass (v7) |
| hourglass-delivery | pass (v5: reads it; stripes, dust, knock ring still. Mid-round partial by design: the glasses are the motion, 0.00% hidden) | pass (v5: backing) | pass (v5: missed = ×, late screens too) | pass (v5: cursor, hold Space pours, K + arrow knocks, G/L jumps) | pass (v5, live region) | pass |
| hot-iron | pass (v6: reads it; no sparks or shake. The old pass was timing: a burning bar throws sparks, 0.18% → 0.11% = sparks hidden) | pass (v6: backing) | pass (v6: a mark per heat band + a lightness jump at the crack line, late screens too) | pass (v6: segment cursor, hold Space heats, Enter/H strikes, O next off the outline) | pass (v6, live region) | pass |
| island-census | pass | pass (v3: backings) | pass (v3: lightness bands + shape) | pass (v3: cursor, F fences) | pass (v3, live region) | pass (v3) |
| loom | pass (v4: reads it; no shake, flash, blink, lint. The old pass was a state pass: a settled net is 0.00% idle either way) | pass (v4: backing) | pass (v4: lightness step at the warning line, crossbars over the snap line, thick ring near popping; late screens too) | pass (v4: knot picker, C corners, Enter/P pins, hold Space + arrows pull) | pass (v4, live region) | pass |
| terrace-garden | pass (v4: reads it; no sway, splashes or drift, rings still. Mid-garden partial by design: the water is the motion, 0.00% hidden) | pass (v4: backings) | pass (v4: plant states by lightness + droop/bubbles/petals, gates by lightness + bar; late screens too) | pass (v4: hold ← → tilts, ↑ ↓ pick a gate, Enter/G or 0–4 open/shut, S status) | pass (v4, live region) | pass (v4: "spring" was 9.4 px on late screens) |
| tidewright | pass (v3: reads it) | pass (v3: backings) | pass (v3: shape + lightness) | pass | pass (labelled) | pass (v3) |
| pressure-grid | pass | pass (v11: lightness bands) | pass | pass (v11: cursor, S pours) | pass (v11, live region) | pass (v11) |
| rail-yard | pass | pass | pass | pass (v3: Space picks a car) | pass (labelled; live region `#msg`) | pass (v4, 2026-10-07: "Run 0" was 11.5 px; pills, speed and mouse-only switch letters 12 px+ on every yard) |
| aqueduct | pass | pass | pass | pass | pass (v8, 2026-10-07: live region) | pass |
| bubble-glass | pass (v7: reads it; glows, pulses, chevrons, rings still. Mid-pour the sand is the motion, 0.04–0.06% → 0.00% hidden) | pass | pass (v7: glass, vent, a melting shard and bubble states by lightness + checkers/dashes; the old pass was by area: glass 84 and vent 81 sat in sand's 69–85; late and held screens too) | pass (v7: T switches arrows to a cursor, hold Space melts, Enter/X shatters, G/B/H jumps, I status) | pass (v7, live region) | pass |
| mycelium | pass (v4: reads it; spore glow, fading blink, rings and a pulse's run still. Mid-season partial by design: the network is the motion, 0.26% → 0.02% hidden) | pass (v4: backings) | pass (v4: fed / fading / rotting knots by lightness + ring and spots, mould by diamonds and dark-cored threads, caps out of the patch's band; late screens too) | pass (v4: hold X cuts, Enter on soil grows from the nearest knot, N/H jumps, I status) | pass (v4, live region) | pass (v4: "×12" was 8.5 px on late screens) |
| lighthouse-keeper | partial (v4: reads it; swell, surf, blinking, flare burst still. Mid-night the old file failed, 1.2–2.1%; decoration 0.5% → 0.00%, 0.02% with ships and fog hidden: the rest is the game) | pass (v4: backings; the flare's cost was 2.3:1 while charging, off the audit's screen) | pass (v4: seeing vs blind by lightness, wreck cross, heavy hold, lamp state in words; late screens too) | pass (v4: N next ship in the dark, I status, Enter next night) | pass (v4, live region) | pass (v4: "harbour" was 8.5 px) |
| counterfeit-scale | pass | pass (v4: empty tray-slot numbers were ~2:1 after a load) | pass | pass | pass (v4, 2026-10-07: live region for weighings) | pass (v4: weighing log 11 px and spring dial 10 px, both after a weighing, now 12 px) |
| coat-check | pass (v4: reads it; reshuffle rattle drawn still) | pass (v4: letters 7:1, late shifts too) | pass (v4: colours in lightness steps, returned = badge) | pass (v4: + I status) | pass (v4, live region that never holds the memory) | pass (v4: 12 px+) |
| surprise-party | pass (v4: reads it; no pulse or growing ripple. The old pass was a state pass: only a warning screen moves, 0.10% → 0.00%) | pass | pass (v4: rings, hat outlines, zone stripes by lightness; late screens too) | pass (v4: tile cursor, Enter whispers, hold O doors, G/D/B jumps) | pass (v4, live region) | pass (v4) |
| geode | partial (v3: reads it, decoration still; what moves is growth; 2/3 runs pass) | pass | pass (v3: near-grey anneal zone, late screens too) | pass (v3: T switches arrows to a cursor, S seeds, hold C cleaves) | pass (v3, live region) | pass (v3) |

Label: every game passes since the canvas-label batch (2026-10-05; Wildfire
Line in v4): the main canvas has `role="img"` and a label set at load
with the game, its verbs and its keys, saying "click" with `(pointer:
fine)` and "tap" otherwise (the audit's note "says tap on PC" reads the
phone context, where "tap" is right). The static attribute stays as a
"tap or click" fallback. Since 2026-10-07 every game has a live region
(status text in the DOM, `role="status"`; Aqueduct v8 and Counterfeit
Scale v4 were the last), and every game's row is pass, or partial by
design where the moving thing is the game itself. New games and
revisions build one in ([adding-a-game.md](adding-a-game.md),
"Classroom and accessibility").

## Fixed in the gallery (audit PR)

- Light theme `--accent` `#0a84c6` → `#006fa6` (3.7:1 → 5.0:1 on the page;
  links, "Updated" pills, the teacher page); `--good` `#1f8a4c` →
  `#1a7a43` (status text 4.0 → 4.9:1); `--star` `#e0a100` → `#a87700`.
- Form fields (search, sort, board picker, name, classroom link, teacher
  form, comment box) get their own `--field-border` (3:1 or more in both
  themes; the shared `--border` was 1.3:1).
- Rating stars: hollow when off, filled when on, so they differ by shape
  and not only colour; the off outline is 3:1.
- Text under 12 px at phone width raised to 0.75rem: card pills, topic
  kind labels, continue-row meta, the 🏆 count, the toolbar version,
  the plays table head, Spotlight chips.

## What the audit can't see

Screen-reader announcements during play, whether a colour carries meaning
(it flags merging colours; the game's notes say if they matter), touch
target sizes inside games, and anything after the first few seconds of a
round. A real screen reader and a real colour-blind player are still the
test.
