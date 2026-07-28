# Codex prompt: fix the placement generator's labeled-close seam

Placement calibration PASSED on `openai/gpt-4.1` (gold 3.00, weak 1.00, separation
2.00). The judge is trustworthy. But the 5-card production sample exposed one
systematic generator tic worth fixing before deploy:

3 of 5 samples (Sun-Leo, Mercury-Cancer, Venus-Virgo) scored 2 for the SAME reason -
they label the close with literal headers: **"The truth: … The catch: …"**. That's
our internal shape description ("one truth and its catch") leaking into the copy as
scaffolding, the same class of defect as the already-banned "the gift is / the
shadow is" seam. The 2 cards that scored 3 (Moon-Capricorn, Mars-Gemini) don't use
standalone labels. Moon-Capricorn is the model close:

> "You can't organize yourself out of needing care. You just end up running on empty with a perfect record."

...states the truth and its catch as plain sentences, no labels. That's the target.

Placement-mode only. Do NOT change aspect-card behavior, the judge, or calibration.

## 1. Linter (placement mode output bans)

Add FAIL bans for the label forms (case-insensitive), scoped to placement mode:
- `\bthe truth\s*[:?]`   (catches "The truth:" and "The truth?")
- `\bthe catch\s*[:?]`   (catches "The catch:")
- `\bthe catch is this\b`
Add WARN for the softer labeling creep so it surfaces without hard-failing:
- `\bthe challenge is\b`, `\bthe downside is\b`, `\bthe gift is\b` (already), `\bthe shadow is\b` (already)

Confirm the 5 approved golds still lint 3/0 in placement mode (none of them label
the close, so they must pass).

## 2. Prompt (placement generator)

Add one anti-pattern, by demonstration not prohibition:
- BAD (do not do this): "...measuring worth by reaction. The truth: we want to be seen for what is real. The catch: if you build yourself on applause, you'll always need a crowd."
- GOOD (state it plainly, like the gold): "...measuring worth by the reaction instead of the work. Being seen for something real is the whole point. Build yourself on applause and you'll always need a crowd."
Make explicit: the words "truth" and "catch" describe the SHAPE of the close for us -
they must never appear as labels in the card. State the truth and its catch as two
plain sentences. Do not announce the turn with any label ("The truth", "The catch",
"The challenge is", "The downside is").

## 3. Regenerate + re-audit

Re-run the 5 current-sky placements through generate -> lint(placement) -> judge.
Report the new scores and the cards verbatim. Target: the 3 that were 2 clear to 3
once the label is gone. Also fix the "build your self" -> "yourself" artifact if it
recurs. Keep `SKY_PLACEMENT_JUDGE_CALIBRATED` false until the sample reads clean and
the owner signs off.
