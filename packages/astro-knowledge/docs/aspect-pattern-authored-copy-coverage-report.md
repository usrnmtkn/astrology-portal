# Aspect Pattern Authored Copy Coverage Report

This report summarizes the first authored aspect-pattern copy registry.

## Coverage

| Pattern | Authored | Approved authored | Source template | Madlib | Emergency | Golden fixtures | Status |
| --- | ---: | ---: | --- | --- | --- | ---: | --- |
| T-square | 1 | 1 | yes | yes | yes | 3 | covered |
| Grand Square | 1 | 1 | yes | yes | yes | 2 | covered |
| Grand Trine | 1 | 1 | yes | yes | yes | 2 | covered |
| Kite | 1 | 1 | yes | yes | yes | 2 | covered |
| Yod | 1 | 1 | yes | yes | yes | 3 | covered |
| Mystic Rectangle | 1 | 1 | yes | yes | yes | 1 | covered |

## Authored Records

| Pattern | Record ID | Version | Status | Confidence | House Mode | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| T-square | `aspect-pattern-authored:t_square:pattern:v1` | 1.0.0 | approved | exact, strong, wide, partial | any | valid |
| Grand Square | `aspect-pattern-authored:grand_square:pattern:v1` | 1.0.0 | approved | exact, strong, wide, partial | any | valid |
| Grand Trine | `aspect-pattern-authored:grand_trine:pattern:v1` | 1.0.0 | approved | exact, strong, wide, partial | any | valid |
| Kite | `aspect-pattern-authored:kite:pattern:v1` | 1.0.0 | approved | exact, strong, wide, partial | any | valid |
| Yod | `aspect-pattern-authored:yod:pattern:v1` | 1.0.0 | approved | exact, strong, wide, partial | any | valid |
| Mystic Rectangle | `aspect-pattern-authored:mystic_rectangle:pattern:v1` | 1.0.0 | approved | exact, strong, wide, partial | any | valid |

## Preview Coverage

Previews compare:

```text
production authored resolver
vs
accepted fallback resolver with authoredRecords disabled
```

Covered fixture modes:

- strong synthetic fixtures
- no-house T-square and Yod fixtures
- partial T-square
- wide real Yod
- contained T-square under Grand Square
- contained Grand Trine under Kite
- multiple real Grand Trines

Every preview reports:

- selected content level
- record ID
- changed fields
- missing slots
- skipped sections
- validation warnings
- authored result
- fallback result

## Admin Surface

Read-only page:

```text
#content/aspect-patterns
```

Read-only endpoint:

```text
GET /api/admin/aspect-pattern-copy-coverage
```

The coverage page performs no write requests and exposes no editable controls in this pass.
