# Lilith calculation migration: mean apogee (SE 12) → true/osculating apogee (SE 13)

Date: 2026-08-09. Owner decision recorded in `tldr-astro-lilith-fact-boundary.md` (approved).

## Changes

1. `apps/web/src/services/ephemeris.ts`: `SE_MEAN_BLACK_MOON_LILITH = 12` replaced by `SE_TRUE_BLACK_MOON_LILITH = 13` (SE_OSCU_APOG) in every browser calculation path. Lilith now participates in station events, active retrogrades, exact sky aspects, placement facts, and multi-pass sign residencies.
2. `services/tldrastro-api/src/tldrastro_api/services/chart.py`: the shared Python body registry now uses `swe.OSCU_APOG`. Natal, current sky, synastry, composite, and transit services all inherit the same true-Lilith position.
3. `apps/web/src/services/astrologyFacts.ts` and `apps/web/src/services/verifiedSkyCache.ts`: calculation contract versioned `tldrastro-calculation-v2` → `tldrastro-calculation-v3`; provenance requires `lilithType: "true"`; verified cache schema versioned to v2 and rejects older mean-Lilith snapshots.
4. `packages/astro-knowledge/data/points/black-moon-lilith.json`: type now "calculated point / true (osculating) lunar apogee"; orbit note documents monthly retrograde stations and sign revisits.
5. Contract tests updated to v3: `scripts/test-sky-node-api-contract.mjs`, `scripts/test-verified-sky-cache.mjs`, `scripts/test-web-api-house-parity.mjs`, and `scripts/test-sky-aspect-matrix-parity.mjs`.
6. New test `scripts/test-lilith-true-apogee-migration.mjs`, wired into the root `npm test` chain. It covers:
   - 2026-03-27: mean = Sagittarius, true = Scorpio (sign boundary divergence)
   - 2026-08-20: mean direct (always), true retrograde (motion divergence)
   - natal, synastry, transit, current-sky, and sky-placement surfaces use the true sign;
   - a true-Lilith station renders as a dated event;
   - Lilith placement facts expose re-entry passes and use the final residency exit;
   - provenance reports `lilithType: "true"` and `calculationVersion: "tldrastro-calculation-v3"`;
   - no runtime mean-Lilith constant remains reachable.

## Verification

- New migration test: PASS.
- Verified sky cache contract: PASS.
- Web/Python API parity, including the true-Lilith sign-divergence anchor: PASS.
- Sky node and sky-aspect matrix parity: PASS.
- Full content suite, including live Supabase coverage: PASS.
- Web TypeScript and production build: PASS.

## User-visible impact (expected, intentional)

True and mean Lilith currently differ by a whole sign: on 2026-08-09 mean = Sagittarius 26°, true = Capricorn 18° retrograde. Users' natal Lilith sign, house, degree, aspects, and direct/retrograde status can change. This is the intended migration, not a bug.

## Merge-time follow-ups

- Rebase after PR #129 merges or closes.
- Regenerate derived artifacts from the rebased source. Do not merge generated artifacts across branches.
- Refresh server-side or Supabase-cached natal/current-sky placements keyed to v2. Browser verified caches already fail closed through the new schema and provenance checks.
- Sky-aspect fallback hooks keyed to `lilith/sagittarius` fail closed while true Lilith is in Capricorn. Current-sign Lilith content remains a governed editorial follow-up under the approved refusals framing.
- The Dark Moon / Waldemath Lilith book remains excluded; it describes a different hypothetical point. Existing Black Moon Lilith source material remains relevant under the fact boundary.
