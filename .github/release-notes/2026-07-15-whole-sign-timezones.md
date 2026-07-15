# Whole Sign Houses + Global Timezone Resolution

## Summary

This release locks TLDR Astro to Whole Sign houses end to end and hardens worldwide birth-chart timezone resolution.

## Changes

- Whole Sign houses are now the consistent house system across web, API, wheels, and chart text.
- Ascendant and Midheaven remain plotted angle points; they are no longer treated as house-cusp boundaries.
- Birth-location timezone lookup now uses the API instead of browser-side coordinate guessing.
- Production timezone lookup uses Google Time Zone API first, with `timezonefinder`/`tzdata` as server fallback.
- Timezone resolution now fails closed when no reliable timezone is available.
- Mapbox city search results are enriched with API-resolved IANA timezones.
- Friend profile tabs now use `Natal` instead of `Natal Chart`.

## Verification

- Web typecheck passed.
- API timezone tests passed.
- Web/API Whole Sign house parity passed.
- Jose / El Vigia, Venezuela 9:00 AM regression passed: Pisces rising.
- International timezone integrity matrix passed for 29 fixtures.
- Production `/utils/timezone` verified El Vigia as `America/Caracas` with Google as source.
