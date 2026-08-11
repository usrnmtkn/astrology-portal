# Daily-glance writer lint recalibration

Date: 2026-08-10
Policy: `daily-glance-writer-lint-policy-v2:serving-68-calibrated`
Serving source SHA-256: `86428d40552aae031109911d08b040286dde2ccd63ac32c19e1c834ff284430e`

> Baseline: all 68 currently-serving pairs are owner-approved. A rule failing more than 10% of that surface is advisory; rules at or below 10% remain blocking. This changes lint disposition only. No copy or review status changed, and no model was called.

## Result

- Blocking-tier pass rate: 58/68 (85.3%)
- Blocking-tier failures: 10
- The requested threshold does not produce the anticipated 90% aggregate pass rate because ten cards fail different low-frequency blocking rules.

## Individual rule calibration

| Rule | Failures | Rate | Tier |
|---|---:|---:|---|
| `P4-headline-one-declarative-sentence` | 1/68 | 1.5% | blocking |
| `P4-headline-word-count` | 0/68 | 0.0% | blocking |
| `P4-body-sentence-count` | 9/68 | 13.2% | advisory |
| `P4-body-word-count` | 15/68 | 22.1% | advisory |
| `P4-one-final-instruction` | 18/68 | 26.5% | advisory |
| `P4-body-supports-without-repeating` | 0/68 | 0.0% | blocking |
| `global+VC-016+DG+SM-output-bans` | 20/68 | 29.4% | advisory |
| `DG-R2-register` | 28/68 | 41.2% | advisory |
| `DG-R3-no-slogan-or-restatement-closer` | 0/68 | 0.0% | blocking |
| `DG-R4-no-outcome-promise` | 1/68 | 1.5% | blocking |
| `DG-R7-varied-opener` | 1/68 | 1.5% | blocking |
| `DG-R9-enumerated-instruction-allowed` | 0/68 | 0.0% | blocking |
| `B1-L1-time-anchor-max-once` | 0/68 | 0.0% | blocking |
| `B1-L2-may-inner-states-only` | 16/68 | 23.5% | advisory |
| `B1-L3+L4-headline-group-grammar` | 35/68 | 51.5% | advisory |
| `SM-DG-2-no-diagnostic-history` | 0/68 | 0.0% | blocking |
| `DG-R11-unhedged-headline` | 0/68 | 0.0% | blocking |
| `DG-R12-no-time-anchor-opener` | 3/68 | 4.4% | blocking |
| `DG-R13-may-max-once` | 2/68 | 2.9% | blocking |
| `DG-R14-scene-not-biographical` | 0/68 | 0.0% | blocking |
| `DG-R15-action-repairs-moment` | 0/68 | 0.0% | blocking |
| `DG-R16-owner-reserved-construction` | 2/68 | 2.9% | blocking |
| `DG-R17-quoted-dialogue-max-one` | 2/68 | 2.9% | blocking |
| `DG-R17-quoted-dialogue-earns-place-advisory` | 0/68 | 0.0% | blocking |
| `OWNER-DIRECTIVE-short-blunt-line` | 31/68 | 45.6% | advisory |
| `OWNER-TEST-specificity` | 67/68 | 98.5% | advisory |
| `OWNER-TEST-morning-read` | 15/68 | 22.1% | advisory |
| `OWNER-TEST-screenshot` | 37/68 | 54.4% | advisory |

## Cards still failing blocking rules

| Key | Blocking failures |
|---|---|
| `conjunction/chiron` | `DG-R17-quoted-dialogue-max-one` |
| `conjunction/pluto` | `DG-R13-may-max-once` |
| `opposition/pluto` | `DG-R17-quoted-dialogue-max-one` |
| `opposition/uranus` | `P4-headline-one-declarative-sentence` |
| `soft/mars` | `DG-R7-varied-opener`, `DG-R12-no-time-anchor-opener`, `DG-R16-owner-reserved-construction` |
| `soft/north-node` | `DG-R4-no-outcome-promise` |
| `soft/pluto` | `DG-R16-owner-reserved-construction` |
| `soft/south-node` | `DG-R13-may-max-once` |
| `square/lilith` | `DG-R12-no-time-anchor-opener` |
| `square/mercury` | `DG-R12-no-time-anchor-opener` |

## Batch rules

| Rule | Observed | Tier |
|---|---|---|
| `batch-output-count` | pass | blocking |
| `DG-R1-recurring-sentence-frame` | fail | advisory |
| `DG-R7-opener-variety` | fail | blocking |
| `OWNER-TEST-specificity-batch` | fail | advisory |

## Governance

- Advisory failures remain in every lint report but do not make `lint.passed` false.
- Blocking failures continue to discard generated candidates.
- Owner approval remains authoritative; lint cannot promote or change serving content.
