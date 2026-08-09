# Venus in Libra house cores: implementation verification

Verified 2026-08-09 against `origin/main` at `d1a9361c`.

- Owner approval: exact wording approved with the statement `it's faithful`.
- Source rows: 12 approved `house_horoscope_core` rows, houses 1 through 12.
- Fidelity: every `body_you` is byte-identical to the matching body in the owner package.
- Reader variants: every `body_they` is byte-identical to `body_you`; no render-time rewrite occurs.
- Runtime boundary: only `sun/leo` and `venus/libra` house-core pairs are eligible. Other planet/sign pairs throw `SOURCE_GAP` and the app hides the personalized block.
- Reader bundle: provenance fields (`notes`, `source_keys`, `approved_via`) are excluded.
- Existing content: all 929 previously approved Sky Placement reader rows remain byte-identical.
- Generated package: version `v3-2026-08-09b`, 7,365 total keys, 941 Sky Placement keys.

Passing gates:

- `node scripts/test-venus-libra-house-cores.mjs`
- `node scripts/test-sun-leo-house-cores.mjs`
- `node scripts/test-fallback-package-cache-contract.mjs`
- `node scripts/test-fallback-refresh-wiring.mjs`
- `npm test`
- `npm run test:performance-contracts`
- `npm run qa:bundle`

Flight rule v2 remains in force. This package queues behind the Sky Placement moves-retirement change and must be rebased onto current `main`, regenerated, and reverified immediately before merge.
