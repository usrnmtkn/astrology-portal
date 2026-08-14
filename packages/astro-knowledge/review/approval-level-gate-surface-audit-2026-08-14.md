# Approval-level gate surface audit — 2026-08-14

Status: audit complete on PR #229; no additional gate activated

The executable audit is `scripts/audit-approval-level-gated-surfaces.mjs`. It searches the runtime gate call sites and pins their current source-row exposure. “Fail” below means a source row is ineligible under the gate; it does not mean reader copy was modified.

## Ranked current gate exposure

| Rank | App surface | Rows read by the gate | Failing before #229 | Failing after #229 | Recommendation |
|---:|---|---:|---:|---:|---|
| 1 | Friends house-transit detail articles | 1,008 | 996 | 0 | Migrate now in #229 |
| 2 | Friends personal-transit detail articles | 385 | 385 | 0 | Migrate now in #229 |
| 3 | Friends house-detail support rows | 88 | 76 | 0 | Migrate now in #229 |
| 4 | Friends bond-transit effect body | 139 | 0 | 0 | No action; all 139 are already exact-owner-approved |
| 5 | Relationship lazy-bundle startup assertion | the same 139 bond rows | 0 | 0 | No action; all 139 are already exact-owner-approved |

Before #229, 12 of the 1,008 sign-specific house articles had a complete exact-approved intro/sign pair and all 385 personal-transit articles lacked an exact level. That left 1,381 of the 1,393 reachable Friends transit articles without an eligible prose section. #229 assigns the owner-ruling level to the traced-but-unhashed rows, accepts both owner levels, and leaves zero primary Friends transit articles disabled by approval metadata. Optional enrichment remains independently gated: 288 Jupiter/Saturn house renders can withhold an ungated retrograde or event paragraph without hiding their approved base article.

## Explicit owner evidence outside current gates

These app surfaces do **not** currently call the approval-level gate, so their fail-closed count today is zero. The “would fail” column is the tripwire exposure if someone enables the gate before reconciling their metadata.

| Surface | Corpus rows | Would fail if gated now | `approved` + explicit owner evidence | `approved_reuse` + owner evidence | Recommendation |
|---|---:|---:|---:|---:|---|
| Friends compatibility | 1,008 | 1,008 | 679 | 0 | No gate action now; migrate metadata in a dedicated scope before any future gate |
| Career | 54 | 54 | 0 | 54 | No gate action now; these are `approved_reuse` and require their own evidence classification |
| Sky, Calendar, stations, and weekly openers | 113 | 113 | 47 | 0 | No gate action now; migrate metadata in a dedicated scope before any future gate |

The previously cited 726 rows resolve to 679 compatibility rows plus 47 Sky/calendar rows. They do not include the 54 career rows because the 726 classification required `review_status: approved`; Career carries `approved_reuse`. Career's provenance text also mentions owner evidence, so its 54 rows are reported separately rather than silently discarded or folded into the 726 count.

## Gate inventory

The only production `approval.approvalLevel` gate call sites are:

1. `features/friends/transitDetailApproval.ts`, used by `ManualChartsPanel.tsx` for Friends personal-transit sections, Friends house-transit sections, and Friends bond-transit effect bodies.
2. `content/fallbackArchitectureV3RelationshipBundle.ts`, which asserts that all 139 directional bond-effect rows are owner eligible before the relationship lazy bundle loads.

Compatibility, Career, Sky, Calendar, station, and weekly renderers do not currently gate on `approvalLevel`. No gate was added or relaxed for those surfaces by this audit.
