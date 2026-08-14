# Fallback family-ruling importer — 2026-08-14

Status: intake ready; owner rulings not yet populated; no source mutation

The governed owner packet is `TLDR-APPROVAL-RULING-NEEDED-179-ROWS.md`. The importer at `scripts/import_fallback_family_rulings.py` accepts only a complete 18-family packet whose ruling fields are exactly `approved` or `not approved`.

## Reconciled baseline

- 179 unique governed rows across 18 families.
- 145 remain ungated after the fallback approval reconciliation.
- 34 Copy Batch A Daily rows already carry `exact_owner_approved` with hash-traced repository records: 17 `daily-headline` rows and 17 `daily-body` rows.
- The owner packet's 179-row count therefore describes the original decision set, not 179 rows that are still ungated after PR #230.

The manifest `fallback-family-ruling-179-manifest-v1.json` pins each row key, family, reader-payload SHA-256, row-without-approval SHA-256, and approval level at intake.

## Atomic behavior

- Any blank, partial, reordered, duplicated, or ambiguous family ruling refuses the whole import.
- Any source-row, reader-copy, family-count, manifest, or approval-baseline drift refuses the whole import.
- `approved` sets only currently ungated rows to `owner_signoff_untraced`; already exact rows stay exact.
- `not approved` leaves currently ungated rows gated.
- A `not approved` ruling for either Daily family conflicts with its 17 existing exact approvals and refuses the whole import. Revoking those rows requires a separate explicit owner revocation rather than an inferred downgrade.
- Validation finishes before writes. The source and record are staged, fsynced, and replaced as a transaction with rollback of the source if record publication fails.
- Reader copy is hashed before and after and must remain byte-identical.

The blank packet currently fails closed as intended. No approval metadata, serving state, generated artifact, auto-publish state, or writer promotion changed.
