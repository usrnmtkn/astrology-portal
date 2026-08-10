# Writing harness v3

Governed documents: `owner_approved`. Active in harness: `true`. Active in production: `false`. Candidate writer active: `false`. Writer promotion authorized: `false`.

This rebuild applies only to the CARD surface. It uses complete-card packets, same-surface owner comparisons, labeled negative evidence, deterministic verdict mapping, and paired fixtures. The card writer prompt loads `TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md` verbatim, starts with its section 23 direction, and carries its section 22 seven-pass loop as structured prompt data. The section 21 critique checklist remains a separate governed document. The register ruling, critique checklist, and card rubric were approved and activated in the harness on 2026-08-09. Card judge and critique v3.1 superseded v3 in the harness on 2026-08-10. This does not activate or promote the candidate writer.

The deterministic copy validator treats every `DO_NOT_ASSUME` value as internal. It rejects the internal label, exact guard text, and reader-facing “does not necessarily mean” disclaimers while excluding the internal guard field itself from reader-copy linting.

## Billed-call governance

Every billed run requires a separate, explicit owner authorization naming the call budget. The runner accepts no generic `--authorize-live` switch. It requires the exact one-use environment token configured for that version and refuses to run after the corresponding artifact exists. On 2026-08-09 the owner authorized run 1 for exactly 20 calls with zero retries. On 2026-08-10 the owner authorized v3.1 run 2 for exactly 20 calls with zero retries. A token is consumed when its run artifact exists.

The proposed next run is 20 calls, no retries, over the frozen 12 gold and 8 paired degradation variants. It uses `gpt-5.6-terra` with `high` reasoning. Low reasoning is the documented suspect in the v2 baseline's seven gold false positives and is forbidden for v3 semantic voice evaluation.

Card judge v3.1 calibration completed on 2026-08-10 across preserved runs 2b and 2c: 12/12 owner-locked gold contracts and 8/8 paired negative contracts passed. Run 2c applied the owner-approved alternates ruling for `neg-gemini-advocacy`; run 2b remains byte-identical.

## Governance wall

- The register-per-surface ruling is `owner_approved` and active in the harness only.
- The card critique checklist v3.1 is `owner_approved` and active in the harness only, superseding v3.
- The card judge rubric v3.1 is `owner_approved` and active in the harness only, superseding v3.
- Editorial-test question 13 routes to `specificity_ceiling`, which runtime maps to `FAIL`.
- `CURRENT_PRODUCTION_WRITER` remains unset.
- Candidate writer activation and promotion remain off.
- No evaluation result implies writer approval or promotion.
