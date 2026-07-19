# Aspect Pattern Real-Chart Validation Report

This pass validates the math-only aspect-pattern engine against de-identified real calculated planetary positions and normalized aspects. It does not add interpretation copy, phrasebank content, reader cards, admin editing, transit activation, or chart-shape detection.

## Scope

Controlling spec: `packages/astro-knowledge/docs/aspect-pattern-engine-spec.md`

Validated surfaces:

- direct detector output
- base ranking output
- derived points
- structural relationships
- deterministic IDs
- reversed input order
- API diagnostics mapper
- missing birth-time metadata behavior

## Approved Fixtures

Real-chart fixtures live in:

`packages/astro-knowledge/engine/aspect-patterns/fixtures/real/`

Fixtures contain calculated planetary/aspect inputs only. They do not include names, locations, birth dates, or other personal identifying metadata.

| Fixture | Coverage | Pattern Count | Classification |
| --- | --- | ---: | --- |
| `no-pattern-a` | no canonical aspect pattern | 0 | none |
| `isolated-t-square-a` | isolated T-square | 1 | none |
| `grand-square-a` | Grand Square with retained T-squares | 9 | EXPECTED_AMBIGUITY |
| `grand-trine-a` | multiple Grand Trines | 2 | EXPECTED_AMBIGUITY |
| `kite-a` | Kite with retained Grand Trine | 2 | none |
| `yod-wide-a` | wide Yod | 1 | ORB_POLICY_ISSUE |
| `mystic-rectangle-a` | Mystic Rectangle | 1 | none |
| `overlap-grand-square-a` | overlapping Grand Squares and T-squares | 9 | EXPECTED_AMBIGUITY |
| `unknown-birth-time-a` | no birth-time angle metadata | 1 | SOURCE_DATA_LIMITATION |

## Review Checklist

For every approved fixture, the regression snapshot stores and verifies:

- pattern members
- source aspect IDs
- source aspect types and orbs
- pattern-specific roles
- derived points
- geometry confidence
- warnings
- structural relationships
- ranking reasons
- display order

## Issue Ledger

| Fixture | Classification | Finding | Action |
| --- | --- | --- | --- |
| `grand-square-a` | EXPECTED_AMBIGUITY | Two Grand Squares share the same Moon-Mars opposition and different outer-planet axes. Component T-squares remain visible. | Approved; no code change. |
| `grand-trine-a` | EXPECTED_AMBIGUITY | Two Grand Trines share Moon and Mars with Jupiter/Uranus alternatives. | Approved; no code change. |
| `overlap-grand-square-a` | EXPECTED_AMBIGUITY | Several overlapping parent and component patterns are mathematically defensible. | Approved; no code change. |
| `yod-wide-a` | ORB_POLICY_ISSUE | The Yod is valid under current orb policy but carries `wide_orb_pattern`. | Approved as a policy-review fixture; no code change. |
| `unknown-birth-time-a` | SOURCE_DATA_LIMITATION | No angle metadata is available for birth-time-based ranking boosts. Geometry remains unchanged. | Approved; no code change. |

No `GEOMETRY_BUG`, `RELATIONSHIP_BUG`, `RANKING_ISSUE`, or `DIAGNOSTICS_UI_BUG` was confirmed in this pass.

## Regression Coverage

Added:

`scripts/test-real-aspect-pattern-fixtures.mjs`

The test proves:

- approved fixture output remains byte-stable
- pattern IDs remain stable
- canonical pattern order remains stable
- reversing planet/aspect order produces identical output
- derived points remain stable
- parent/child relationships remain stable
- ranking reasons and `displayOrder` remain stable
- missing birth-time metadata does not alter geometry
- expected ambiguous patterns remain present
- component patterns are not lost after deduplication
- API diagnostics match direct engine output

## Confirmed Defects And Fixes

No confirmed defects were found, so no detector, relationship, ranking, API, or diagnostics UI logic was changed in this validation pass.

## Unresolved Expected Ambiguities

- `grand-trine-a`: two Grand Trines are retained.
- `grand-square-a` and `overlap-grand-square-a`: overlapping Grand Squares and component T-squares are retained.
- `yod-wide-a`: wide Yod remains valid under the current policy and is explicitly flagged for future orb-policy review.

The next review point remains the structured interpretation-context contract between ranked patterns and the copy resolver.
