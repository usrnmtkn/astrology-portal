# Aspect Pattern Transit Activation Report

This pass adds the first date-specific mathematical activation layer for natal aspect patterns.

It does not add activation copy, reader cards, admin editing, AI generation, progression activation, chart-shape activation, changes to natal pattern detection, changes to natal base ranking, or empty-leg/fallout-point activation.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `packages/astro-knowledge/scripts/print-aspect-pattern-activation-fixtures.js`
- `packages/astro-knowledge/package.json`
- `api/_lib/aspect-patterns.ts`
- `api/astrology-facts.ts`
- `apps/web/src/types.ts`
- `apps/web/src/astro-knowledge.d.ts`
- `scripts/test-aspect-pattern-activation.mjs`
- `package.json`
- `packages/astro-knowledge/docs/aspect-pattern-transit-activation-report.md`

## Contract Added

- `PatternActivation`
- `ActivatedPatternRanking`
- `AspectPatternActivationResult`
- `PatternActivationPolicy`
- `TransitToNatalActivationAspect`
- `ASPECT_PATTERN_ACTIVATION_VERSION`
- `DEFAULT_ACTIVATION_POLICY`
- `normalizeActivationPolicy()`
- `buildPatternActivations()`

## Behavior

```text
natal aspect patterns
+ existing normalized transit-to-natal aspects
-> pattern activation records
-> separate current display order
```

The builder:

- consumes already-calculated transit-to-natal aspect records
- targets natal member planets only
- fans a transit out to every pattern containing the natal target planet
- keeps parent and contained patterns independently activatable
- preserves source aspect IDs when supplied
- preserves applying/separating state
- produces deterministic activation IDs and sorted output
- leaves natal geometry, relationships, interpretation contexts, copy, and base ranking untouched

## API

Activation remains opt-in:

```text
includeAspectPatterns=true
includeAspectPatternActivation=true
```

The canonical location is:

```text
sky.aspectPatterns.activation
```

The top-level `aspectPatterns` alias still references the same calculated object as `sky.aspectPatterns`.

## Fixture Diagnostics

Run:

```bash
npm run fixtures:aspect-pattern-activations -w @tldr/astro-knowledge
```

The printed fixtures cover:

- shared Moon activation across a Grand Square and retained component T-squares
- Mars activation across a Kite and its retained underlying Grand Trine

## Known Limitations

- The API does not calculate transit-to-natal aspects in this pass.
- Activation is populated only from existing `transitToNatalAspects`, `transitsToNatal`, `personalTransits`, or explicit helper options.
- Empty-leg and fallout-point activation are deferred.
- Progression activation is deferred.
- Activation copy and reader presentation are deferred.
