# Aspect Pattern Interpretation Context Report

This pass adds the structured interpretation-context contract between ranked aspect patterns and the future copy resolver.

It does not add authored interpretations, phrasebank rows, AI generation, reader cards, admin editing, transit activation, or planetary chart-shape detection.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `packages/astro-knowledge/scripts/test-aspect-pattern-engine.js`
- `packages/astro-knowledge/scripts/print-aspect-pattern-fixtures.js`
- `api/_lib/aspect-patterns.ts`
- `api/admin/aspect-pattern-fixtures.ts`
- `scripts/test-astrology-facts-aspect-patterns.mjs`
- `scripts/test-real-aspect-pattern-fixtures.mjs`
- `package.json`

## Contract Added

Added:

- `AspectPatternInterpretationContext`
- `PATTERN_COPY_JOBS`
- `ASPECT_PATTERN_DETECTOR_VERSION`
- `ASPECT_PATTERN_CONTEXT_BUILDER_VERSION`
- `buildAspectPatternInterpretationContexts()`

The builder consumes detector output plus ranking/context metadata and emits one context per ranked pattern. It preserves:

- pattern IDs
- pattern types
- source aspect IDs
- roles
- derived points
- confidence and warnings
- ranking scores and reasons
- parent and child relationships
- detector/orb/ranking/builder provenance

## Boundary Rules

The context builder does not:

- generate finished user-facing interpretation copy
- recalculate geometry
- change detector or ranking formulas
- hide contained patterns
- convert `wide` or `partial` confidence into stronger certainty
- treat missing birth-time metadata as missing geometry
- fail on unknown future warning or ranking-reason codes

## API Placement

When `includeAspectPatterns=true`, the API now returns:

```json
{
  "sky": {
    "aspectPatterns": {
      "patterns": [],
      "relationships": [],
      "ranking": {},
      "interpretationContexts": []
    }
  }
}
```

When `includeAspectPatterns` is absent or false, `aspectPatterns` remains absent and the previous response shape is unchanged.

## Tests Added Or Expanded

Synthetic tests verify:

- one context per ranking record
- no mutation of detector/ranking output
- deterministic context output
- reversed input order produces identical contexts
- Grand Square and Mystic Rectangle have no apex
- T-square includes apex and empty leg
- Yod includes base, apex, and fallout point
- Kite preserves the Grand Trine relationship
- missing house/angle data is safe
- wide patterns keep warnings and qualified certainty
- provenance is present
- unknown warning/reason codes pass through
- context strings avoid finished second-person interpretation copy

Real-fixture/API tests verify:

- real fixtures produce stable contexts
- API contexts match direct engine contexts
- non-opt-in API shape remains unchanged

## Deferred Work

The next layer is the governed copy schema and fallback templates for the six patterns. That future pass can consume these contexts, but should not rebuild pattern logic from prose.
