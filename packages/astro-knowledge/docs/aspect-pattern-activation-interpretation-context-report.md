# Aspect Pattern Activation Interpretation Context Report

This pass adds the structured context layer between mathematical natal aspect-pattern activation and a future governed activation-copy resolver.

It does not add activation interpretation copy, activation templates, phrasebank rows, reader-facing activation UI, editable admin content, AI generation, progressions, empty-leg/fallout-point activation, planetary chart-shape activation, new transit calculations, or changes to natal detection/ranking/contexts.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `packages/astro-knowledge/scripts/print-aspect-pattern-activation-fixtures.js`
- `api/_lib/aspect-patterns.ts`
- `api/astrology-facts.ts`
- `apps/web/src/astro-knowledge.d.ts`
- `scripts/test-aspect-pattern-activation.mjs`
- `scripts/test-real-aspect-pattern-activation-fixtures.mjs`
- `packages/astro-knowledge/docs/aspect-pattern-activation-interpretation-context-report.md`

## Contract Added

- `AspectPatternActivationInterpretationContext`
- `ASPECT_PATTERN_ACTIVATION_CONTEXT_BUILDER_VERSION`
- `buildAspectPatternActivationInterpretationContexts()`

## Behavior

```text
PatternActivation[]
+ AspectPatternInterpretationContext[]
+ ActivatedPatternRanking[]
-> aggregated activation interpretation contexts
```

The builder:

- emits one context per activated pattern
- preserves every activation trigger inside `triggers`
- chooses `primaryTrigger` deterministically by activation score, orb, applying state, then activation ID
- keeps natal rank and current rank separate
- preserves parent and child pattern IDs
- summarizes moving bodies, targeted planets, targeted roles, linked patterns, timing state, and fan-out
- includes machine-readable copy job and prohibited-claim codes
- includes complete provenance
- emits no finished user-facing prose

## API

Activation contexts remain opt-in:

```text
includeAspectPatterns=true
includeAspectPatternActivation=true
includeAspectPatternActivationContexts=true
```

Canonical location:

```text
sky.aspectPatterns.activation.interpretationContexts
```

## Verification

- `npm run test:aspect-patterns-activation`
- `npm run test:aspect-patterns-activation-real`

## Deferred Work

- governed activation-copy schema
- deterministic activation fallback resolver
- activation reader UI
- admin editing
- progression activation
