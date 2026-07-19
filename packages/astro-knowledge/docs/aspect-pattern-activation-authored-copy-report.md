# Aspect Pattern Activation Authored Copy Report

This pass adds the first authored activation-copy library and read-only coverage view.

It does not add reader-facing activation UI, editable admin controls, AI generation, progression activation, empty-leg or fallout-point activation, planetary chart-shape activation, new transit calculations, or changes to activation matching, scoring, timing aggregation, primary-trigger selection, natal detection, or natal ranking.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `api/admin/aspect-pattern-activation-copy-coverage.ts`
- `apps/admin/src/AspectPatternActivationCoverage.tsx`
- `apps/admin/src/GeneratedContentAdminDashboard.tsx`
- `scripts/test-aspect-pattern-activation-authored-copy.mjs`
- `scripts/test-aspect-pattern-activation-copy.mjs`
- `package.json`
- `packages/astro-knowledge/docs/aspect-pattern-activation-authored-copy-report.md`
- `packages/astro-knowledge/docs/aspect-pattern-activation-authored-copy-coverage-report.md`

## Authored Routes

Added one approved authored activation record for each initial route:

- `t_square.apex`
- `t_square.opposition_member`
- `grand_square.member`
- `grand_trine.member`
- `kite.focal_planet`
- `kite.resource_planet`
- `yod.apex`
- `mystic_rectangle.member`

Timing, trigger mode, shared-planet, and confidence variants remain governed conditional sections inside each record.

## Manual Approval

The eight authored routes were reviewed against the approved fallback output. Each route remains `approved`.

Confirmed:

- T-square apex and opposition-member copy describe different roles.
- Grand Square and Mystic Rectangle contain no apex language.
- Kite focal and resource routes both preserve the opposition and Grand Trine.
- Yod remains qualified and contains no fate, calling, karmic, or turning-point language.
- Timing clauses do not repeat the overview.
- Multi-trigger and shared-planet clauses do not imply equal intensity.
- No internal scores, warnings, policy names, or reason codes render as copy.
- Wide and partial natal patterns remain qualified through conditional confidence notes.

## Resolver Changes

The production resolver now preserves this precedence:

```text
approved authored activation record
-> approved source-grounded activation template
-> governed madlib fallback
-> emergency fallback
```

Authored records are normalized to the existing `ResolvedAspectPatternActivationCopy` contract. Draft, reviewed, deprecated, or ineligible authored records do not override fallback output.

When multiple authored records qualify, selection is deterministic:

```text
exact role match
-> narrower confidence eligibility
-> narrower timing eligibility
-> higher authored priority
-> stable record ID
```

## Guardrails

- T-square apex and opposition-member records route separately.
- Kite focal and resource planet records route separately.
- Grand Square and Mystic Rectangle authored copy contains no apex language.
- Kite authored copy preserves the opposition and underlying Grand Trine.
- Yod authored copy blocks fate, destiny, calling, chosen, karmic, and turning-point language.
- Internal IDs, scores, reason codes, warning codes, and policy names are not rendered into copy.
- Removing authored records restores the byte-identical fallback golden output.

## Admin

Added read-only coverage at:

```text
#content/aspect-pattern-activation
```

The page calls:

```text
GET /api/admin/aspect-pattern-activation-copy-coverage
```

It shows route coverage, authored registry metadata, validation status, and production resolver previews comparing authored output against approved fallback output. It performs no write requests.

## Verification

- `npm run test:aspect-patterns-activation-authored`
- `npm run test:aspect-patterns-activation-copy`
- `npm run test:aspect-patterns-activation`
- `npm run test:aspect-patterns-api`
- `npm run test:aspect-patterns-diagnostics`
- `npm run test:natal-aspect-pattern-reader`
- `npm run test:aspect-patterns -w @tldr/astro-knowledge`
- `npm run typecheck -w @tldr/web`

The Vite-based tests still print the sandbox HMR warning `listen EPERM 0.0.0.0:24678`, but exit successfully.

## Deferred Work

- manual review of the eight authored routes in the coverage view
- feature-flagged reader activation section using only `ResolvedAspectPatternActivationCopy`
