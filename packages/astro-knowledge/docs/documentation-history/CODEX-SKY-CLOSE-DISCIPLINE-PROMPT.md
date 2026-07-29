# Codex prompt: close out the sky generation loop (close-discipline fix)

The judge and calibration are done and correct — the first live audit proved it:
the one card it auto-published (Venus square Mars) is clearly the strongest of
ten, and every rejection cites a specific, right reason. Do NOT touch the judge,
the calibration gate, or the linter. The remaining problem is entirely on the
GENERATOR, and it is two named behaviors, not vague quality:

1. **Pre-close aphorism** (7 of 10 rejects). The model writes a good final catch,
   then pads a generic summarizing maxim in the sentence *right before* it. The
   closing-discipline edit tightened the very tail, so the linter's stacked-closer
   check passes — the maxim just moved up one slot where only the judge sees it.
   That is why the queue moved 14→13 instead of dropping.
2. **Invented scenarios** (2 of 10). The three-example beat becomes mini-stories
   with actors ("someone pitches...", "a friend's gesture...") instead of terse
   noun-phrase fragments.

**Do not fix this by adding more prohibitions to `buildPrompt`.** The ANTI-PATTERNS
block (`scripts/generate-sky-aspect-cards.js` lines ~177–190) already forbids both,
and the model ignores it under generative pressure. The lever is demonstration
plus a deterministic backstop. Two changes:

## Change 1 — few-shot the close and the example beat (in `buildPrompt`)

Add a `closeFewShot()` block to the prompt (alongside the existing `fewShot()` at
line ~135) built from real before/after pairs from the live audit. Keep it short;
these are shown as demonstrations, not rules. Trim the ANTI-PATTERNS bullets down
rather than adding to them.

Pre-close aphorism — BEFORE → AFTER (the close is the LAST TWO sentences; every
sentence before them must be concrete narration, and the second line must turn on
the first):

- BEFORE: "...Being unique is real currency, but chasing shock value empties it
  fast. True originality lasts. The performance burns out quick."
  AFTER: "...The room rewards the version of us that's just strange enough.
  Standing out is real currency. Spend it on shock and it empties by morning."
- BEFORE: "...Luck comes on strong, but so does the urge to test it past reason.
  Optimism makes big things possible. It also makes a fall feel like it shouldn't
  happen at all."
  AFTER: "...The right doors keep opening on the first push. Luck comes on strong.
  It never stays long enough to cover a bet made on the strength of it."

Invented scenario — BEFORE → AFTER (terse fragments, no actors, no verbs of a
person doing a thing):

- BEFORE: "someone pitches a wild idea and the group actually listens, a friend's
  big-hearted gesture lands softer than expected, the plan for tonight slides into
  a dreamier version before anyone objects"
  AFTER: "a wild pitch that suddenly has the room, a kindness that lands softer
  than usual, tonight's plan drifting toward the dreamier version"

Keep-as-model (the card that passed) — cite Venus square Mars as the positive
example both for the beat ("a message left on read, a plan changed mid-sentence,
the extra shift agreed to before anyone knows why") and the close ("The urge is
real. The timing is not.").

## Change 2 — add a deterministic close-trim micro-pass (the backstop)

Add a `trimClose(text)` step inside `generateCard`'s retry loop, AFTER `generate()`
returns and BEFORE `lintCard(text)` (around line ~363–365). It is one cheap,
cold-temperature (`{ temperature: 0.1 }`) LLM call whose ONLY job is a single
optional deletion — it must not rewrite:

> "Here is a finished card. If its final paragraph ends with TWO general maxims in
> a row (a summarizing lesson, then another lesson), delete the FIRST of the two so
> the card ends on a single truth and the catch that turns on it. Change nothing
> else — do not reword, do not add. If the card already ends on one truth and its
> catch, return it byte-for-byte unchanged. Return only the card."

Give it one before/after example in its own prompt. Because it can only delete the
penultimate maxim, it is low-risk; the lint + judge gates still run on its output,
so a bad trim is caught, not shipped. If lint or judge still fail, the existing
retry loop regenerates as before.

## Re-run and report

- Re-run generation for the 13 held review drafts (same PATCH-existing-row path
  you already added; no new migration).
- Report: queue movement (how many of 13 now score 3), the judge's reason string
  for any that still sit at 2, and how often `trimClose` actually fired vs passed
  through unchanged (so we know whether the win came from the few-shot or the trim).
- Keep the calibration untouched and re-confirm it still passes the separation gate
  (0 off-voice, 0 weak passed, exemplar−weak ≥ 1.5). Do NOT loosen the judge to
  make the queue drop — a smaller drop with an honest judge is the correct outcome.

## Guardrails

- No changes to `judge-sky-voice.js`, `test-judge-calibration.js`, or
  `lint-sky-voice.js`.
- No social/friends code, no schema changes.
- If `trimClose` measurably helps, note it — it is the same backstop we will reuse
  on the You/Friends surfaces, so its hit-rate here is worth knowing.
