# Natal writer evidence coverage — 2026-08-13

Status: deterministic pre-drafting coverage record. No model call was made. No row was edited, approved, served, or promoted.

## Result

A compliant, registry-bounded packet can be built today for **266 of 713** unapproved LL V13 rows (37.31%). The remaining **447** rows are fail-closed.

## Batch coverage

| Batch | Rows | Compliant packets | Coverage |
| --- | ---: | ---: | ---: |
| WP1-B04 | 72 | 26 | 36.11% |
| WP1-B03 | 116 | 78 | 67.24% |
| WP1-B02 | 131 | 45 | 34.35% |
| WP1-B05 | 131 | 66 | 50.38% |
| WP1-B06 | 131 | 0 | 0% |
| WP1-B01 | 132 | 51 | 38.64% |

## Fail-closed reasons

- missing-registry-row: 371
- unverified-registry-row: 53
- unsupported-key-shape: 23

A row can have more than one reason, so reason counts are not additive. `unverified-registry-row` includes a registry row whose status remains DRAFT. `unsupported-key-shape` covers generic aspect, sign, house, planet, phase, or fortune rows that are not one of the authorized natal packet key forms.

## Governance

- Evidence is restricted to `authorityClass: exact_owner_approved`.
- Fact boundaries contain registry identity and provenance, not registry prose as voice evidence.
- Fewer than four qualifying passages or fewer than three source rows blocks drafting.
- Batch 2 may be regenerated only for rows marked compliant in the JSON artifact.
- Approval state, serving state, auto-publish, and writer promotion remain unchanged.
