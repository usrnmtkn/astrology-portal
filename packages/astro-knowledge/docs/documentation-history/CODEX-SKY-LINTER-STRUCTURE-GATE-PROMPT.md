# Codex prompt: harden the linter's structure gate + pull the bad LIVE card

The signal-fed repair run settled the generation question: repair moved 0 of 11
cards, so we stop tuning the generator (per the handoff ceiling). But the run also
exposed a real integrity bug that IS worth fixing: **the judge passed a
structurally-broken card to LIVE.** Sun conjunction Jupiter has three paragraphs
and two closing pairs and still cleared both gates. A wrong card is public.

The fix is not to touch the judge or calibration. It is to move STRUCTURAL checks
to the deterministic linter, where they cannot flicker, and leave the stochastic
judge for voice/taste only. Two changes, both in `scripts/lint-sky-voice.js`, plus
one data correction.

## Change 1 — paragraph count becomes a hard fail (not an advisory note)

Today (`lint-sky-voice.js` ~line 128-129) paragraph count is pushed to `notes`,
and notes do not affect the score. The template is exactly two paragraphs. Make a
paragraph count other than 2 a `fail` finding, not a note:

```
const paras = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
if (paras !== 2) {
  findings.push({ severity: "fail", source: "shape", term: "paragraph-count",
    match: `${paras} paragraphs`, reason: "the card template is exactly two paragraphs" });
}
```

Verify the 17 canonical exemplars still lint 3/0 afterward (they are all two
paragraphs, so they must). This single change would have blocked Sun–Jupiter.

## Change 2 — catch the double closing pair

The stacked-ending check catches 3+ short closers, but Sun–Jupiter ended with TWO
truth+catch pairs (four closing sentences, two of them a self-contained maxim pair
before the real close). Add a warn when the final paragraph ends with two separate
short "landing" pairs: i.e. within the last 4 sentences there are two runs of
<=11-word sentences separated by a longer one, OR four consecutive <=13-word
sentences at the tail. Keep it a warn (drops score to 2 -> human review), not a
fail — this is a softer heuristic and we do not want false fails on genuine
one-pair closes. Confirm the 17 exemplars still pass (single-pair closes must not
trip it).

## Change 3 — pull the bad LIVE card back to review

Sun conjunction Jupiter is LIVE but structurally broken. Re-lint it with the
hardened linter (it will now fail on paragraph count) and move it back to DRAFT /
human-review so it is no longer served. Do not hand-edit it to LIVE; it goes
through the same gate as everything else.

## Do not

- Do not change `judge-sky-voice.js`, `test-judge-calibration.js`, or the
  calibration harness. (Calibration cannot be re-run anyway — Vercel redacts the
  model key from CLI — and the code is unchanged, so the last valid run stands:
  0 off-voice, 0 weak passed, separation 1.82. Do not relabel it as a fresh run.)
- Do not tune the generator further. The remaining ~10 cards are the human
  one-line-polish workflow now, not another generation iteration.

## Report

- Confirm 17/17 exemplars still lint 3/0 after both linter changes.
- Confirm Sun–Jupiter now lints as a fail and is back in review.
- Report the new queue state (LIVE count should drop by one; that is correct, not
  a regression).
