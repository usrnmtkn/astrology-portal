# Verification

Base: `origin/main` at `624ab0a3ced7b65e220546d0a064452d3323aae5`

Package version: `v3-2026-08-12a`

## Coverage result

The canonical 21-aspect snapshot partitions as follows under full application
precedence:

| Tier | Count |
|---|---:|
| Reviewed sign/exact/pair phrasebook | 11 |
| Approved exact transit corpus | 8 |
| SOURCE_GAP | 2 |

The two source gaps are:

- `moon|sextile|chiron|pisces|taurus`
- `moon|conjunction|north-node|pisces|aquarius`

Both Node and browser package renderers return `SOURCE_GAP` for unsupported
copy. The application and Calendar can still select approved exact and
generated tiers before deciding that interpretation copy is unavailable.

The factual aspect remains visible when interpretation is unavailable:

- Sky keeps the aspect title, timing, orb, and clickable detail route;
- Sky placement details keep a factual related-aspect row;
- Calendar keeps the event heading and time;
- none of those source-gap states renders an interpretation paragraph.

## Approved-row invariant

No source row under `apps/web/src/content/fallbackArchitectureV3/source-rows/`
or approved astrology record under `packages/astro-knowledge/data/` changed.
Therefore all previously approved row bodies remain byte-identical.

## Gates

- `npm run build -w @tldr/astro-knowledge`: PASS
- fallback browser bundle regeneration: PASS
- `npm run build:fallback-manifest`: PASS, 8,155 keys
- content-book regeneration: PASS
- `node scripts/test-reviewed-sky-aspect-phrasebook.mjs`: PASS
- `node scripts/test-deferred-fallback-runtime.mjs`: PASS
- `node scripts/test-calendar-exact-sky-aspect-routing.mjs`: PASS, 215 records / 430 directions
- `node scripts/test-calendar-content-hydration.mjs`: PASS
- `node scripts/test-sky-aspect-matrix-parity.mjs`: PASS at two direct ephemeris instants
- focused Calendar visual contract: PASS; four aspect events, three approved
  interpretation bodies, one factual source-gap event with no body
- `node scripts/test-reader-facing-content-contract.mjs`: PASS
- `npm run test:content`: PASS
- `npm run typecheck -w @tldr/web`: PASS
- `npm run build -w @tldr/web`: PASS
- `npm run qa:bundle`: PASS
- `git diff --check`: PASS

The broad legacy script
`apps/web/src/content/fallbackArchitectureV3/tests/verify-transit-synastry.mjs`
still reports its pre-existing repository-wide role, placeholder, and incomplete
placement failures. Its Sky-aspect loop was updated to distinguish approved
specific renders from intentional source gaps; the authoritative focused and
full content suites above pass.

## Remote state

No dashboard synchronization, merge, or deployment was performed. The isolated
implementation is published only as a review branch and pull request.
