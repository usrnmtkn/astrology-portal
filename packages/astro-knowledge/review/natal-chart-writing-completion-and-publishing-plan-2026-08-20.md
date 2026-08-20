# Natal chart writing completion and publishing plan

Date: 2026-08-20
Status: active plan of record
First execution unit: Moon on the You natal placement surface

## Owner direction combined here

This plan combines the full natal-chart writing rollout with the immediate steps that follow approval of the rebuilt Moon workbook.

- Compatibility pages and compatibility source files are read-only evidence. They do not change in this project.
- The You natal placement surface uses direct reader voice.
- Each house section opens with the canonical approved `It's in your [Nth] house, meaning...` bridge.
- Planet-specific house copy follows the bridge and is authored from the approved internal mechanism, not by editing serving prose.
- Childhood material remains a separate optional block for owner review. It is never silently included.
- Friend passages remain separately authored from the observer entry point.
- No review workbook, outline approval, or internal mechanism approval changes serving state by itself.

## Phase 1: reconcile authority and establish the Moon baseline

1. Preserve byte-identical copies of the owner rulings, approved mechanism record, source hashes, and canonical house bridge record in this branch.
2. Recompute the two compatibility-source hashes and fail if either source changed.
3. Inventory the 12 Moon sign candidates, their extracted childhood blocks, the 12 approved Moon-house mechanisms, and the 12 canonical house bridges.
4. Record the owner-liked Moon-in-Aries / 4th-house chat example as calibration evidence, not as a serving approval, because its bridge differs from the canonical stored bridge.

## Phase 2: Moon authoring-readiness review

1. Present all 12 Moon sign candidates with the optional childhood block separated from the no-childhood candidate.
2. Present one ten-line argument core and five quality intentions for each of the 12 Moon-house mechanisms.
3. Require an owner verdict on each house argument core before drafting the remaining house prose.
4. Include the Moon 4th-house and Moon 6th-house calibration bodies with the canonical bridge for comparison; both remain review-gated until the owner approves their exact rendered wording.
5. Show the 144 sign-by-house combinations as a render matrix. Rows without an approved house argument and reviewed house body remain explicitly blocked rather than filled with generic copy.

## Phase 3: draft and review the complete Moon workbook

After the owner approves all 12 house argument cores:

1. Draft the remaining house bodies from the approved mechanisms and outlines without using existing serving copy as sentence structure.
2. Run deterministic checks for provenance, hashes, bridge integrity, prior-copy exclusion, surface separation, banned strings, and required direct-reader voice.
3. Run semantic review for one coherent point, literal events, translation-required prose, unsupported biography, and paragraph flow.
4. Render all 144 Moon sign-and-house combinations.
5. Deliver one current owner workbook containing sign verdicts, separate childhood decisions, house verdicts, and final rendered samples. Superseded workbooks remain evidence only.

## Phase 4: atomic import after exact owner approval

1. Validate every approved row against its stable key and SHA-256.
2. Adopt `approve` exactly, adopt `edit` verbatim, and discard `cut`.
3. Reject partial, ambiguous, or stale imports without state changes.
4. Keep sign, house, and optional childhood decisions distinct in the approval record.

## Phase 5: serving publication

Only after Phase 4 succeeds:

1. Update the canonical You natal placement source rows; do not modify compatibility source files.
2. Regenerate fallback manifests, bundled content, content-book output, and any other derived artifacts from source.
3. Run the duplicate-contentKey gate, approved-row byte-identity checks, content suite, reader guards, web build, and Moon render smoke tests.
4. Open or update one scope PR, request owner admin-merge when green, deploy through the normal production path, and spot-check representative Moon signs and houses in production.

## Phase 6: scale after the Moon method is accepted

Repeat the accepted method for Sun, Mercury, Venus, Mars, Jupiter, and Saturn. Treat Nodes, Lilith, Chiron, angles, and Part of Fortune as separate governed batches because their mechanisms and source gaps differ. Natal aspects remain a separate inventory and are not changed by this placement-copy plan. Friend natal writing resumes only from owner-approved Friend calibration evidence.

## Hard invariants

- Compatibility copy and compatibility behavior remain byte-identical.
- Approved serving rows remain byte-identical without quoted owner approval.
- Unapproved wording never serves.
- Missing evidence or an unapproved outline fails closed.
- No auto-publish and no writer promotion.
- Generated artifacts are regenerated from canonical source and never merged across branches.
