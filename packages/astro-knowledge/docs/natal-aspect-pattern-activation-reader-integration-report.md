# Natal Aspect Pattern Activation Reader Integration Report

This pass adds a feature-flagged reader callout for date-specific natal aspect-pattern activation copy.

It does not add new activation copy, editable admin controls, new transit calculations, content generation, copy templates in the reader, diagnostics display, provenance display, or a separate activation list.

## Files Changed

- `apps/web/src/services/natalAspectPatterns.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/features/you/NatalAspectPatternsSection.tsx`
- `apps/web/src/styles/cards.css`
- `scripts/test-natal-aspect-pattern-reader-contract.mjs`
- `scripts/test-natal-aspect-pattern-reader-activation.mjs`
- `package.json`
- `packages/astro-knowledge/docs/natal-aspect-pattern-activation-reader-integration-report.md`

## Feature Flag

Reader activation copy is hidden unless the natal aspect-pattern reader is enabled and one activation flag is enabled:

```text
VITE_ENABLE_NATAL_ASPECT_PATTERN_ACTIVATION=true
```

Local development may also use:

```text
localStorage["tldrastro:natalAspectPatternActivation"] = "enabled"
```

The local-storage override is ignored in production.

## API Contract

The reader always requests natal pattern detection and resolved natal copy. Activation fields are added only when the activation reader flag is enabled:

```text
includeAspectPatterns=true
includeAspectPatternCopy=true
includeAspectPatternActivation=true
includeAspectPatternActivationContexts=true
includeAspectPatternActivationCopy=true
```

The reader consumes the canonical `sky.aspectPatterns.activation.resolvedCopy` payload, plus `activation.currentDisplayOrder` only to choose primary versus secondary visual emphasis.

## Rendering

Activation copy renders inside the matching natal aspect-pattern card as an `Active now` callout. It renders only available resolved copy fields:

- eyebrow
- headline
- overview
- non-empty sections

Empty sections are omitted. Missing activation copy renders no placeholder, and there is no global inactive-state message.

Contained natal patterns remain nested under their parent patterns. If a contained pattern has the current primary activation, its parent detail opens so the active nested callout is reachable without creating a second list.

## Guardrails

- The reader does not inspect activation contexts, scores, reasons, diagnostics, provenance, or trigger internals.
- The reader does not run transit calculations, pattern detection, ranking, or copy resolution.
- Activation loading or failure falls back to the existing natal pattern reader behavior.
- The hierarchy of natal pattern cards remains driven by permanent natal interpretation context.

## Verification

- `npm run test:natal-aspect-pattern-reader`
- `npm run typecheck -w @tldr/web`

