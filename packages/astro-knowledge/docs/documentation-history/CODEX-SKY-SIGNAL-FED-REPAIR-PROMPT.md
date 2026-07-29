# Codex prompt: signal-fed repair (replace the trim, rotate the golds)

The last run collapsed the problem to one point: 11 of 12 remaining rejects are
the same defect — the model appends a generalizing/moralizing line instead of
ending on one concrete truth. It survived the prohibition wall, the few-shot, and
the trim. Two side-findings from your run tell us how to fix it:

- The literal few-shot examples CONTAMINATE content (Sun–Jupiter copied "Standing
  out is real currency" verbatim). Concreteness helped; singularity hurt.
- The blind `trimClose` fired on 8/13 and moved none to 3 — it deletes the wrong
  structural unit because it is guessing, while the judge already names the exact
  defect in plain words.

Thesis: the pipeline generates rich failure signals (the judge's reason, the
linter's term) and throws them away to blindly re-roll or trim. **Feed the signal
back.** Three changes, all in `scripts/generate-sky-aspect-cards.js`. Do NOT touch
`judge-sky-voice.js`, `test-judge-calibration.js`, or `lint-sky-voice.js` logic.

## Change 1 — rotate REAL gold closes, remove the invented literals

In `buildPrompt` (line ~141) remove the invented before/after close pairs added
last round (they are the contamination source). Add a `closeBank(n = 5)` helper
that, each call, samples n closes — the LAST TWO SENTENCES — from the 17 gold
exemplars in `examples.json`, randomized per call. Show them as "here is the range
of good closes" demonstrations, not rules. Variety is the point: many real closes
across different aspects give the model the pattern with nothing single to copy.
Keep at most ONE plain structural line ("end on one concrete truth, then a catch
that turns on it") — the demonstration does the work, not the rule.

## Change 2 — replace `trimClose` with judge-guided repair

Delete the `trimClose` micro-pass. In `generateCard`'s flow, after the judge
returns, if `result.judge.score === 2`, run ONE repair pass (never a loop):

`repairCard(text, reason)` calls `generate(prompt, { temperature: 0.1 })` with:

> "A careful editor flagged this card: '{reason}'. Fix ONLY what the note
> describes. End on one concrete truth and the catch that turns on it — no second
> aphorism, no advice. Change nothing else: do not reword the rest, do not add
> length. Return only the corrected card."

where `{reason}` is the judge's own `why`/verdict string. Then re-lint and re-judge
the repaired text. Publish rules:
- repaired card scores 3 → publish it.
- repaired card still 2 (or worse) → keep whichever of {original, repaired} scored
  higher and route it to human review.
Repair runs at most once per card, so cost is bounded (one extra generate + one
extra judge on borderline cards only).

## Change 3 — signal-fed lint retry (fixes the Mars–Saturn loop)

Today a lint failure re-rolls blindly, so Mars–Saturn kept re-emitting "the gift
is"/"the shadow is" for all three attempts. On a lint fail, pass the specific
failed terms into the retry `buildPrompt` as an explicit avoid-list: "Your previous
draft used the banned phrase(s): {terms}. Do not use them or name 'gift'/'shadow'
as labels." Feed the actual `findings[].term` from `lintCard`, not a generic nudge.

## Telemetry + report

Log per card: repair fired (y/n), repair result (2→3, 2→2, unchanged), and lint
retry avoid-terms fed. Then re-run the held review drafts and report:
- queue movement (how many now score 3);
- of the cards repair fired on, how many reached 3 (this is the real signal on
  whether judge-guided repair works — if most 2→3, it works; if not, the ceiling
  below applies);
- a contamination check: grep the new cards for any verbatim gold-close phrase
  (the rotation should make this ~0);
- confirm calibration still passes the separation gate unchanged (0 off-voice,
  0 weak passed, exemplar−weak ≥ 1.5). Do NOT loosen the judge.

## The ceiling (do not chase past it)

If judge-guided repair still leaves a handful at score 2, that is the judge being
correctly strict, not a bug. Every residual defect is the LAST LINE, so the human
step is a ten-second one-line edit, not a rewrite. The goal is "repair clears most,
humans polish one line on the rest" — not 17/17 auto-publish. Report the number
and stop; we decide the human-polish routing separately rather than tuning the
generator indefinitely.

## Guardrails

- No changes to judge, calibration, or linter logic (reading `judge.why` is fine).
- Remove `trimClose` entirely.
- No social/friends code, no schema changes.
- `repairCard` and the rotating close bank are the reusable pieces for the
  You/Friends surfaces later, so keep them cleanly factored.
