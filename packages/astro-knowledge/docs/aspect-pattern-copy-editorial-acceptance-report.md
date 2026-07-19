# Aspect Pattern Copy Editorial Acceptance Report

This pass reviews, revises, and locks the governed fallback copy for the six aspect patterns.

It does not add reader UI, authored copy records, editable admin content, AI generation, transit/progression activation, planetary chart-shape interpretation, or detector/ranking changes.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/fixtures/copy/index.js`
- `packages/astro-knowledge/docs/aspect-pattern-copy-review-ledger.md`
- `packages/astro-knowledge/docs/aspect-pattern-copy-editorial-acceptance-report.md`
- `packages/astro-knowledge/scripts/test-aspect-pattern-engine.js`
- `scripts/test-aspect-pattern-copy-fixtures.mjs`
- `package.json`

## Editorial Changes

Revised fallback wording to remove:

- report-like phrasing
- technical reader-facing terms
- internal implementation language
- repeated geometry explanations
- overconfident Yod, Grand Trine, and Mystic Rectangle language
- apex language for patterns without an apex
- emergency fallback wording that referred to the resolver

The approved copy now uses:

- simple pattern names
- concrete planet role descriptions
- sign-only routes when houses are unavailable
- house-aware routes when a house is supplied
- possible/flexible wording for partial and wide patterns
- qualified Yod wording for all Yod contexts

## Golden Fixtures

Approved resolved outputs are locked in:

`packages/astro-knowledge/engine/aspect-patterns/fixtures/copy/index.js`

The fixture set covers:

- exact/strong T-square
- T-square with house data
- partial T-square
- exact/strong Grand Square
- contained T-square under Grand Square
- exact/strong Grand Trine
- multiple Grand Trines in a real fixture
- exact/strong Kite
- contained Grand Trine under Kite
- exact/strong Yod
- Yod with house data
- wide real Yod
- exact/strong Mystic Rectangle
- emergency fallback for all six pattern types

## Tests

Added:

`scripts/test-aspect-pattern-copy-fixtures.mjs`

The test verifies:

- golden wording remains byte-stable
- resolution is deterministic
- house-present and house-absent routes remain stable
- wide Yod uses flexible wording
- Grand Square and Mystic Rectangle do not receive apex language
- Kite preserves the opposition and underlying Grand Trine
- T-square preserves apex/action-point and empty-leg distinction
- internal scores, warning codes, and source aspect IDs do not appear in copy
- emergency fallback remains readable for all six patterns

## Blocked Wording

Blocked examples are documented in:

`packages/astro-knowledge/docs/aspect-pattern-copy-review-ledger.md`

Most important removals:

- `derived point`
- `element consistency`
- `resource planets`
- `geometry confidence`
- `The resolver can identify`
- `A qualified ... pattern`
- Yod fate/destiny/Finger of God language remains prohibited

## Deferred Work

The authored pattern-copy library and read-only admin coverage view remain the next step. Reader integration should wait until authored and fallback paths resolve through the same contract.
