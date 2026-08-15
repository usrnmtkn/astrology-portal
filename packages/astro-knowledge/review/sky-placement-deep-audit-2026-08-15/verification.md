# Verification

Date: 2026-08-15

## Invariants

- Audited routes: 168 (14 bodies × 12 signs).
- Approved source-row copy changed: 0 files.
- Billed model calls: 0.
- Rendered `Try this` sections: 0.
- Unresolved placeholders in rendered pages: 0.
- Owner-approved full pages: 80.
- Reader-visible thin pages: 10.
- Fail-closed pages: 78.
- Unsupported placement aspects: facts remain available to the page; generic interpretation renders nowhere.

## Tests

- `test-satori-editorial-policy`: PASS (47 active, 0 unresolved, 68 regression records).
- `test-sky-placement-stamp-gate`: PASS (5 assertions).
- `test-satori-writer`: PASS (7,695 indexed excerpts).
- `test-sky-placement-regressions`: PASS at `v3-2026-08-15a`.
- `test-sky-placement-serving-gate`: PASS.
- `test-authored-sky-placement-coverage`: PASS (120 checked rows).
- `test-fallback-refresh-wiring`: PASS (8,157 governed keys after manifest rebuild).
- `test-fallback-package-cache-contract`: PASS.
- `test-empty-house-refinement`: PASS.
- `generate-fallback-package-manifest --check`: PASS.
- `test:content` body (`--ignore-scripts`): PASS.
- `test:astro-writing`: PASS with 0 billed calls and 0 prose-model gate calls.
- `typecheck`: PASS.
- `build:web`: PASS.
- `git diff --check`: PASS.

The ordinary `test:content` wrapper remains red before the audited suite begins because `test-calendar-exact-sky-aspect-routing.mjs` detects a pre-existing Mercury-trine-Neptune registry/source drift. The identical failure reproduces on untouched main. This audit did not alter that approved aspect text.

## Artifact hashes

- `dist/tldr-content.js`: `0d5b92553fa50d8c3808c61305880ecfc2e2549850a62fdb509aa11463ba3790`
- `bundled-manifest-v3.json`: `3c9d12b158bc84dd8cbc544c93cbdfe90041414d143468add0de4054bb321491`
- `bundled-sky-placement-manifest-v3.json`: `3ad8ae2ad2709d9718138a4c658278d5c02bc5f116bfa615d738a20e508a575b`
- `bundled-sky-placement-owner-approved-reader-v1.json`: `a91112ea46ef543fae02e31b1e825f5a2e7049aaab6ac309d995628ea1526e91`
- Continuous approved body set: `515c7309a6969f16fa7958f3ca894244ed6aa1b624cc5b075e4475135163b45a`
