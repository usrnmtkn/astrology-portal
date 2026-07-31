# Calculation And API Integrity Audit

Status: release blocker. The broader Dashboard/content migration is paused until this file, the fact contract, and independent verification are complete.

## Current Calculation Stack

- Primary library: `swisseph-wasm`.
- Package version: `0.0.5` from `apps/web/package.json`.
- Runtime data artifact: `node_modules/swisseph-wasm/wasm/swisseph.wasm`; copied/browser artifact also exists at `apps/web/public/wasm/swisseph.wasm`.
- Local binary oracle: none found. `swetest` is not installed in this workspace.
- Second independent provider: not configured. `scripts/verify-astrology-integrity.mjs` blocks by default until `TLDR_ASTRO_VERIFY_PROVIDER_COMMAND` is supplied.

## Supplied Reference Sources

Source registry: `scripts/fixtures/ephemeris-source-registry.json`

- NASA/JPL Horizons API: `https://ssd.jpl.nasa.gov/api/horizons.api`
  - Intended role: configured independent partial oracle.
  - Current ingestion status: wired through `scripts/providers/nasa-horizons-provider.mjs` and `TLDR_ASTRO_VERIFY_PROVIDER_COMMAND`.
  - Why selected: credential-free, authoritative JPL output, independent of the app's Swiss Ephemeris implementation.
  - Coverage: verifies apparent geocentric ecliptic-of-date longitude/latitude for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, and Chiron; verifies direct/retrograde by finite difference; verifies aspects among supported bodies.
  - Gaps: does not verify lunar nodes, Lilith, Ascendant/Descendant/Midheaven/IC, house cusps, station timestamps, retrograde shadow boundaries, or transit exact-hit bisection in the current adapter.
- Astro.com Swiss Ephemeris 2026 PDF: `https://www.astro.com/swisseph/ae/2000/ae_2026.pdf`
  - Intended role: authoritative reference candidate.
  - Current ingestion status: blocked in this environment. The URL redirects to `https://www.astro.com/cgi/prep.cgi/swisseph/ae/2000/ae_2026.pdf`, but direct fetch returned Astro.com's browser-check HTML page rather than a PDF.
  - Release requirement: provide a locally downloaded PDF through `TLDR_ASTROCOM_SWISS_EPHEMERIS_2026_PDF` or wire another authoritative machine-readable provider.
- Cafe Astrology 2026 Ephemeris: `https://cafeastrology.com/2026-ephemeris.html`
  - PDF: `https://cafeastrology.com/wp-content/uploads/2022/03/2026ephemeris.pdf`
  - Intended role: secondary sanity source only.
  - Current ingestion status: downloadable and text-extractable.
  - Caveat: Cafe Astrology states its tables are daily tropical longitudes at midnight Eastern Time, and notes PDF timezone caveats for March and November 2026 around DST. It does not verify arbitrary-location houses/angles.

## Current Configuration

- Zodiac: tropical. No sidereal ayanamsa is configured in local calculations.
- Frame: geocentric. No topocentric flag is currently used.
- Planet flags: `SEFLG_SWIEPH | SEFLG_SPEED`.
- Node: True Node via `SE_TRUE_NODE`; the South Node is derived as its exact opposition.
- Lilith: mean Black Moon Lilith constant `12`.
- Chiron: constant `15`.
- Houses/angles: `swe.houses(..., "W")` for Ascendant and Midheaven angle data, with Whole Sign house cusps derived from 0 degrees of the rising sign.
- Displayed planet house assignment: whole-sign house from Ascendant sign. This is explicit in fact provenance as `planetHouseSystem: "whole_sign"` and `houseSystem: "whole_sign"`.
- Longitude normalization: normalized into `[0, 360)`, signs by 30-degree tropical segments, sign degree rounded to two decimals.
- Timezone/DST: local-date helpers use `Intl.DateTimeFormat(..., { timeZone })`; sky date input is converted through `zonedDateTimeToUtc`.
- API calendar endpoint cache: `private, max-age=300, stale-while-revalidate=3600`.
- Astrology facts endpoint cache: `private, max-age=60, stale-while-revalidate=300`.

## Algorithms Inventory

- Retrograde determination: speed `< -0.0001`.
- Retrograde stations: search speed sign changes, then binary-refine the station event.
- Retrograde shadow boundaries: nearest previous/next longitude crossings around station longitudes.
- Cazimi: angular separation from Sun `<= 1 degree`.
- Current sky aspects: conjunction, sextile, square, trine, opposition at an
  allowed orb of `<= 5 degrees`, plus quincunx at `<= 3 degrees`. The reader and
  content-generation adapter use the same shared matrix engine, point set, and
  exact calculation instant. The South Node is derived exactly opposite the
  Swiss Ephemeris True North Node.
- Calendar aspects: same major aspects, with exact event detection by sign-change crossing of aspect distance.
- Applying/separating for snapshot aspects: approximate next six-hour separation from current longitude plus one-quarter-day speed.
- Lunar phase: Sun-Moon elongation buckets.
- Void Moon: last Moon aspect before next Moon ingress.
- Solar daylight: local horizon crossing at `-0.833` degrees apparent altitude.
- Event ranking/deduplication: calendar and Sky ranking still need a dedicated audited spec for all surfaces; current code has local ranking branches.
- Axis canonicalization: Ascendant/Descendant and Midheaven/IC axis IDs are now represented in `AstrologyFact`.

## Immutable Fact Contract

Canonical schema lives in `apps/web/src/services/astrologyFacts.ts`.

Facts are separate from interpretation and include:

- calculation timestamp and timezone;
- ephemeris source/version;
- planet or point ID;
- longitude and latitude where relevant;
- normalized sign and degree;
- direct/retrograde state;
- retrograde phase;
- station and shadow boundaries;
- aspect type;
- exact angular separation;
- orb;
- applying/separating;
- natal/transiting/current-sky role;
- target type;
- house and house system;
- canonical axis ID;
- exact date and active window;
- pass number and total passes;
- calculation provenance/version;
- validation status.

Templates and content records must not supply or override these factual fields.

## API Contract

`GET /api/astrology-facts?date=<iso-or-date>&lat=<number>&lon=<number>&timeZone=<iana>&label=<label>`

Returns:

- `ok`;
- `generatedAt`;
- `provenance`;
- `validation`;
- `sky`;
- `facts`.

If fact validation fails, the endpoint returns `422` with diagnostics and an empty fact list. It does not fabricate sample astrology data.

## Failure Behavior

- Calculation failure: no fabricated card; the affected sky snapshot is not rendered as valid.
- Cache read/write validation failure: structured console diagnostic `[astrology-fact-validation]`; invalid cached snapshot is ignored and invalid fresh snapshot is not written.
- API validation failure: `422` with structured diagnostics.
- Content resolver: current retrograde/station resolver requires exact fact/provenance match for supported station/retrograde rows.
- Last verified fact preservation: implemented for browser current-sky snapshots
  only. The cache is schema-versioned, timestamped, fact-validated, isolated by
  date/location/timezone, capped at 24 entries, and expires after 30 minutes.
  Natal and relationship calculations still fail closed. Durable server-side
  fact persistence is not implemented.

## Developer Diagnostics

The Sky page now exposes a developer-only calculation diagnostics panel when `import.meta.env.DEV` or `VITE_ASTRO_DIAGNOSTICS=true`.

The diagnostic is enabled automatically in local development and can be enabled
in a deployed environment with `VITE_ASTRO_DIAGNOSTICS=true`. It reports:

- calculation engine and library version;
- calculation timestamp and timezone;
- zodiac frame, house system, and lunar-node model;
- calculation contract version;
- normalized fact ID;
- content record ID sample;
- snapshot/live source;
- hydration state;
- cache age;
- snapshot verification status.

## Independent Verification Harness

Script: `scripts/verify-astrology-integrity.mjs`

Fixtures: `scripts/fixtures/astrology-integrity-fixtures.json`

Independent provider adapter:

```bash
TLDR_ASTRO_VERIFY_PROVIDER_COMMAND="node scripts/providers/nasa-horizons-provider.mjs" \
TLDR_ASTRO_VERIFY_REPORT_PATH="/private/tmp/tldrastro-horizons-verification-report.json" \
node scripts/verify-astrology-integrity.mjs
```

Latest Horizons-backed run:

- Status: monitoring pass, `PARTIAL_WITH_GAPS` for all ten fixtures.
- Discrepancies in Horizons-verifiable facts: `0`.
- Verified facts: 90 planetary positions, 10 Moon positions, 10 Chiron
  positions, and 134 aspects among supported bodies.
- Unverified facts/gaps: 351, covering nodes, Lilith, angles, house cusps,
  aspects involving unsupported points or unsupported aspect types, stations,
  shadow boundaries, and exact hits.
- Boundary coverage includes the Sun immediately before and after its 2026
  Aries ingress and the near-exact 2026 Saturn-Neptune conjunction.

Default behavior:

- Computes primary facts through the app module graph.
- Validates first-party facts.
- Requires a second provider command through `TLDR_ASTRO_VERIFY_PROVIDER_COMMAND`.
- Exits blocked when the provider is missing.

Temporary local audit mode:

```bash
node scripts/verify-astrology-integrity.mjs --allow-missing-provider
```

Release-gate mode:

```bash
TLDR_ASTRO_VERIFY_PROVIDER_COMMAND="path-or-command-that-reads-fixture-json-and-prints-reference-facts-json" node scripts/verify-astrology-integrity.mjs
```

The reference provider must return:

```json
{
  "facts": []
}
```

Reference facts are compared by kind, point IDs, target IDs, and aspect type.

## Required Fixture Coverage

Covered in the current fixture file:

- multiple timezones;
- DST boundary;
- northern, southern, and high-latitude locations;
- births/current sky near midnight;
- all three 2026 Mercury retrograde cycles;
- July 12, 2026 Mercury in Cancer retrograde passage coherence.

Still incomplete before release:

- second-provider planetary longitude comparisons;
- second-provider Moon/node comparisons;
- second-provider Asc/Desc/MC/IC comparisons;
- all 12 house cusp comparisons;
- aspect just-inside and just-outside orb fixtures;
- applying/separating reference fixtures;
- exact transit timestamp comparisons;
- retrograde station and shadow-boundary reference comparisons;
- representative natal, You Transit, and Friend Transit fact fixtures;
- persisted-event and hydration-merge API comparison fixtures.
