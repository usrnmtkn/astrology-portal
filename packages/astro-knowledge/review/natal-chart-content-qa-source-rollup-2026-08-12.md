# Natal Chart semantic QA source-row rollup — 2026-08-12

**Status:** complete advisory evidence  
**Owner review unit:** source row or resolver frame  
**Governance:** no copy, approval, serving, auto-publish, or writer-promotion changes

## Result

All **4,816** EDIT/CUT passages map to **603 distinct source rows or frames** through the inventory's composition dependencies. A flagged passage may implicate multiple dependencies; the row table therefore reports unique passages per dependency, not additive attribution.

| Scheduled-work class | Distinct rows/frames |
| --- | ---: |
| (a) Friend pass-2 scheduled supersession or frame rewrite | 1 |
| (b) Authorized broader Friend defect batch | 49 |
| (c) Newly discovered / at least one uncovered use | 553 |

The classification is conservative across surfaces: if pass 2 covers a Friend use of a shared row but the same row feeds a flagged You passage, the row is class (c), with the partial (a)/(b)/(c) counts preserved in the JSON and workbook. Pass 2 still has zero authored rows in its recorded scaffold, so class (a) means scheduled and review-gated—not promoted or serving.

## Seam-label normalization

The **1,841** improvised `other-named` labels were normalized into five seam buckets while their original labels remain in the passage evidence and worst-example records.

| Seam bucket | Passages |
| --- | ---: |
| assembled-list | 50 |
| competing-messages | 111 |
| contradiction | 77 |
| unbridged-shift | 1,487 |
| unsupported-claim | 116 |

## Ruler-composition finding

All **3,168** judged empty-house renders use ruler composition. **1,425** were EDIT/CUT (**44.98%**): 1,411 EDIT and 14 CUT.

| Surface | Ruler renders | Flagged | Flag rate | CUT |
| --- | ---: | ---: | ---: | ---: |
| You | 1,584 | 676 | 42.68% | 9 |
| Friend | 1,584 | 749 | 47.29% | 5 |

There are **0 non-ruler empty-house renders** in this inventory, so a ruler-vs-non-ruler rate comparison is unavailable rather than zero. The evidence still shows the unbridged ruler seam on both surfaces. Recommendation: **extend ruler-method retirement/supersession to You and prefer authored whole passages over adding generic bridges**. This is a recommendation only; an owner ruling is required before changes.

## Evidence and owner review

- Full passage evidence remains in `packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json`.
- The passage-level workbook remains evidence, not the owner-review unit.
- Row-level machine evidence is in `packages/astro-knowledge/review/natal-chart-content-qa-source-rollup-2026-08-12.json`.
- The row-level owner workbook contains one row per contributing source row/frame and its composed worst example.
