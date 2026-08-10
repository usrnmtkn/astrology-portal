# tldrastro-fallback-architecture-v3

Created 2026-07-21 from `tldrastro-fallback-source-package-2026-07-21.zip`. Fixes the fallback vs authored split: fragments stop rendering as copy, natal placements get real per-surface templates, and every row carries a `content_role`.

For the app-wide developer and agent guide, start with
[`docs/content-management/README.md`](../../../../../docs/content-management/README.md)
and its detailed
[`ARCHITECTURE.md`](../../../../../docs/content-management/ARCHITECTURE.md).
This package README describes package internals; the app-wide docs also cover
fact ownership, generated-content precedence, dashboard hydration, publishing,
and surface wiring.

## Contents

| Path | What it is |
|---|---|
| `FALLBACK-ARCHITECTURE.md` | The two-layer rule (authored vs fallback) + role taxonomy. Read first. |
| `contracts/CONTENT-ROLE-CONTRACT.json` | Machine-readable roles, grammar frames, vocabulary families, migration map, runtime enforcement rules. |
| `templates/fallback-templates-v3.json` | Per-surface templates. Natal placement renders in two parts: `planet-in-sign` then `house-context`; templates are glue only, all slot content is verbatim approved-source wording, plus dignity/retrograde/sect modifier templates, angle, aspect, ruler, synthesis. Sky/transit/friends bodies carry forward. |
| `source-rows/fallback-source-rows-v3.json` | Vocabulary rows (verbatim or approved-source based) plus 315 dual-voice hooks: planet intros and bests, house meanings, 156 planet-in-sign sections and 120 planet-in-house sections authored from CC + 'A Spiritual Approach to Astrology', plus fallback_source banks (CC drafts and book extractions). |
| `bundled-sky-core-rows-v3.json` + `bundled-sky-authored-cards-v3.json` | Generated reader-startup slices containing Sky-owned hooks, shared vocabulary, and approved Sky authored cards. Do not edit directly; run `npm run build:fallback-manifest`. |
| `bundled-deferred-core-rows-v3.json` | Generated complement containing natal, personal-transit, and relationship hooks loaded after leaving Sky. Together with the Sky core it preserves canonical source ordering without duplicate production bytes. |
| `bundled-sky-placement-rows-v3.json` + `bundled-sky-placement-manifest-v3.json` | Generated Sky Placement article partition loaded only for placement and retrograde detail routes. The separate manifest provides package/dashboard parity and cache invalidation. |
| `bundled-manifest-summary-v3.json` + `bundled-manifest-v3.json` | Generated version/hash summary and full governed key manifest. The summary invalidates cache synchronously; the full key list loads only for dashboard-package validation. |
| `resolver/renderFallback.mjs` + `RESOLVER-SPEC.md` | Reference resolver (Node): role safety, slot gates, voice handling, SOURCE_GAP. |
| `resolver/renderFallback.browser.ts` | Browser/TypeScript build for the app bundle: no Node APIs, fully typed, factory-style (`createFallbackRenderer(templatesJson, rowsJson)` with static JSON imports). Verified output-identical to the Node resolver. |
| `admin/DASHBOARD-ROLE-MIGRATION.md` | Admin labeling rules + migration map for existing rows. |
| `admin/DECOMMISSION-OLD-FALLBACKS.md` | Removal directions for every legacy fallback path (old aspect helper, clause concatenation, hardcoded word banks, thin hook bodies) plus verification steps. Selection must be authored-or-v3-or-SOURCE_GAP, never authored-or-old-helper. |
| `tests/verify-fallback-architecture.mjs` | Run `node tests/verify-fallback-architecture.mjs`. Renders 1,560 placement combos + 96 angle paragraphs + 780 aspect combos in both voices; checks roles, grammar frames, banned phrases and words, voice leaks, dashes, thinness. Currently PASS. |
| `samples/rendered-samples.md` | Thirteen rendered examples across placements, angles, and aspects. |
| `source-rows/transit-synastry-rows-v1.json` | 919 owner-authored cards ingested verbatim from the TLDR libraries: 60 planet-through-house transit cards, 174 transit-aspect daily cards (with variants, returns, node and Chiron templates), 288 deep compatibility cards (Sun and Moon, all 144 pairs each), 390 pair compatibility paragraphs (Mercury, Venus, Mars, Jupiter, Saturn), plus events. All full_copy, approved (owner-authored final voice). |
| `resolver/renderTransitSynastry.browser.ts` | Browser/TypeScript build of the transit + synastry resolver for the app bundle: no Node APIs, typed, factory-style (`createTransitSynastryRenderer(transitLibJson, templatesJson, rowsJson)`). Includes `renderTransitLabel` for the daily forecast stack. Verified output-identical to the Node resolver across 4,102 renders. |
| `resolver/renderTransitSynastry.mjs` | Transit + synastry resolver: renderTransitHouse, renderTransitAspect (with the Batch 4 mirror rule and Batch 3 group-sharing rule), renderTransitReturn, renderCompat ({{other_name}} substitution; refuses to render direction-reversed pair cards), renderSynastryAspect (fallback template + aspect-type lines; per-pair enrichment slot ready). |
| `resolver/knowledgeMatrixV9.browser.ts` | Fail-closed v9 knowledge-matrix resolver. Governance is the current authority layer; Judge is preserved only as historical lineage. It preserves event keys and canonical workbook order, enforces the package manifest, and returns exact transit/house copy or `null` for an uncovered key. Runtime JSON is fetched on demand from `apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/`. |
| `resolver/knowledgeMatrixV13.browser.ts` | Canonical LL V13 resolver for the 301 workbook rows carrying exact owner approval. It preserves workbook copy and per-row provenance, normalizes node/Part of Fortune and inconjunct keys, supports reverse natal-aspect lookup, and fails closed outside approved coverage. The same rows append to `fallback-source-rows-v3.json` so exact V13 lived copy takes precedence without mutating earlier approved rows. |
| `tests/verify-transit-synastry.mjs` | Card hygiene + full grid renders: 60 house transits, Moon daily-driver set, 288 deep compat, 390 pair compat, 275 synastry aspect combos. Currently PASS. |

## What changed vs the old fallback

- `{{core_behavior}} {{house_synthesis}}` concatenation (1,439 records) is retired; those clauses are now `fallback_source` — authoring material only.
- Fallback output is a complete paragraph: planet function → sign style/need → lived behavior → misreading vs actual dynamic → shadow → productive form → house area/pressure → optional dignity/retrograde/sect sentence.
- All stored slot values are voice-neutral (grammar-framed), so the "their drive comes straight through they" class of bug is structurally impossible.
- All drafted rows were reviewed and approved by the owner in chat on 2026-07-21 (review_status: approved, approved_via noted per row). The content set is production-ready for import.
