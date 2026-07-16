# Release Notes

## 2026-07-15: Whole Sign Houses And Global Timezones

### Content Stability

- Documented the content precedence contract: fallback copy is a floor, not a competing source.
- Hardened the app against async copy downgrades where a broad `fallback-hook/...` or emergency template could replace specific authored, approved, or exact generated copy after content/registry loading finished.
- Established the expected source order for reader-facing copy: personalized/generated exact content, exact live rows, authored or approved knowledge-bank copy, template fallback for blanks, then emergency copy only when no specific copy exists.
- Added a non-blank neutral review state for unresolved copy so cards do not disappear into empty text or fake specificity.
- Added the rule to the README so future content and UI work can reference it when wiring new surfaces.

### Chart Calculation Integrity

- Standardized TLDR Astro on Whole Sign houses across web and API surfaces.
- Kept Ascendant and Midheaven as plotted angle points instead of treating them as 1st/10th house cusps.
- Added visible wheel labeling for the active house system.
- Added parity checks so web and API house assignments stay aligned.

### Global Timezone Resolution

- Replaced the old browser-side coordinate guessing path with API-backed timezone resolution.
- Added Google Time Zone API support as the production primary resolver.
- Kept `timezonefinder`/`tzdata` as the server-side fallback when Google is unavailable.
- Made timezone lookup fail closed when no reliable timezone can be resolved, instead of silently using UTC or browser-local fallbacks for birth charts.
- Updated Mapbox place search so selected cities are enriched with API-resolved IANA timezones before chart calculation.

### Regression Coverage

- Added a Jose / El Vigia, Venezuela regression proving 1979-02-08 9:00 AM local resolves to `America/Caracas`, `13:00 UTC`, and Pisces rising.
- Added a broad international timezone integrity script covering 29 coordinate/date fixtures across multiple countries, offsets, and DST cases.
- Added a Mapbox timezone enrichment script to catch missing timezone data in city-search results.
- Added API tests for Google Time Zone API usage and fallback behavior.

### Product/UI

- Shortened the friend profile segmented tab label from `Natal Chart` to `Natal`.
- Documented Cloud Run Secret Manager setup for the server-only Google Time Zone API key.

### Production Verification

- Cloud Run revision `tldrastro-api-00006-ww8` was verified ready.
- Production `/utils/timezone` was verified for El Vigia, Venezuela with source `google`.
