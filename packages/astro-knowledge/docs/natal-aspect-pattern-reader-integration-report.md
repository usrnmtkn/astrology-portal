# Natal Aspect Pattern Reader Integration Report

This pass connects resolved natal aspect-pattern copy to the reader behind a narrow feature flag.

It does not add new interpretation copy, new templates, editable admin controls, AI generation, transit activation, planetary chart-shape detection, detector changes, ranking changes, role changes, relationship changes, context changes, or resolver-precedence changes.

## Files Changed

- `apps/web/src/services/natalAspectPatterns.ts`
- `apps/web/src/features/you/NatalAspectPatternsSection.tsx`
- `apps/web/src/features/you/YouPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/astro-knowledge.d.ts`
- `apps/web/src/styles/cards.css`
- `scripts/test-natal-aspect-pattern-reader-contract.mjs`
- `package.json`
- `packages/astro-knowledge/docs/natal-aspect-pattern-reader-integration-report.md`

## Data Flow

```text
natal chart calculation
-> GET /api/astrology-facts?includeAspectPatterns=true&includeAspectPatternCopy=true
-> sky.aspectPatterns.resolvedCopy
-> reader item projection
-> NatalAspectPatternsSection
```

The reader component renders `ResolvedAspectPatternCopy` content only. It does not call the detector, rank patterns, choose templates, interpolate slots, or inspect source aspect IDs, scores, warning codes, provenance, content levels, template IDs, or diagnostics.

## Feature Control

Reader visibility is guarded by:

```text
VITE_ENABLE_NATAL_ASPECT_PATTERNS=true
```

For local development only, the same section can be enabled with:

```text
localStorage["tldrastro:natalAspectPatterns"] = "enabled"
```

The local storage override is ignored in production.

## Reader Behavior

- Primary independent pattern renders as the expanded card.
- Additional independent patterns render as collapsed cards.
- Contained patterns render beneath their parent as supporting detail.
- Grand Square component T-squares are not repeated as equal top-level cards.
- Kite component Grand Trine is not repeated as an equal top-level card.
- Empty section headings are skipped.
- Pattern loading does not block the natal chart, placements, aspects, or other natal sections.
- Pattern request failures show a restrained unavailable state and log diagnostics internally.
- No-birth-time charts remain eligible because the resolver supplies sign-only copy when houses are unavailable.

## Empty State

The empty state uses the approved wording:

> Your chart does not contain one of the six larger aspect patterns currently covered here. Your individual aspects still describe important connections between your planets.

## Rendered Fixture Examples

### Grand Square Parent

```text
Grand Square
Grand Square across Sun, Moon, Mars, and Saturn
Sun, Moon, Mars, and Saturn are tied into a four-part pattern where pressure can move around the whole square instead of staying in one simple conflict.
Supporting pattern detail: component T-squares are nested beneath this parent.
```

### Kite Parent

```text
Kite
Kite with Saturn drawing the pattern forward
This Kite keeps Grand Trine in place, while the opposition between Mars and Saturn gives the easier flow a direction to answer.
Supporting pattern detail: the underlying Grand Trine is nested beneath the Kite.
```

### Empty State

```text
Patterns in your chart
Individual aspects still matter.
Your chart does not contain one of the six larger aspect patterns currently covered here. Your individual aspects still describe important connections between your planets.
```

## Verification

- `npm run typecheck -w @tldr/web`
- `npm run test:natal-aspect-pattern-reader`
- `npm run build:web`
- `npm run test:aspect-patterns-authored`
- `npm run test:aspect-patterns-api`
- `npm run test:aspect-patterns-copy`

`test:aspect-patterns-api` still prints the known Vite HMR `listen EPERM 0.0.0.0:24678` warning, then passes.

## Visual QA Note

A temporary flagged web server was started with `VITE_ENABLE_NATAL_ASPECT_PATTERNS=true` for browser inspection. The available in-app browser profile was at account creation and did not have a saved natal chart, so a live natal pattern card was not available to screenshot in that session. The reader contract was still verified through rendered fixture examples and automated contract/build checks.

## Deferred Work

- production rollout by enabling the feature flag
- richer screenshot QA using a saved chart that contains a supported pattern
- date-specific transit/progression activation of natal patterns
