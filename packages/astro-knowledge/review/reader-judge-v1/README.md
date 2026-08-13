# Reader judge v1

Status: **closed as a failed calibration experiment**. The reader is not active in drafting,
review, approval, blocking, revision, staging, promotion, serving, or reading-order workflows.

Owner-adopted source: `TLDR-Reader-Judge-Spec-v1.md` (2026-08-13). Canonical repository copy:
`docs/writing/READER_JUDGE_V1.md`.

Standing governance, verbatim:

> the reader is advisory forever; prose judgment is an owner gate by design.

The reader receives one rendered page as its sole task input. The instruction packet contains the
merged owner-feedback evidence and owner-approved register gold, but no meaning plan, source notes,
drafting context, or astrology reasoning. It returns only the strict flag-list schema. There is no
verdict field and its output cannot approve, block, revise, stage, promote, or serve copy.

## Evidence ingestion

- Mined owner feedback: 44 rows / 31 mined categories.
- Existing owner corrections: 20 rows.
- Exact duplicate `bad` text values: 7.
- Combined unique corrections: 57.

## Live calibration round 1

- Model: `gpt-5.6-terra`
- Reasoning effort: `medium`
- Calls: exactly 19, one per rendered page, no retries; authorization consumed.
- Owner-approved pages: 7.
- Known-bad reverted Mercury V7 pages: 12.
- Output artifacts: `live-calibration-round-1.json` and `live-calibration-round-1.md` in this
  directory.

The owner-approved set is Saturn in Capricorn, Sun in Leo V3, Venus in Libra, the published Saturn
in Aries article, and Lilith V5 Aries, Libra, and Sagittarius. The Venus in Libra target allows at
most one low-confidence flag and no medium- or high-confidence flag.

Round 1 met the stated density target: all seven owner-approved pages received zero flags; every
known-bad Mercury V7 page received at least three flags, averaging 7.08; Venus in Libra received
zero flags. Actual usage was 283,781 tokens across the 19 calls (278,467 input and 5,314 output,
including 369 reasoning tokens and 251,568 cached input tokens).

## Live calibration round 2 and closeout

Round 2 was the blind test. It used the frozen Round 1 prompt, schema, model, reasoning effort,
category definitions, and evidence packet for exactly 56 calls with no retries. The complete
manifest, provider results, human correction-precision sample, category analysis, reading order,
and unimplemented `POSSIBLE_V2_JUDGE_CHANGES` are preserved in
`live-calibration-round-2-manifest.json`, `live-calibration-round-2.json`, and
`live-calibration-round-2.md`.

Owner verdict, verbatim (2026-08-13):

> two blind rounds show Reader Judge v1 cannot distinguish owner-approved prose from near-miss prose (4.3 vs 3.25 flags per page, inverted), cannot detect owner corrections (before greater than after in 2 of 15 pairs), and returns 39 useful flags per 100. Round 1's perfect score measured recognition of its own study material, not judgment. Prose judgment remains an owner gate, permanently. No further calibration spend is authorized.

The 39 flags annotated `CORRECT` remain preserved under
`live-calibration-round-2.json.analysis.human_annotation.flags` as evidence of categories that may
be learnable. They do not grant Reader Judge v1 authority and are not automatic rewrite rules.

The 57 deduplicated owner corrections remain in `data/writing/owner-feedback-corpus.jsonl` as
drafting evidence. Closing the judge does not reduce the authority or usefulness of that owner
feedback corpus.
