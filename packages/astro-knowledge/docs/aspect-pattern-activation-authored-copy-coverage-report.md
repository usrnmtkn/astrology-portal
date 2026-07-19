# Aspect Pattern Activation Authored Copy Coverage Report

Coverage is route-based: pattern plus primary target role.

## Route Coverage

| Route | Approved authored | Fallback | Emergency | Golden fixture coverage | Status |
| --- | ---: | --- | --- | ---: | --- |
| `t_square.apex` | 1 | yes | yes | 5 | covered |
| `t_square.opposition_member` | 1 | yes | yes | 1 | covered |
| `grand_square.member` | 1 | yes | yes | 1 | covered |
| `grand_trine.member` | 1 | yes | yes | 1 | covered |
| `kite.focal_planet` | 1 | yes | yes | 1 | covered |
| `kite.resource_planet` | 1 | yes | yes | 1 | covered |
| `yod.apex` | 1 | yes | yes | 3 | covered |
| `mystic_rectangle.member` | 1 | yes | yes | 1 | covered |

## Secondary Coverage

- Timing states: exact, applying, separating, mixed
- Trigger modes: single, multiple, shared_planet
- Natal confidence: exact, strong, wide, partial
- Emergency fallback: one available for each of the six pattern types

## Preview Contract

The coverage endpoint renders each preview through the production resolver twice:

```ts
resolveAspectPatternActivationCopy(context, {
  authoredRecords: AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS
});

resolveAspectPatternActivationCopy(context, {
  authoredRecords: []
});
```

Each preview reports:

- authored result
- approved fallback result
- changed fields
- selected record ID
- selected content level
- selected template ID
- timing route
- trigger mode
- missing slots
- skipped sections
- validation warnings

The admin page is read-only and uses only `GET /api/admin/aspect-pattern-activation-copy-coverage`.
