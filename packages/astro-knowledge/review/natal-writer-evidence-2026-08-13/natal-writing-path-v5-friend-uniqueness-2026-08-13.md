# Natal writing path V5: Friend cross-row uniqueness repair

Date: 2026-08-13

Scope: WP-1 Batch 01, 132 natal-aspect-exact review candidates

Status: review-gated evidence only; not owner-approved, canonical, imported, served, auto-published, or promoted

## Reproduced V4 failure

The V4 artifact contains 528 Friend sentences but only 123 distinct sentences after normalizing the `Name` token. The unique-sentence ratio is 23.30%. Of the 528 sentence occurrences, 489 (92.61%) belong to an exact-repeat group. Self contains 527 sentences and all 527 are unique.

The most frequent V4 Friend repeats occur 39, 34, 33, 26, 14, and 14 times. Those six owner-rejected sentences are now explicit banned fixtures.

Root cause: the V4 Friend builder assembled each passage from shared opening, role-action, aspect-middle, second-pressure, and closing inventories. Pairwise Self/Friend checks could not see reuse between different Friend rows, and the cadence check inspected only passage openings and closings.

## Blocking gate repair

`validateCrossRowUniqueness` now runs on both Self and Friend batches. It fails a batch when:

- a normalized sentence occurs in more than one row;
- two sentences from different rows exceed 0.85 token edit similarity;
- the same three-item example series appears in rows with different mechanisms; or
- a banned Friend skeleton sentence appears.

The report includes sentence count, distinct sentence count, unique-sentence ratio, repeated occurrence count/rate, exact groups, near-duplicate pairs, the highest pair score, shared example series, and banned-string findings. The gate is suite-wired.

The abstract-subject check no longer relies on the former noun vocabulary. It evaluates the grammatical subject/predicate construction. The four owner fixtures now fail deterministically: `Desire makes`, `Curiosity keeps supplying`, `Trust can speed up`, and `Feeling and reason cooperate`. Those four Self passages were re-authored from their mechanisms. The cross-row gate also found one pre-existing Self pair at 0.889 (`stepping away from advancement` / `stepping away from status`), so the Pluto-opposite-Midheaven sentence was independently revised.

## Skeleton retirement and V5 result

The V4 frame-plus-slot builder was deleted. The V5 Friend authoring source contains one independently authored passage per mechanism and exposes no shared paragraph frame, connector inventory, slot assembler, or closing inventory.

| Voice | Sentences | Unique | Unique ratio | Highest cross-row pair |
| --- | ---: | ---: | ---: | ---: |
| Self | 527 | 527 | 100% | 0.667 |
| Friend | 264 | 264 | 100% | 0.529 |

Both cadence checks pass. The maximum Friend opening construction occurs in 7 of 132 rows (5.30%), and the maximum Friend closing construction occurs in 2 of 132 rows (1.52%), below the 15% ceiling. No exact repeat, above-threshold near duplicate, shared three-item series, or banned fixture remains.

## Owner-review artifact

`TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V5.xlsx` preserves the established V4 workbook columns and appends V5 Self and Friend authoring method, copy, deterministic-precheck evidence, uniqueness evidence, and blank owner-verdict/edit columns. Deterministic findings are labeled prechecks and are not editorial verdicts.

No source row, approved copy, serving artifact, approval state, auto-publish setting, or writer-promotion state changed.
