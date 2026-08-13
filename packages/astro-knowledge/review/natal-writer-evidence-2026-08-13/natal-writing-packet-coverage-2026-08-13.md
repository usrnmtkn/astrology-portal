# Natal writer evidence coverage — 2026-08-13

Status: deterministic pre-drafting coverage record. No model call was made. No row was edited, approved, served, or promoted.

## Result

A compliant, registry-bounded packet can be built today for **579 of 713** unapproved LL V13 rows (81.21%). The remaining **134** rows are fail-closed. All **713 of 713** rows have exact-key AstrologySupport; the fail-closed remainder is caused by absent, inactive, or unsupported registry boundaries, not missing mechanism source.

## Batch coverage

| Batch | Rows | Compliant packets | Coverage |
| --- | ---: | ---: | ---: |
| WP1-B04 | 72 | 26 | 36.11% |
| WP1-B03 | 116 | 78 | 67.24% |
| WP1-B02 | 131 | 125 | 95.42% |
| WP1-B05 | 131 | 127 | 96.95% |
| WP1-B06 | 131 | 91 | 69.47% |
| WP1-B01 | 132 | 132 | 100% |

## Fail-closed reasons

- missing-registry-row: 58
- unverified-registry-row: 53
- unsupported-key-shape: 23

A row can have more than one reason, so reason counts are not additive. `unverified-registry-row` includes a registry row whose status remains DRAFT. `unsupported-key-shape` covers generic aspect, sign, house, planet, phase, or fortune rows that are not one of the authorized natal packet key forms.

## Governance

- AstrologySupport is the sole target-mechanism source; prior/current/revised candidate prose is excluded from writer packets.
- Evidence is restricted to `authorityClass: exact_owner_approved`.
- Fact boundaries contain registry identity and provenance only; registry prose is excluded from writer context.
- Fewer than four qualifying passages or fewer than three source rows blocks drafting.
- Batch 1 V3 may be authored only for rows marked compliant in the JSON artifact; all other rows remain SOURCE_GAP.
- Approval state, serving state, auto-publish, and writer promotion remain unchanged.
