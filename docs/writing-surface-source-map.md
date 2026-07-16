# Writing Surface Source Map

This document tracks every app surface that creates reader-facing prose and the files that currently feed it.

## Architecture Target

The desired writing stack has exactly two content layers:

1. Source-grounded prose: authored or reviewed copy that is already shaped for the surface.
2. Source-based madlib fallback: sentence frames filled from the knowledge base, phrase bank, and lived-experience/source phrase lists.

The UI should not render raw vocab, directional scaffolding, emergency placeholder paragraphs, or page-level mixtures of unrelated paragraph systems. Each surface should normalize candidate copy into that surface's slots first, then render only the normalized output.

## Shared Runtime Files

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`
  Main app router and most prose assembly functions. This is where normalized source-grounded rows and source-based madlib fallbacks meet before rendering.
- `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContent.ts`
  Loads stored source rows from the `generated_interpretations` table and exposes helpers for summaries, paragraph bodies, sections, and source metadata.
- `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContentKeys.ts`
  Defines stored source keys and slot-template keys used by fallback requests.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedRuntime.ts`
  Source-grounded composition helpers for natal placements, natal aspects, sky placements, sky aspects, and personal transits.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedModels.ts`
  Source-grounded model lookup and composition around the dashboard source bundle.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedV2.ts`
  Template/phrase composition layer for source-grounded sky and transit copy.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/finalSourceGroundedDashboardRecords.json`
  Large source-grounded dashboard content bundle.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`
  Source-based fallback vocabulary, phrase lists, and sentence-template material. This should feed madlibs, not render as raw vocabulary.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.ts`
  Runtime accessors for the fallback vocabulary plus legacy emergency prose functions. The direct prose functions should be phased behind normalizers.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/fallbackHooks.ts`
  Hook definitions that map a surface to registry/fallback knowledge ids.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/domainRegistry.ts`
  Registry resolver that maps knowledge bundles into app fallback fields such as `summaryShort` and `summaryDeep`.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/registry.ts`
  Main knowledge registry import from `@tldr/astro-knowledge/web`.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/natalRegistry.ts`
  Natal knowledge registry import from `@tldr/astro-knowledge/natal-web`.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/skyRegistry.ts`
  Sky knowledge registry import from `@tldr/astro-knowledge/sky-web`.
- `/Users/mprez/Code/tldrastro/apps/web/src/content/relationshipRegistry.ts`
  Relationship knowledge registry import from `@tldr/astro-knowledge/relationships-web`.

## Friends Compatibility: Planet Comparison Cards

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/features/friends/CompatibilityTab.tsx`
- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/phrasebank/cc-compatibility-writeups.json`
- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/phrasebank/cc-compatibility-cards.json`

Current status:

- The UI now renders the long-form authored card structure only. The old `Long-form / + Summary` toggle was removed.
- `normalizeCompatibilityCardSurface(...)` now controls the card slots.
- Required slots are `function`, `your-line`, `their-line` or `same-sign-line`, and `verdict`.
- Cards with missing required authored fields are omitted instead of padded with fallback prose.
- The summary bundle is still imported in `App.tsx` and can remain as source material, but it is no longer a second visible card structure.

## Friends Compatibility: Exact Dynamics Lanes

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/features/friends/CompatibilityTab.tsx`
- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/phrasebank/cc-synastry-web-bundle.json`
- `/Users/mprez/Code/tldrastro/packages/astro-knowledge/dist/relationships-web.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- The lane rows now use the same normalized `synastry-contact` choke point as synastry detail copy.
- Resolution order is source-grounded authored bundle/relationship knowledge first, then source-based madlib fallback.
- The old direct hook/headliner fallback no longer feeds the row summary.

## Friends Synastry: Aspect Rows And Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/phrasebank/cc-synastry-web-bundle.json`
- `/Users/mprez/Code/tldrastro/packages/astro-knowledge/dist/relationships-web.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeSynastryContactSurface(...)` is the first new surface normalizer.
- Each output section carries `layer`, `tier`, and `sourceKeys`.
- Detail pages and row summaries both read from that normalized output.
- Required slot: `scene`.
- If no authored, registry, or madlib sentence body exists, the contact is not servable instead of being padded with placeholder prose.

## Friends Synastry: House Overlays

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Current prose sources:

- Relationship placement keys through `relationshipPlacementContentKeys(...)`
- Relationship knowledge / phrasebank fallback records
- Source-based overlay madlib material from planet topics and house life-area phrases

Current status:

- `normalizeHouseOverlaySurface(...)` now controls this surface.
- Relationship knowledge / phrasebank content renders first.
- If no source-grounded relationship content exists, the fallback is an explicit overlay madlib frame.
- Stored source rows and fallback hooks no longer feed the visible overlay prose directly.
- The row UI still needs visible per-row provenance for QA.

## Friends Composite

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Current prose sources:

- Composite aspect and placement helpers in `App.tsx`
- Relationship knowledge / phrasebank fallback records where available
- Source-based composite madlib material from planet topics, sign style, house life areas, and aspect frames

Current status:

- `normalizeCompositePlacementSurface(...)` and `normalizeCompositeAspectSurface(...)` now control this surface.
- Relationship knowledge / phrasebank content renders first.
- If no source-grounded relationship content exists, the fallback is an explicit composite madlib frame.
- Stored source rows and fallback hooks no longer feed the visible composite placement/aspect prose directly.
- The prose is structurally normalized, but reviewed composite phrasebank coverage still needs editorial build-out.

## Natal Placement Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedRuntime.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedModels.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/finalSourceGroundedDashboardRecords.json`
- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeNatalPlacementSurface(...)` now controls this surface.
- Reviewed source-grounded placement records render first.
- Reviewed natal angle records from `cc-natal-angle-reviewed.json` render for angle placements.
- Reviewed natal aspect sections render after the placement story when available.
- If source-grounded placement content is missing, the fallback is the source-shaped placement scaffold, not direct emergency placeholder prose.
- If neither layer can fill a section, the section is omitted.

## Natal Aspect Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedRuntime.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/finalSourceGroundedDashboardRecords.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeNatalAspectSurface(...)` now controls this surface.
- Reviewed source-grounded aspect records render first.
- If reviewed source-grounded prose is unavailable, the fallback is a source-based madlib frame using planet-function and aspect-behavior material.
- Generated content rows, registry hook prose, and private user-generated placement drafts no longer feed the detail article directly.
- If neither layer can fill the required aspect meaning slot, the section is omitted.

## You / Friends: Soul Roadmap Card

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/components/charts/SoulRoadmapCard.tsx`
- `/Users/mprez/Code/tldrastro/apps/web/src/features/you/YouPage.tsx`
- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Current prose sources:

- Local sign-roadmap source material in `/Users/mprez/Code/tldrastro/apps/web/src/components/charts/SoulRoadmapCard.tsx`

Current status:

- The card now routes purpose/development text through `normalizedSoulRoadmapSection(...)`.
- The local sign-roadmap material is treated as `madlib-fallback` until moved into reviewed/source-grounded content.
- Missing development/path material is omitted instead of rendered as “more chart context” filler.
- Each normalized section carries `layer`, `tier`, and `sourceKeys`.

## You / Friends: Career Archetype Card

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/components/charts/CareerArchetypeCard.tsx`
- `/Users/mprez/Code/tldrastro/apps/web/src/services/careerArchetype.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/features/you/YouPage.tsx`
- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Current prose sources:

- Local career sentence frames and chart-fact material in `/Users/mprez/Code/tldrastro/apps/web/src/services/careerArchetype.ts`
- Optional generated vocabulary rows from `generated_interpretations` with career vocab keys

Current status:

- `resolveCareerArchetypeProfile(...)` now emits career sections with `layer`, `tier`, and `sourceKeys`.
- The currently visible career-pattern section is explicitly `madlib-fallback`.
- Older `fallback-hook/career.pattern` labeling was removed from the visible section metadata.
- Reviewed/source-grounded career archetype rows still need to be added if this card should have Layer 1 coverage.

## Sky Placement Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedRuntime.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedV2.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/finalSourceGroundedDashboardRecords.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeSkyPlacementSurface(...)` now controls this surface.
- READY source-grounded V2 sky placement copy renders first.
- SOURCE_GAP output is not labeled source-grounded; if source-grounded copy is unavailable, the fallback is an explicit source-based madlib frame.
- Fallback hooks and generated slot-template rows no longer feed the detail article body directly.
- If neither layer can fill the required current placement meaning slot, the section is omitted.

## Sky Aspect Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedRuntime.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedV2.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/finalSourceGroundedDashboardRecords.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeSkyAspectSurface(...)` now controls this surface.
- Source-grounded sky aspect paragraphs render first.
- If source-grounded copy is unavailable, the fallback is a source-based madlib frame from planet-function and aspect-behavior material.
- Generated content rows and fallback hooks no longer feed the detail article body directly.
- Optional sign-context and condition-modifier prose is held out of the body until it has explicit optional slots.

## Personal Transit Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedRuntime.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/sourceGroundedV2.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/finalSourceGroundedDashboardRecords.json`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizePersonalTransitSurface(...)` now controls the visible detail read block.
- Reviewed/source-grounded transit composition renders first.
- SOURCE_GAP composition is not labeled source-grounded; if reviewed/source-grounded copy is unavailable, the fallback is an explicit source-based transit-to-natal madlib frame.
- The old approved-content gate and `interpretationInReview` placeholder no longer feed the visible detail prose.
- Friend/circle transit summary cards now pass through the shared card-body normalizer, but the UI still needs visible provenance for QA.

## Friends Compatibility: Highlight Cards

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `compatibilityHighlights(...)` now routes every visible highlight body through `normalizeMadlibCardSurface(...)`.
- Highlight cards with no reader-facing body are omitted instead of padded.
- This surface currently has Layer 2 coverage only because the cards are synthesized from calculated chart facts, not authored highlight rows.
- If these need Layer 1 coverage, add reviewed/source-grounded highlight records and wire them as the first candidate layer.

## Friends Circle Feed And Overview Cards

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `circleActivationCards(...)` and `circleFeedPreviewCards(...)` now route card bodies through `normalizeMadlibCardSurface(...)`.
- Empty or non-reader-facing bodies are omitted.
- The old dummy circle summary variable was removed.
- This surface is structurally normalized, but most cards are Layer 2 because they are assembled from live chart facts rather than reviewed card prose.
- Product status: unresolved. Friends Circle needs a clearer job before more prose is authored: relationship radar, friend timing, social feed, or circle overview.

## Sky / You: Daily Timing Writeup

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContent.ts`

Current status:

- `normalizeDailyTimingSurface(...)` now wraps stored source-grounded daily timing sections before the Today/You timing writeup renders them.
- Sections without reader-facing bodies are omitted.
- The older generic article assemblers were removed.
- Stored daily timing rows are currently treated as source-grounded rows; if any are unreviewed, they should be split into explicit madlib fallback rows or hidden by provenance.

## Sky Calendar: Event Cards

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/features/calendar/LunarCalendar.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContent.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeCalendarEventSurface(...)` now controls event-card descriptions.
- Exact stored source event descriptions render first.
- If no exact generated event body exists, the card can use source-based madlib descriptions from emergency copy event frames.
- If neither layer has real content, the description slot is omitted instead of showing filler.

## Sky Calendar: Lunar Day Editorial

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/features/calendar/lunarDayResolver.ts`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/services/generatedContent.ts`
- `/Users/mprez/Code/tldrastro/apps/web/src/content/fallbackHooks.ts`

Current status:

- `lunarDayResolver` now resolves each editorial field through `normalizedLunarSlot(...)`.
- Source rows are tried first; saved fallback-hook rows and local static lunar beats are treated as madlib fallback, not a third layer.
- Source rows render first, saved/rendered fallback-hook rows render second as madlib fallback.
- Local fallback-hook definitions no longer become reader-facing prose directly.
- When neither layer has content for a lunar field, that field returns `null` and is omitted.

## Sky Calendar: Day Cards

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/features/calendar/LunarCalendar.tsx`

Current status:

- `normalizeCalendarDaySurface(...)` now resolves lunation, moon-sign, season, and transit-thread slots before `dayCardBody(...)` renders them.
- Unknown moon/season fallback sentences are omitted instead of padded.
- This surface currently has Layer 2 local calendar material only; reviewed/source-grounded day-card rows are not wired yet.

## Sky / You: Horoscope Summaries

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/services/horoscopes.ts`

Current status:

- `normalizeHoroscopeSurface(...)` now resolves period summary, Moon context, and reflection slots before `getHoroscope(...)` renders them.
- This surface currently has Layer 2 local horoscope material only; reviewed/source-grounded horoscope rows are not wired yet.

## Chart Placement Row Microcopy

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/components/charts/PlacementRows.tsx`

Current status:

- `normalizePlacementMicrocopySection(...)` now wraps placement descriptions and dignity tooltip text before rendering.
- This is mostly short explanatory UI copy and currently uses Layer 2 local material.
- Any row descriptions that need editorial control should move into Layer 1 source-grounded records.

## Natal / Friends: Empty House Cards And Detail Pages

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Current status:

- `normalizeEmptyHouseCardSurface(...)` now wraps empty-house card summaries.
- `normalizeEmptyHouseDetailSurface(...)` now wraps empty-house detail paragraphs.
- Empty or unsafe slots are omitted instead of rendered as filler.
- This surface currently has Layer 2 local empty-house material only; reviewed/source-grounded empty-house rows are not wired yet.

## Personal Transit House Rows

Rendered by:

- `/Users/mprez/Code/tldrastro/apps/web/src/App.tsx`

Primary prose files:

- `/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.json`

Current status:

- `normalizeTransitHouseSurface(...)` now controls this surface.
- The visible row uses a source-based house activation madlib frame.
- Stored source rows and fallback hooks no longer feed the visible transit-through-house row directly.
- This surface currently has only Layer 2 coverage until reviewed/source-grounded transit-through-house records exist.

## Phrasebank Specs And Builders

Primary spec files:

- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/APP-RENDER-SPEC.md`
- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/CODEX-COMPATIBILITY-SYNASTRY-PROMPT.md`

Builder and audit files:

- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/tests/build_compatibility_writeups.py`
- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/tests/build_compatibility_cards.py`
- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/tests/build_synastry_web_bundle.py`
- `/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/tests/build_natal_source_grounded_bundle.py`

## Known Cleanup Queue

- Expose layer, tier, and sourceKeys in the client/admin QA UI for every normalized section.
- Add reviewed/source-grounded rows for surfaces that currently have Layer 2 coverage only.
- Keep fallback hooks as knowledge-id routers or saved fallback inputs, not direct reader prose.
- Keep emergency copy as a phrase/knowledge/material bank, not as a direct third prose layer.
- Add tests that fail when placeholder/directive copy reaches client-facing surfaces.
