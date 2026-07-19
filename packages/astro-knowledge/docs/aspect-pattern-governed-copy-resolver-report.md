# Aspect Pattern Governed Copy Resolver Report

This pass adds the governed copy schema and deterministic fallback resolver for the six supported aspect patterns.

It does not add reader UI, authored copy library rows, admin editing, AI generation, transit activation, progression activation, or planetary chart-shape interpretation.

## Architecture

```text
AspectPatternInterpretationContext
-> governed content lookup
-> authored record or controlled fallback
-> ResolvedAspectPatternCopy
```

## Added Contracts

- `AspectPatternContentLevel`
- `AspectPatternCopyRecord`
- `ResolvedAspectPatternCopy`
- `AspectPatternCopySlots`
- `CopyCondition`
- `resolveAspectPatternCopy()`
- `resolveAspectPatternCopies()`
- `validateAspectPatternCopyRecord()`
- `GOVERNED_COPY_RECORDS`
- `APPROVED_COPY_SLOTS`
- `ASPECT_PATTERN_COPY_RESOLVER_VERSION`

## Resolution Order

The resolver is deterministic and tries records in this order:

1. authored records supplied to the resolver
2. built-in source-grounded templates
3. built-in governed madlib fallbacks
4. emergency fallback

Every resolved object reports:

- record ID
- content level
- status
- resolver version
- missing slots
- skipped sections
- attempted record IDs

## Guardrails

The resolver:

- consumes only `AspectPatternInterpretationContext`
- does not recalculate geometry, roles, relationships, ranking, or derived points
- does not mutate context input
- uses explicit approved `{{slot}}` interpolation only
- fails closed on unknown required slots
- routes wide and partial contexts to qualified wording
- uses sign-only clauses when houses are absent
- keeps contained patterns independently resolvable
- blocks Yod fate/destiny/Finger of God language
- blocks apex language for Grand Square and Mystic Rectangle records
- blocks internal diagnostics such as scores, source aspect IDs, warning codes, and ranking reason terms from governed templates

## API

Resolved copy is not exposed by default.

Diagnostic copy exposure requires both flags:

```text
includeAspectPatterns=true
includeAspectPatternCopy=true
```

When enabled, the payload appears at:

```text
sky.aspectPatterns.resolvedCopy
```

`sky.aspectPatterns` remains the canonical API location.

## Diagnostics

The read-only aspect-pattern diagnostics view now has a `Resolved copy` checkbox. It appends `includeAspectPatternCopy=true` to the existing GET request and shows the resulting raw JSON diagnostics without adding editing or reader UI.

## Tests

Expanded synthetic, real-fixture, API, and diagnostics tests cover:

- all six patterns resolving nonempty copy
- authored precedence over source templates
- template precedence over lower fallbacks
- deterministic repeated resolution
- no context mutation
- T-square apex and empty-leg language
- no apex language for Grand Square or Mystic Rectangle
- Kite preserving Grand Trine and opposition structure
- no prohibited Yod fate language
- wide and partial qualified wording
- sign-only fallback when houses are absent
- unknown required slots failing closed
- no internal score/reason/source diagnostic leakage
- emergency fallback readability
- contained patterns independently resolving
- real fixture copy stability
- opt-in API behavior

## Deferred Work

The authored copy library is intentionally not created here. The next review point should inspect the six emergency/source-grounded outputs in diagnostics before authoring reviewed records.
