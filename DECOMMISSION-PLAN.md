# Legacy Content Decommission Plan

Rule for every item: route through dashboard rows or the V3 package resolver from `apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js`; hide the surface on `SourceGapError`. Do not restore deleted legacy files, recreate deleted content, add local copy sources, or rename a fallback while keeping it alive.

- [ ] `apps/web/src/App.tsx` — `synastryEmergencyMadlibContent`: remove the local synastry emergency generator path.
- [ ] `apps/web/src/App.tsx` — `synastryEmergencyMadlibPreview`: remove the local synastry preview generator path.
- [ ] `apps/web/src/App.tsx` — `madlibSynastrySection`: remove the local synastry section generator and make synastry normalize through authored/dashboard or package output only.
- [ ] `apps/web/src/App.tsx` — `personalTransitMadlibFallbackSection`: remove the legacy transit fallback naming/path and keep personal transits on the V3 package resolver only.
- [ ] `apps/web/src/App.tsx` — `normalizeMadlibCardSurface`: remove the legacy madlib naming/tier for package-backed card surfaces.
- [ ] `apps/web/src/App.tsx` — `houseOverlayMadlibSection`: remove the local house overlay generator and hide house overlay rows when dashboard/package output is missing.
- [ ] `apps/web/src/App.tsx` — `compositeAspectFallbackSummary`: remove the local composite aspect summary generator.
- [ ] `apps/web/src/App.tsx` — `compositePlacementFallbackSummary`: remove the local composite placement summary generator.
- [ ] `apps/web/src/App.tsx` — `compositeAspectMadlibSection`: remove the local composite aspect section generator and hide missing rows.
- [ ] `apps/web/src/App.tsx` — `compositePlacementMadlibSection`: remove the local composite placement section generator and hide missing rows.
- [ ] `apps/web/src/features/calendar/LunarCalendar.tsx` — `calendarEventMadlibDescription`: rename the package-backed path so it no longer advertises a legacy madlib source.
- [ ] `apps/web/src/features/calendar/LunarCalendar.tsx` — `source-based-madlib` tier labels: rename package-backed calendar fallback tiers to V3 package/dashboard language.
- [ ] `apps/web/src/features/calendar/lunarDayResolver.ts` — `source-based-madlib` tier labels: rename package-backed lunar fallback tiers to V3 package/dashboard language.
- [ ] `apps/web/src/features/calendar/lunarDayResolver.ts` — `madlibCandidates`: rename the package-backed candidate parameter so it no longer advertises a legacy madlib source.
- [ ] `scripts/test-reader-facing-content-contract.mjs` — old transit fallback assertion: replace the contract that expects `personalTransitMadlibFallbackSection` with a package-only wiring guard.
- [ ] `scripts/test-reader-facing-content-contract.mjs` — non-package copy source guard: fail the build if reader-serving code imports a deleted/non-package content source.
- [ ] `scripts/export-cc-satori-passages.mjs` — deleted `templateHandoffV2` source import: remove this legacy export script instead of repointing it.

Final verification, after every checkbox above is complete:

- [ ] Run package verifier: `node tests/verify-fallback-architecture.mjs` from `apps/web/src/content/fallbackArchitectureV3`.
- [ ] Run package verifier: `node tests/verify-transit-synastry.mjs` from `apps/web/src/content/fallbackArchitectureV3`.
- [ ] Run contract test: `node scripts/test-reader-facing-content-contract.mjs`.
- [ ] Run transit selection regression: `node scripts/test-transit-aspect-v3-selection.mjs`.
- [ ] Run web build: `npm run build:web`.
- [ ] Capture Sun-in-Leo screenshot showing package copy starts “You've been running on autopilot through a version of yourself that needs updating.”
- [ ] Confirm `PACKAGE_VERSION = v3-2026-07-23` is visible in the app debug screen and dashboard admin.
- [ ] Confirm import counts: 1,311 authored cards, 1,306 hooks, 315 vocab, 22 templates.
- [ ] Confirm the wiring guard fails the build on any non-package copy source.
