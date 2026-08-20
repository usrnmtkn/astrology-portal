# Natal Moon final V3 render truncation repair — 2026-08-20

## Incident

The 24 owner-approved final Moon source rows and all 144 approved sign/house render hashes were present in the production bundle, but the You natal-placement article did not display the complete copy. `natalPlacementV3NormalizedSections` passed each already-rendered section through `firstReaderFacingCopy`, which retained only the first paragraph.

For Moon in Scorpio in the 6th house, this reduced the approved sign section to the shared Moon introduction and reduced the approved house section to the canonical 6th-house bridge. The Scorpio lived paragraph and the 6th-house lived paragraph were dropped at the app normalization boundary.

## Repair

- Preserve every reader-safe paragraph when a placement part carries the governed `fallback-hook/natal-you-placement-*` key.
- Keep the existing first-paragraph behavior for other placement paths, so this repair does not change Friend or Compatibility rendering.
- Classify `fallback-hook/natal-you-placement-house-final/*` as exact house copy for the section heading.
- Do not modify any approved source row or rendered V3 artifact.

## Regression coverage

`scripts/test-natal-moon-final-serving-v3.mjs` now passes every one of the 144 approved Moon sign/house renders through the same app-boundary normalizer and requires exact equality with the owner-approved V3 passage and SHA-256 evidence. It also proves that the preservation behavior is limited to the final You placement family.
