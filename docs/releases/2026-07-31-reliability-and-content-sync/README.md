# TLDR Astro Reliability And Content Sync Release

Release date: 2026-07-31

Production: [tldrastro.vercel.app](https://tldrastro.vercel.app)

This release strengthens calculation provenance, adds independent NASA/JPL
monitoring, introduces a safe current-Sky recovery cache, reconciles the
Fallback Architecture V3 package with Supabase, and moves GitHub-maintained
Actions to Node.js 24 runtimes.

## What Shipped

### Ephemeris integrity and provenance

- API health checks now perform fixed Sun and Moon calculations and report the
  engine that actually returned each result.
- Readiness checks fail when mounted Swiss Ephemeris data is expected but the
  calculation falls back to Moshier.
- Calculation responses carry the requested engine, returned engine, library
  version, data path, flags, fallback state, and calculation count.
- A weekly and manually dispatchable GitHub Actions workflow compares supported
  facts with NASA/JPL Horizons.
- Horizons requests run sequentially to respect JPL fair-use guidance. JSON,
  Markdown, and raw-response artifacts are retained for 90 days.

NASA/JPL Horizons is an independent shadow verifier, not a synchronous runtime
ephemeris. It can detect supported-fact drift without making reader requests
depend on a remote public service.

### Last-known-verified Sky recovery

- The browser can recover a current-Sky snapshot only when it was previously
  validated and marked `verified-primary` or `verified-independent`.
- Cache entries are isolated by date, coordinates, and timezone.
- Entries expire after 30 minutes and the cache holds at most 24 snapshots.
- The UI identifies cached results and continues attempting a live refresh.
- Natal, synastry, composite, and other personal calculations remain excluded
  and fail closed.

### Fallback Architecture V3 reconciliation

The bundled reader package and its Supabase mirror now share this manifest:

| Field | Value |
| --- | --- |
| Package version | `v3-2026-07-31a` |
| Supabase rows | `7,382` |
| Reader package keys | `7,007` |
| Content hash | `6e9a07ecf8e989d0bff2941683e957fc` |
| Key-manifest hash | `443892a75ab14c1362ab1f195532e7d7` |

Post-write verification reported zero missing, stale, duplicate, or changed
rows. The synchronization normalized package metadata without changing
reader-facing copy.

The package work also:

- preserves every authored-content role, nullable headlines, dual-voice
  bodies, blank-review templates, and canonical source history during export;
- retains authored cards that use `body_you` and `body_they` without a generic
  `body`;
- accepts vocabulary records whose `grammar_frame` is intentionally absent;
- keeps the approved Moon-in-Scorpio placement row available;
- loads packaged planet-topic vocabulary synchronously so Saturn and other Sky
  cards do not warn while the remote cache is still loading;
- fails closed to the bundled package when a remote package is incomplete or
  has an invalid version or hash.

### CI runtime maintenance

All repository workflows now use:

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/upload-artifact@v6`

Application tests still run on Node.js 22. The v6 upgrades change the internal
runtime of the GitHub-maintained Actions to Node.js 24 and remove the previous
Node.js 20 deprecation annotation.

## Operating The Release

Run the local release gates from the repository root:

```bash
npm run test:aspect-patterns
npm run test:content
npm run typecheck
npm run build:web
```

Run the independent Horizons comparison with:

```bash
TLDR_ASTRO_VERIFY_PROVIDER_COMMAND="node scripts/providers/nasa-horizons-provider.mjs" \
npm run qa:ephemeris:horizons
```

Materialize the V3 mirror without changing Supabase:

```bash
npm run content:materialize-fallback-v3 -- \
  --out=/private/tmp/tldr-fallback-dashboard-rows.json
```

Verify the live mirror after loading the required Supabase environment
variables:

```bash
npm run content:verify-fallback-v3
```

Applying rows is intentionally not the default command. After reviewing the
materialized output and confirming the package manifest, an authorized operator
can run:

```bash
node scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs \
  --apply \
  --verify \
  --out=/private/tmp/tldr-fallback-dashboard-rows-applied.json
```

The apply command requires `SUPABASE_SERVICE_ROLE_KEY` plus `SUPABASE_URL` or
`VITE_SUPABASE_URL`. Never commit those values.

## Production Verification

- Fallback mirror: 7,382 rows verified with zero missing, stale, duplicate, or
  changed rows.
- Reader manifest: all 7,007 keys and both hashes matched the bundled package.
- NASA/JPL workflow: passed, including Node.js 24 artifact upload.
- Content tests, aspect-pattern tests, typecheck, and production build: passed.
- Final `main` visual smoke: passed in 6m43s.
- Final GitHub check annotations: zero.
- Vercel production deployment: completed successfully.
- Production browser: Saturn rendered correctly with no planet-topic or V3
  package-validation warning.

## Known Boundaries

- Horizons currently verifies supported geocentric planetary positions,
  motion, and supported aspects. It does not yet cover angles, houses, nodes,
  Lilith, stations, shadow boundaries, or exact-hit bisection.
- Workflow artifacts are retained for 90 days; durable external audit storage
  is still future work.
- The verified-Sky cache is a short recovery window, not a general offline mode
  or a replacement calculation engine.

## Related Documentation

- [Ephemeris reliability roadmap](../../ephemeris-reliability-roadmap.md)
- [Calculation and API integrity audit](../../calculation-api-integrity-audit.md)
- [Content-management architecture](../../content-management/ARCHITECTURE.md)
- [Cumulative release notes](../../release-notes.md)

## Pull Requests

- [PR #11: reconcile the live fallback package](https://github.com/usrnmtkn/astrology-portal/pull/11)
- [PR #12: fix V3 mirror row reconstruction](https://github.com/usrnmtkn/astrology-portal/pull/12)
- [PR #13: upgrade GitHub Actions to Node.js 24 runtimes](https://github.com/usrnmtkn/astrology-portal/pull/13)
