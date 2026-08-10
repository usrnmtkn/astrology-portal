# Writing harness v3 candidate

Status: `needs_review`. Owner approved: `false`. Active: `false`. Writer promotion authorized: `false`.

This candidate rebuild applies only to the CARD surface. It uses complete-card packets, same-surface owner comparisons, labeled negative evidence, deterministic verdict mapping, and paired fixtures. The register ruling and card rubric must both receive explicit owner approval before activation.

## Billed-call governance

No live evaluation is authorized by this implementation. Every billed run requires a separate, explicit owner authorization naming the call budget. The runner accepts no generic `--authorize-live` switch. It requires the exact one-use environment token configured for that version and refuses to run after the corresponding artifact exists.

The proposed next run is 20 calls, no retries, over the frozen 12 gold and 8 paired degradation variants. It uses `gpt-5.6-terra` with `high` reasoning. Low reasoning is the documented suspect in the v2 baseline's seven gold false positives and is forbidden for v3 semantic voice evaluation.

## Governance wall

- The register-per-surface ruling remains `needs_review`.
- The card judge rubric v3 remains `needs_review`.
- No live result exists for v3.
- `CURRENT_PRODUCTION_WRITER` remains unset.
- No result from this harness implies owner approval or writer promotion.
