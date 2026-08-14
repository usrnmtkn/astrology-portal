# Novel collocation advisory v1: false-positive measurement

Status: experimental, advisory-only, inactive pending owner review.

## Source build

- Approved example rows read: 11,386
- Positive owner-corpus passages read: 3,390 across 47 source documents
- Owner-directed corrected lines used: 22
- Deduplicated approved sources used: 9,764
- Duplicate texts removed before measurement: 1,691
- Approved sentences represented: 49,287
- Unique adjective-noun and verb-noun pairs: 48,366

## Honest false-positive test

Method: leave one approved source out. Each source is checked only against pairs found in other approved sources. Because every evaluated source is owner-approved, every flag is counted as a false positive.

- Approved sources flagged: 5,634 of 9,764 (57.70%)
- Approved sentences flagged: 17,520 of 49,287 (35.55%)
- Pair occurrences flagged: 29,030 of 111,851 (25.95%)

| Source | Sources | Sources flagged | Source FP rate | Sentence FP rate | Pair FP rate |
|---|---:|---:|---:|---:|---:|
| approved_serving | 7,820 | 5,029 | 64.31% | 36.99% | 24.80% |
| knowledge_matrix | 1,876 | 558 | 29.74% | 21.13% | 12.11% |
| owner_corpus | 47 | 46 | 97.87% | 37.36% | 38.35% |
| owner_correction | 21 | 1 | 4.76% | 3.85% | 5.66% |

## Target probes

- "The clearest voice makes the choice.": `clearest + voice`
- "Resentment then grows inside an arrangement that still looks calm.": `calm + arrangement`
- "The connection can stay easy.": `stay + connection`

## Governance

This detector is deterministic and advisory-only. It cannot block, revise, approve, stage, promote, or serve copy. It is not active in the writing pipeline while the owner reviews this measurement. A novel pair is a reading-order hint, not proof that a sentence is wrong.

The measured noise is high enough that activation is not recommended in its current form. The target probes work, but the same rule flags many legitimate one-off phrases in approved prose. No threshold was silently weakened to improve the reported score.
