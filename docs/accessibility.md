# Accessibility audit

Run on **2026-10-05** (`teachers.md`, idea 6), after the gallery fixes;
label column and Rail Yard's keyboard rerun after the canvas-label batch.
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

## Results

| | motion | contrast | colour | keyboard | label | text |
|---|---|---|---|---|---|---|
| gallery | pass | pass (fixed) | pass | pass | pass | pass (fixed) |
| cabinet | pass | pass | pass (stars fixed) | pass | pass | pass (fixed) |
| teacher page | pass | pass (fixed) | pass | pass | pass | pass |
| classroom note | pass | pass | pass | pass | pass | pass |
| murmuration | partial: ignores it, flock moves | partial: counter 3.5:1 | pass | fail: none | pass (labelled) | partial: 10 px |
| orbit-garden | pass | pass | pass | fail: none | pass (labelled) | pass |
| wildfire-line | pass (v4) | pass | pass (v4: lightness bands) | pass (v4: cursor) | pass (v4) | pass |
| ant-trails | partial: ignores it | pass | pass | fail: fast-forward only | pass (labelled) | partial: 11.5 px |
| hourglass-delivery | partial: ignores it | pass | pass | fail: none | pass (labelled) | pass |
| hot-iron | pass | pass | pass | fail: none | pass (labelled) | pass |
| island-census | pass | pass | partial: meadows (deutan, borderline) | fail: none | pass (labelled) | fail: 9.4 px HUD |
| loom | pass | pass | pass | fail: none | pass (labelled) | pass |
| terrace-garden | fail: ignores it | pass | pass | partial: tilt, not gates | pass (labelled) | pass |
| tidewright | pass (v3: reads it) | pass (v3: backings) | pass (v3: shape + lightness) | pass | pass (labelled) | pass (v3) |
| pressure-grid | pass | fail: cell numbers 2.0:1 | pass | fail: undo/restart only | pass (labelled) | pass |
| rail-yard | pass | pass | pass | pass (v3: Space picks a car) | pass (labelled) | partial: 11.5 px |
| aqueduct | pass | pass | pass | pass | pass (labelled) | pass |
| bubble-glass | partial: ignores it | pass | pass | partial: turn only | pass (labelled) | pass |
| mycelium | partial: ignores it | pass | pass | pass | pass (labelled) | pass |
| lighthouse-keeper | partial: ignores it | pass | pass | pass | pass (labelled) | fail: 8.5 px |
| counterfeit-scale | pass | pass | pass | pass | pass (labelled) | pass |
| coat-check | pass | partial: letters 4.3:1 | pass | pass | pass (labelled) | partial: 11 px |
| surprise-party | pass | pass | pass | fail: wait/undo only | pass (labelled) | pass |
| geode | partial: reads it, shimmer stays | pass | pass | partial: thermostat only | pass (labelled) | fail: 9.4 px |

Label: every game passes since the canvas-label batch (2026-10-05; Wildfire
Line in v4): the main canvas has `role="img"` and a label set at load
with the game, its verbs and its keys, saying "click" with `(pointer:
fine)` and "tap" otherwise (the audit's note "says tap on PC" reads the
phone context, where "tap" is right). The static attribute stays as a
"tap or click" fallback. Games with no status text in the DOM
(pressure-grid, aqueduct, counterfeit-scale, coat-check, surprise-party)
have no live region, so a screen reader hears nothing change; that is a
note in their open ideas, not part of the verdict.

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
