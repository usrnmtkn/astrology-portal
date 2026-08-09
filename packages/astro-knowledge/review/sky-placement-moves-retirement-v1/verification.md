# Verification

Verified 2026-08-09 against `origin/main` at `d1a9361c`.

- Removed source rows: 156.
- Remaining approved `sky-placement-moves` content keys: 0.
- Full package key count: 7,197, down exactly 156 from 7,353.
- Sky Placement partition key count: 773, down exactly 156.
- Other approved source rows compared byte-identically: 4,163.
- Node and browser placement resolvers contain no moves lookup lane.
- Placement rendering exposes no `moves` property and no `Try this` section.
- `PACKAGE_VERSION`: `v3-2026-08-09a`.

Passing gates:

- `node scripts/test-sky-placement-regressions.mjs`
- `node scripts/generate-fallback-package-manifest.mjs --check`
- `npm test`
- `npm run test:performance-contracts`
- `npm run qa:bundle`

The standalone legacy `verify-fallback-architecture.mjs` reports 151 stale
Moon/emergency-family and pre-existing row-hygiene failures on both this branch
and untouched `origin/main`. Its new moves-retirement assertion passes; this
package introduces no additional failure in that verifier.
