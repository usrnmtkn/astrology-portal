# Fallback approval metadata reconciliation

Date: 2026-08-13

## Scope and authority

This scope reconciles the structured approval metadata in
`apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json`.
It is separate from the authored-card migration in PR #229.

Owner ruling, 2026-08-13: accept both levels. Rows with traceable exact-copy
approval receive `exact_owner_approved`; rows whose existing metadata records
owner sign-off without a payload-hash record receive
`owner_signoff_untraced`. The levels remain distinct. No approval is inferred
from `review_status` alone.

## Reconciled baseline

The canonical source contains 4,377 hook rows:

- 1,224 already carried structured exact approval and remain unchanged.
- 226 receive `exact_owner_approved` because a repository review record contains
  and approves the current payload.
- 2,320 receive `owner_signoff_untraced` because row metadata explicitly records
  historical owner approval but lacks a traceable payload citation.
- 607 remain ungated because no qualifying owner approval evidence exists.

The 607-row set includes 318 deliberately re-statused synastry rows, 93
`needs_review` rows, 12 owner-book reuse rows whose authorship is not app-copy
approval, and 184 other rows whose status or source doctrine is not approval
evidence.

The machine-readable record lists every classified key at
`packages/astro-knowledge/review/fallback-approval-metadata-reconciliation-2026-08-13.json`.
The pending owner family rulings in `TLDR-APPROVAL-RULING-NEEDED-179-ROWS.md`
govern the subset presented for review; this migration does not assume their
disposition.

## Invariants

The canonical reader-payload SHA-256 is
`74d82df5f31227da4c6bff1f14812f5d5f37ebbb175cccf0961d6e1148436bb4`
before and after migration. Headlines, bodies, templates, review status, and
serving state are byte-identical. Generated artifacts are rebuilt from source.
