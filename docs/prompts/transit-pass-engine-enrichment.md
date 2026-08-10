# Prompt: Transit pass engine + doctrine enrichment

Copy everything below into a fresh coding session. Prerequisite: the bug-fix pass in `docs/prompts/fix-transit-direction-bugs.md` should land first.

---

Implement multi-pass transit awareness on the personal (You page) transit surfaces in this repo. Read `docs/transit-surfaces-review.md` (§3–§4) and `docs/return-reports-implementation-plan.md` first — this task implements review items §3, §4.1, §4.3, §4.4.

## Part 1: Port the sky multi-pass engine to transit-to-natal

`apps/web/src/services/ephemeris.ts` already has a complete multi-pass engine for sky-to-sky aspects: `skyAspectTimingFor` / `enrichSkyAspectTiming` (~lines 1971–2153) producing `passIndex`, `exactPasses[]` (each with `exactAt` + per-pass motion), retrograde re-hit clustering (`hasRetrogradeRehit`, ~2032), engagement windows, and `series: {index, count, throughLabel}` (~2145).

Build `natalTransitTimingFor(transitingPlanet, natalLongitude, aroundDate)` in the same file, reusing the same bisection/scan helpers. This is simpler than the sky case: one moving body against a fixed longitude. Output shape should mirror the sky timing object so downstream rendering can share code. Then enrich the items from `buildNatalTransitItems` (App.tsx ~5372) with this timing for the slow planets at minimum (Jupiter–Pluto + Chiron); fast planets may keep the cheap single-pass estimate.

Performance: this scan is per-natal-target per-planet — memoize per (planet, natal degree, day) and compute lazily (on row render or article open), not for the whole chart eagerly. Respect existing bundle budgets (`npm run qa:bundle`).

## Part 2: Pass-aware content keys (without collapsing or duplicating rows)

- Authored key cascade (`apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts` ~755-768): add `authored/transit-aspect/{transiting}/{natal}/{aspect}/pass-{1|2|3}` ahead of the base key in `tryKeys`, falling through to existing cards when no pass variant exists.
- `transitToNatalAspectInstanceContentKey` (`apps/web/src/services/generatedContentKeys.ts` ~181): add an optional `pass` component.
- LLM key (App.tsx ~1468): append `-pass{N}` when pass count > 1; DB uniqueness already includes `content_key`.
- **Trap:** `dedupeSameBeatPersonalTransits` (App.tsx ~7144) dedupes by resolved content-key beat and will collapse distinct passes of one transit to one row. Passes of the same transit should remain ONE row (it is one ongoing transit) but the row must carry the pass metadata — dedupe on the base key, attach timing to the survivor.

## Part 3: Render pass context

On the daily transit rows (App.tsx ~16042-16084) and the transit article (`features/you/YouPage.tsx` ~777-1000):
- Series chip when pass count > 1: "Pass 2 of 3" style, with exact dates for each pass in the article's key-dates area (reuse the existing key-date/bottom-sheet patterns; attribution styling per `docs/design-tokens.md` — no one-off CSS, add tokens if needed).
- Pass-phase line resolved from content, not hardcoded in React: wire the existing (currently unwired) doctrine file `packages/astro-knowledge/data/frameworks/planetary-return-framework.json` (`retrograde-return-series`: first contact introduces, retrograde pass reviews, final direct pass commits) into the fallback resolver as hook rows (e.g. `fallback-hook/transit-pass/{1|2|3}`), following the Fallback V3 authoring format in `apps/web/src/content/fallbackArchitectureV3/`. Also pass `isRetrograde` on the main You path (App.tsx ~7246-7254 currently omits it).
- SOURCE_GAP rule applies: if no pass hook row is approved, omit the line — never synthesize in React.

## Part 4: Returns as a first-class category

- Generalize the nodal-only gate at App.tsx ~7220 (`renderTransitReturn` currently fires only for north-node) to all self-conjunctions of slow planets + Sun.
- Replace the weekly lane's 0.25° single-day return trigger (`apps/web/src/services/weeklyHoroscope.ts` ~1336) with a window derived from the Part 1 pass engine (in-orb engagement window, all passes).
- Wire the unwired cycle knowledge files (`packages/astro-knowledge/data/modifiers/saturn-return.json`, `data/frameworks/planetary-return-framework.json`, `jupiter-return-cycle.json`, `nodal-return-cycle.json`) into the return rendering path as facts (timing/loudness rules), not prose.
- Missing authored return cards (`authored/transit-return/{sun,uranus,neptune,pluto}`): do NOT write reader copy yourself. Emit SOURCE_GAP (surface hides) and list the missing keys in your final report for the owner's writing queue.

## Part 5: Station-on-natal loudness

`findStations` / `retrogradeCycleFactsFor` (`ephemeris.ts` ~1349-1486) already yield station timestamps and shadow windows. Add a check: when a station falls within 1.5° of a natal point (per `saturn-return.json`'s loudness rule), boost that transit's ranking (via the existing rank engine inputs, App.tsx ~6797) and set a `stationNearNatal` flag on the item for future copy variants. No new prose required in this pass.

## Constraints

- Editorial regime: `AGENTS.md` + `docs/content-management/ARCHITECTURE.md` govern all reader-facing copy; anything new lands `needs_review`. You add structure and facts, not prose.
- All rendered strings pass `apps/web/src/content/readerSafety.ts` helpers.
- `App.tsx` is 18k lines: extract new logic into `apps/web/src/services/` modules; keep App.tsx diffs to wiring.
- Keep the browser engine canonical for these live surfaces (server engines are for report facts — see `docs/return-reports-implementation-plan.md` §3). Add a drift check comparing `natalTransitTimingFor` exact dates against the server's `_bisect_aspect_exact` for sampled transits in `scripts/verify-astrology-integrity.mjs` style.
- Gates: web tests + type-check, `npm run test:content`, `npm run qa:bundle`, Python tests if touched.

## Verification

Fixture chart with a known 3-pass Saturn transit (pick a date range where Saturn retrogrades over a natal point; verify dates against the ephemeris): (1) one row, series chip "1 of 3/2 of 3/3 of 3" correct as the reference date moves; (2) article lists three exact dates; (3) pass-phase line appears only via approved hook rows; (4) Saturn return for a 29-year-old fixture surfaces on the You page with a window, not a single day; (5) station within 1.5° of natal point outranks the same transit without a station. Report all SOURCE_GAP keys produced.
