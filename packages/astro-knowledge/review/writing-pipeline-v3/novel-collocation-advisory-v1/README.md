# Novel collocation advisory v1: false-positive measurement

Status: experimental, advisory-only, inactive pending owner review.

## Source build

- Approved example rows read: 11,412
- Positive owner-corpus passages read: 3,390 across 47 source documents
- Owner-directed corrected lines used: 76
- Deduplicated approved sources used: 9,835
- Duplicate texts removed before measurement: 1,700
- Approved sentences represented: 49,524
- Unique adjective-noun and verb-noun pairs: 48,517

## Honest false-positive test

Method: leave one approved source out. Each source is checked only against pairs found in other approved sources. Because every evaluated source is owner-approved, every flag is counted as a false positive.

- Approved sources flagged: 5,683 of 9,835 (57.78%)
- Approved sentences flagged: 17,585 of 49,524 (35.51%)
- Pair occurrences flagged: 29,124 of 112,456 (25.90%)

| Source | Sources | Sources flagged | Source FP rate | Sentence FP rate | Pair FP rate |
|---|---:|---:|---:|---:|---:|
| approved_serving | 7,846 | 5,052 | 64.39% | 36.85% | 24.69% |
| knowledge_matrix | 1,875 | 559 | 29.81% | 21.20% | 12.13% |
| owner_corpus | 47 | 46 | 97.87% | 37.41% | 38.39% |
| owner_correction | 67 | 26 | 38.81% | 36.49% | 29.94% |

## Target probes

- "The clearest voice makes the choice.": `clearest + voice`
- "Resentment then grows inside an arrangement that still looks calm.": `calm + arrangement`
- "The connection can stay easy.": `stay + connection`

## Governance

This detector is deterministic and advisory-only. It cannot block, revise, approve, stage, promote, or serve copy. It is not active in the writing pipeline while the owner reviews this measurement. A novel pair is a reading-order hint, not proof that a sentence is wrong.

The measured noise is high enough that activation is not recommended in its current form. The target probes work, but the same rule flags many legitimate one-off phrases in approved prose. No threshold was silently weakened to improve the reported score.
