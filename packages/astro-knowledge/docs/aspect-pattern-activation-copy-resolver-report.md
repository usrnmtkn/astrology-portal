# Aspect Pattern Activation Copy Resolver Report

This pass adds the governed activation-copy schema and deterministic fallback resolver for natal aspect-pattern activation.

It does not add reader-facing activation UI, authored activation records, editable admin controls, AI generation, progression activation, empty-leg/fallout-point activation, planetary chart-shape activation, new transit calculations, or changes to natal detection/ranking/context/activation matching.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `packages/astro-knowledge/scripts/print-aspect-pattern-activation-fixtures.js`
- `api/_lib/aspect-patterns.ts`
- `api/astrology-facts.ts`
- `api/admin/aspect-pattern-fixtures.ts`
- `apps/admin/src/AspectPatternDiagnostics.tsx`
- `apps/web/src/astro-knowledge.d.ts`
- `scripts/test-aspect-pattern-activation-copy.mjs`
- `scripts/test-aspect-pattern-diagnostics-view.mjs`
- `package.json`
- `packages/astro-knowledge/docs/aspect-pattern-activation-copy-resolver-report.md`

## Contracts Added

- `AspectPatternActivationContentLevel`
- `AspectPatternActivationCopyRecord`
- `AspectPatternActivationCopySlots`
- `ActivationCopyCondition`
- `ResolvedAspectPatternActivationCopy`
- `ASPECT_PATTERN_ACTIVATION_COPY_RESOLVER_VERSION`
- `GOVERNED_ACTIVATION_COPY_RECORDS`
- `AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS`
- `resolveAspectPatternActivationCopy()`
- `resolveAspectPatternActivationCopies()`
- `validateAspectPatternActivationCopyRecord()`

## Resolution Order

```text
approved authored activation record
-> approved source-grounded activation template
-> governed madlib fallback
-> emergency fallback
```

No authored activation records were added in this pass.

## Guardrails

The resolver:

- consumes only structured activation interpretation contexts
- resolves one copy object per activated pattern
- keeps multiple triggers aggregated inside that one result
- uses explicit approved slots only
- keeps all activation certainty qualified
- keeps activation copy separate from permanent natal interpretation copy
- routes wide and partial natal patterns to confidence notes
- preserves parent/child pattern separateness
- blocks event prediction language
- blocks natal-geometry-changing language
- blocks apex language for Grand Square and Mystic Rectangle
- blocks Yod fate/destiny/Finger of God style language
- blocks internal score, reason, policy, source-aspect, and rank leakage from rendered copy

## API

Resolved activation copy remains opt-in:

```text
includeAspectPatterns=true
includeAspectPatternActivation=true
includeAspectPatternActivationContexts=true
includeAspectPatternActivationCopy=true
```

Canonical location:

```text
sky.aspectPatterns.activation.resolvedCopy
```

## Diagnostics

The read-only aspect-pattern diagnostics view now has a `Resolved activation copy` checkbox. It requests activation math, activation contexts, and resolved activation copy, then shows source level, template ID, resolved fields, diagnostics, and raw resolved objects. It does not add editing or reader rendering.

## Verification

- `npm run test:aspect-patterns-activation-copy`
- `npm run test:aspect-patterns-activation`
- `npm run test:aspect-patterns-activation-real`
- `npm run test:aspect-patterns-diagnostics`
- `npm run test:aspect-patterns-api`
- `npm run test:natal-aspect-pattern-reader`
- `npm run test:aspect-patterns-copy`
- `npm run test:aspect-patterns -w @tldr/astro-knowledge`
- `npm run typecheck -w @tldr/web`

## Deferred Work

- editorial acceptance and golden-fixture pass for activation fallbacks
- authored activation record library
- reader-facing activation UI
