# Aspect Pattern Real-Transit Activation Validation Report

This pass validates the date-specific natal aspect-pattern activation layer against de-identified real natal pattern fixtures plus controlled transit-to-natal aspect inputs.

It does not add activation interpretation copy, phrasebank content, reader-facing activation UI, editable admin content, AI generation, progression activation, derived-point activation, planetary chart-shape activation, or changes to natal pattern detection/ranking.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/real/index.js`
- `scripts/test-real-aspect-pattern-activation-fixtures.mjs`
- `package.json`
- `packages/astro-knowledge/docs/aspect-pattern-real-transit-activation-validation-report.md`

## Approved Fixture Coverage

Fixtures live in:

`packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/real/`

Covered cases:

- transit to a T-square apex
- transit to one end of a T-square opposition
- transit to a Grand Square member
- transit to a Kite focal planet
- transit to a Kite resource planet
- transit to a Yod apex
- transit to a Mystic Rectangle member
- transit to a planet repeated across several patterns
- multiple transits activating one pattern
- no matching transit
- applying aspect
- separating aspect
- exact aspect with `exactAt`
- unknown birth-time metadata

## Validation Checks

The regression test verifies:

- approved outputs remain deterministic
- reversed transit input order is byte-equivalent
- repeated natal planets fan out to every containing pattern
- parent and contained patterns remain separately activated
- natal `ranking.displayOrder` remains stable
- activation `currentDisplayOrder` remains stable
- applying and separating state is preserved
- `exactAt` is preserved when supplied
- empty activation is valid
- unknown birth-time metadata does not affect matching
- API activation output matches direct engine output
- activation remains absent without opt-in flags
- top-level `aspectPatterns` remains the same object as `sky.aspectPatterns`
- no prose-facing fields are generated

## Issue Ledger

| Case | Classification | Finding | Action |
| --- | --- | --- | --- |
| `transit-to-grand-square-member-repeated` | EXPECTED_OVERLAP | A Moon transit activates both retained Grand Squares and the component T-squares that contain Moon. | Approved; no code change. |
| `transit-to-kite-resource-planet` | EXPECTED_OVERLAP | A Moon transit activates both the Kite and its retained underlying Grand Trine. | Approved; no code change. |
| `transit-to-grand-square-member-repeated` | Fixture expectation correction | The first saved expected natal display order had two equal-priority component T-squares swapped relative to the existing stable ranking. | Corrected the fixture expectation only. |

No `ACTIVATION_MATCH_BUG`, `FAN_OUT_BUG`, `DEDUPLICATION_BUG`, `SCORING_ISSUE`, `SOURCE_ASPECT_ISSUE`, or `API_MAPPING_BUG` was confirmed.

## Confirmed Fixes

No activation engine fixes were required in this pass.

## Known Notes

The API test still prints the known Vite HMR `listen EPERM 0.0.0.0:24678` warning in this sandbox, then passes.

## Verification

- `npm run test:aspect-patterns-activation-real`
