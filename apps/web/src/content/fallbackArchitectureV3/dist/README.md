# dist/ — Codex-ready build (do not modify package sources)

`tldr-content.js` is the prebuilt, self-contained ESM bundle of BOTH resolvers. Import it as-is; never edit, fork, or re-typecheck the `resolver/*.ts` sources (the TS strictness patch applied during the last import must not happen again — if the bundle needs a change, that change belongs in this package, not in the app).

## Usage

```js
import { createFallbackRenderer, createKnowledgeMatrixV8Resolver, createTransitSynastryRenderer, SourceGapError } from "./dist/tldr-content.js";
import templates from "./templates/fallback-templates-v3.json";
import rows from "./source-rows/fallback-source-rows-v3.json";
import transitLib from "./source-rows/transit-synastry-rows-v1.json";

const natal = createFallbackRenderer(templates, rows);
const transits = createTransitSynastryRenderer(transitLib, templates, rows);
```

- `natal`: `renderNatalPlacement`, `renderNatalAngle`, `renderNatalAspect`, `renderNatalEmptyHouse`, `renderProfectionYear`
- `transits`: `renderTransitAspect`, `renderTransitHouse`, `renderTransitRetro`, `renderTransitReturn`, `renderTransitLabel`, `renderCompat`, `renderSynastryAspect`, `renderSkySeason`, `renderSkyPlacement`, `renderSkyAspectCard`, `renderSkyLunation`, `renderSkyHoroscope`, `renderCalendarPhase`, `renderVoidOfCourse`, `renderSeasonMarker`, `renderWeeklyMoon`, `renderCircleStory`, `renderPairDaily`, `formatCircleNames`, `renderBondTransit`
- `createKnowledgeMatrixV8Resolver`: exact-key `renderTransitMeaning` and `renderHouseActivation` lookups. Both return package copy unchanged or `null`; they never substitute across signs, houses, or event types.

Full API documentation: `admin/CODEX-TRANSIT-HANDOFF.md`. Catch `SourceGapError` and hide the surface (never substitute copy). All rows in this build are owner-approved; keep gating on `review_status` for future drafts.

Rebuild command (package side only): `npx esbuild resolver/index.browser.ts --bundle --format=esm --outfile=dist/tldr-content.js`
