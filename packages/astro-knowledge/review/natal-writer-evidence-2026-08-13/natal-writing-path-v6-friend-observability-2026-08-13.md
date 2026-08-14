# Natal writing path V6 — Friend length and observability repair

**Status:** Review-gated evidence only. No candidate in this packet is owner-approved, canonical, served, auto-published, or promoted to the writer.

## Reproduction

The V5 structural measurements reproduce the reported collapse:

- Friend: 132 of 132 passages contained exactly 2 sentences; median 35 words.
- Self: 131 passages contained 4 sentences and 1 contained 3; median 67 words.
- Friend uniqueness: 264 / 264 sentences (100%).
- Self uniqueness: 527 / 527 sentences (100%).
- Six owner-rejected Friend skeleton sentences: 0 occurrences.

The old observability scan did **not** reproduce the owner audit's 66 Friend and 53 Self zero-observable counts. That mismatch was itself the defect: the implementation mixed broad vocabulary and observable actions with nouns, so a paragraph could appear observable without naming a photographable object, place, time, document, message, vehicle, appointment, or named role.

## Gate repair

1. `validatePassageShape` now blocks a Friend passage below four sentences, below 55 words (the deterministic floor for “roughly 60”), or below two distinct observable nouns.
2. Observable nouns are counted distinctly and with simple singular/plural normalization. Actions no longer satisfy the noun floor.
3. The abstract-subject guard first parses the grammatical subject and finite predicate, then rejects a bare abstract quality performing the action. The seven owner-identified V5 misses are regression fixtures.
4. Cross-row exact and near-duplicate gates, shared three-item-series detection, Friend observer-entry checks, and the six banned strings remain blocking.

## V6 result

| Measure | Self | Friend |
|---|---:|---:|
| Sentence-count distribution | 97 × 4; 35 × 5 | 132 × 4 |
| Median words | 69 | 61 |
| Zero-observable rows | 0 | 0 |
| Rows below two distinct observable nouns | 0 | 0 |
| Unique sentences | 563 / 563 (100%) | 528 / 528 (100%) |
| Highest cross-row near-duplicate score | 0.667 | 0.538 |
| Banned Friend strings | n/a | 0 |

All 132 Friend passages remain independently keyed static authoring. The deleted V4 frame builder remains deleted; there is no shared Friend paragraph frame, connector inventory, or closing inventory. Self retained the V5 method: only rows below the new observability floor received a row-specific evidence sentence, and the grammatical-subject fixtures received narrow sentence corrections.

## Workbook contract

`TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V6.xlsx` preserves established columns A:O byte-for-cell against V5. Both owner-verdict and owner-edit column pairs are blank. Deterministic results are labeled as prechecks, never editorial verdicts.

## Governance

- unapproved rows do not serve;
- no approved copy changed;
- no approval state changed;
- no generated serving artifact changed;
- auto-publish remains off;
- writer promotion remains unauthorized;
- PR #219 remains draft.
