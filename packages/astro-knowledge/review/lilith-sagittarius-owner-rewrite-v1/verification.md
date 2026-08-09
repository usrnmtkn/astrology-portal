# Lilith in Sagittarius owner rewrite: verification

Verified 2026-08-09 against `origin/main` at `d1a9361c`.

- Replaced exactly three serving Lilith-in-Sagittarius placement rows and one sign-specific sextile row.
- All four serving bodies match the owner package exactly.
- Preserved the ruled `Until {{exitDate}}` wording without editing the repeated “until.”
- Confirmed the Sky surface supplies Lilith `transitStart` and `transitEnd` from the ephemeris.
- Added a Lilith/Sagittarius-only guard: `{{exitDate}}` resolves from engine context; an absent date throws `SOURCE_GAP`.
- Preserved the global sextile framing template unchanged.
- Preserved the aspect phrasebook’s `reviewed` status contract while recording the new exact owner approval in provenance.
- Added one provenance-locked exception for the exact owner-approved second-person aspect body; no other Sky Aspect row is exempted.
- Verified 3,757 non-target source rows byte-identical.
- Regenerated distribution artifacts from source at package version `v3-2026-08-09c`.

Passing gates:

- `node scripts/test-lilith-sagittarius-owner-rewrite.mjs`
- `node scripts/test-reviewed-sky-aspect-phrasebook.mjs`
- `node scripts/test-fallback-package-cache-contract.mjs`
- `node scripts/test-fallback-refresh-wiring.mjs`
- `node scripts/test-reader-facing-content-contract.mjs`
- `npm test`
- `npm run test:performance-contracts`
- `npm run qa:bundle`

Flight rule v2 remains in force. This package queues behind the Sky Placement moves-retirement PR and the Venus-in-Libra house-core PR. Before merge it must be rebased onto current `main`, regenerated, and reverified. The retired Lilith/Sagittarius moves row is intentionally untouched on this pre-retirement development base and will disappear through the predecessor merge.
