# TLDR Astro Calculation API Migration Checklist

This checklist maps the current app responsibilities to the new calculation API.

## Current Frontend Responsibilities To Move

### `apps/web/src/services/ephemeris.ts`

Move to API:

- Swiss Ephemeris initialization.
- Planetary position calculation.
- Ascendant and midheaven calculation.
- Whole-sign house assignment.
- Current sky aspects.
- Moon phase.
- Moon sign transition.
- Void-of-course status.
- Next lunation.
- Sign transit windows.

Keep in frontend:

- Display formatting.
- Wheel rendering.
- Glyph/icon rendering.
- UI-specific filtering and responsive behavior.

### `apps/web/src/services/timezones.ts`

Move to API:

- Location to timezone resolution.
- Local date/time to UTC conversion.
- Historical DST handling.

Keep in frontend:

- Browser timezone fallback for guest/default sky views.
- Form display values.

### `apps/web/src/App.tsx`

Move to API or shared engine:

- Transit-to-natal candidate construction.
- Applying/separating phase.
- Exact transit timing where computable.
- Synastry aspect and house-overlay calculation.
- Composite chart calculation.
- Time-lord period calculation.
- Timing boosts for transit ranking.
- Content fact packet construction.

Keep in frontend:

- Surface-specific layout.
- User-selected filters.
- Life area preference sorting, unless the API receives those preferences.
- Modal/detail state.

### `packages/astro-knowledge/engine/timing`

Short term:

- Reuse this package from the API if the API is Node-based.
- Port or mirror the logic if the calculation API is Python/FastAPI.

Long term:

- Keep timing ranking reusable between web and API, or move timing fully into
  the API once the backend fact packets are stable.

## Suggested Implementation Sequence

1. Create the API package or service.
2. Implement `GET /health` and `GET /reference/config`.
3. Implement timezone resolution and write pre-1970/DST tests.
4. Implement `POST /chart/natal`.
5. Replace one internal frontend natal calculation call with the API response.
6. Implement `POST /sky/current`.
7. Replace Sky Today calculation with the API response.
8. Implement `POST /chart/transits`.
9. Wire You Today transit ranking to API candidates.
10. Implement `POST /relationship/synastry`.
11. Implement `POST /relationship/composite`.
12. Implement `POST /relationship/compare`.
13. Wire Friends relationship views to `/relationship/compare`.
14. Implement profections.
15. Implement zodiacal releasing.
16. Implement firdaria.
17. Implement `POST /timing/personal`.
18. Add timing boosts to `/chart/transits` and `/relationship/compare`.
19. Implement `POST /content/facts`.
20. Update generated content flows to consume API fact packets.

## Data Compatibility Notes

The existing UI expects `SkySnapshot` and `PlanetPosition`-like fields. The API
can return richer data, but should include these compatibility fields at first:

- `planet`
- `glyph`
- `sign`
- `signGlyph`
- `degree`
- `house`
- `motion`
- `theme`
- `transitStart`
- `transitEnd`
- `transitRemainingLabel`

Richer API-native fields should be added alongside them:

- `point`
- `longitude`
- `degreeDecimal`
- `minute`
- `retrograde`
- `speed`
- `declination`

## Risks To Resolve Early

- Swiss Ephemeris licensing and deployment terms.
- Whether v1 runs as Python/FastAPI or Node with a Swiss Ephemeris/WASM runtime.
- Ephemeris file packaging on Vercel or the chosen host.
- Historical timezone accuracy for birth charts.
- Unknown birth time behavior.
- Confirm the first deployed version exposes Whole Sign as the only supported
  house system in the request/response contract.
- Whether zodiacal releasing requires lots from the natal endpoint in every
  response.

## First Verification Fixtures

Create fixture tests for:

- Known natal chart with Sun, Moon, Ascendant, and MC.
- Same chart through web and API, verifying Whole Sign house assignment parity.
- DST transition date.
- Pre-1970 birth date.
- Current sky snapshot.
- Saturn transit to natal Venus.
- Two-person synastry with at least one exact major aspect.
- Composite midpoint handling across 0 Aries.
- Annual profection Lord of the Year.
- Zodiacal releasing from Fortune and Spirit.
- Firdaria day and night chart examples.
