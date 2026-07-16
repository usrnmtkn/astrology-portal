export type WritingLayer = "source-grounded" | "madlib-fallback";
export type WritingSurfaceStatus = "normalized" | "partial" | "not-normalized";

export type WritingSurfaceSource = {
  label: string;
  path: string;
  role: "renderer" | "source-grounded" | "phrasebank" | "knowledge" | "madlib-material" | "stored-source" | "spec";
};

export type WritingSurfaceMapItem = {
  id: string;
  surface: string;
  area: "Friends" | "Natal" | "Sky" | "Transits" | "System";
  status: WritingSurfaceStatus;
  requiredSlots: string[];
  visibleLayerOrder: WritingLayer[];
  currentRenderPath: string;
  risk: string;
  sources: WritingSurfaceSource[];
  nextAction: string;
};

export const writingLayerLabels: Record<WritingLayer, string> = {
  "source-grounded": "Source-grounded",
  "madlib-fallback": "Madlib fallback"
};

export const writingSurfaceStatusLabels: Record<WritingSurfaceStatus, string> = {
  normalized: "Normalized",
  partial: "Partially normalized",
  "not-normalized": "Not normalized"
};

export const writingSurfaceSourceRoleLabels: Record<WritingSurfaceSource["role"], string> = {
  renderer: "Renderer",
  "source-grounded": "Source-grounded",
  phrasebank: "Phrase bank",
  knowledge: "Knowledge bundle",
  "madlib-material": "Madlib material",
  "stored-source": "Stored source rows",
  spec: "Spec"
};

export const writingSurfaceSourceMap: WritingSurfaceMapItem[] = [
  {
    id: "friends-compatibility-planet-cards",
    surface: "Friends Compatibility: Planet Comparison Cards",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["function", "yourLine", "theirLine or sameSignLine", "verdict"],
    visibleLayerOrder: ["source-grounded"],
    currentRenderPath: "normalizeCompatibilityCardSurface resolves authored compatibility writeup slots and omits cards missing required fields.",
    risk: "The card is source-grounded only; no madlib fallback is currently defined for missing compatibility card pairs.",
    nextAction: "Expose per-slot provenance in the row UI and decide whether compatibility cards need a madlib fallback layer.",
    sources: [
      { label: "CompatibilityTab.tsx", path: "apps/web/src/features/friends/CompatibilityTab.tsx", role: "renderer" },
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "cc-compatibility-writeups.json", path: "tldr-astro-phrasebank/phrasebank/cc-compatibility-writeups.json", role: "phrasebank" },
      { label: "cc-compatibility-cards.json", path: "tldr-astro-phrasebank/phrasebank/cc-compatibility-cards.json", role: "phrasebank" }
    ]
  },
  {
    id: "friends-compatibility-exact-dynamics",
    surface: "Friends Compatibility: Exact Dynamics Lanes",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["scene"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "Rows use the same synastry-contact normalizer as synastry detail pages.",
    risk: "The row title now names the actual aspect contact; row-level provenance still needs to be visible for QA.",
    nextAction: "Expose section-level layer/tier/sourceKeys in the row UI for QA.",
    sources: [
      { label: "CompatibilityTab.tsx", path: "apps/web/src/features/friends/CompatibilityTab.tsx", role: "renderer" },
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "cc-synastry-web-bundle.json", path: "tldr-astro-phrasebank/phrasebank/cc-synastry-web-bundle.json", role: "phrasebank" },
      { label: "relationships-web.json", path: "packages/astro-knowledge/dist/relationships-web.json", role: "knowledge" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "friends-synastry-contact",
    surface: "Friends Synastry: Aspect Rows And Detail Pages",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["scene"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeSynastryContactSurface resolves source-grounded authored bundle/knowledge rows first, then source-based madlib fallback.",
    risk: "House overlays, composite, and relationship timing still have older paths, so Friends is not fully normalized yet.",
    nextAction: "Move detail provenance into the visible admin/debug trace and remove unused direct synastry fallback helpers after confirming no callers remain.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "cc-synastry-web-bundle.json", path: "tldr-astro-phrasebank/phrasebank/cc-synastry-web-bundle.json", role: "phrasebank" },
      { label: "relationshipRegistry.ts", path: "apps/web/src/content/relationshipRegistry.ts", role: "knowledge" },
      { label: "domainRegistry.ts", path: "apps/web/src/content/domainRegistry.ts", role: "knowledge" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "friends-house-overlays",
    surface: "Friends Synastry: House Overlays",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["overlay meaning"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeHouseOverlaySurface resolves relationship knowledge/phrasebank content first, then a source-based overlay madlib frame.",
    risk: "Overlay prose is normalized; the row UI does not yet expose layer/tier/sourceKeys for QA.",
    nextAction: "Expose per-row provenance so QA can distinguish knowledge rows from madlib fallback.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "fallbackHooks.ts", path: "apps/web/src/content/fallbackHooks.ts", role: "knowledge" },
      { label: "generatedContent.ts", path: "apps/web/src/services/generatedContent.ts", role: "stored-source" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "friends-composite",
    surface: "Friends Composite",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["composite placement or aspect meaning"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeCompositePlacementSurface and normalizeCompositeAspectSurface resolve relationship knowledge/phrasebank content first, then composite madlib frames.",
    risk: "Composite prose is normalized, but most visible composite copy may still be fallback until reviewed composite phrasebank rows exist.",
    nextAction: "Add reviewed composite phrasebank rows and expose per-row provenance in the UI.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "relationshipRegistry.ts", path: "apps/web/src/content/relationshipRegistry.ts", role: "knowledge" },
      { label: "fallbackHooks.ts", path: "apps/web/src/content/fallbackHooks.ts", role: "knowledge" },
      { label: "generatedContent.ts", path: "apps/web/src/services/generatedContent.ts", role: "stored-source" }
    ]
  },
  {
    id: "natal-placement-detail",
    surface: "Natal Placement Detail Pages",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["placement story"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeNatalPlacementSurface resolves reviewed source-grounded placement or angle records, then reviewed natal aspects. If no source-grounded section exists, it can use the source-shaped placement scaffold fallback.",
    risk: "The page is normalized, but fallback scaffold prose still needs the same editorial scrutiny as other madlib fallback material.",
    nextAction: "Expose the per-section layer/tier/sourceKeys in the UI so QA can see which sections are source-grounded versus fallback.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "sourceGroundedRuntime.ts", path: "apps/web/src/content/sourceGroundedRuntime.ts", role: "source-grounded" },
      { label: "sourceGroundedModels.ts", path: "apps/web/src/content/sourceGroundedModels.ts", role: "source-grounded" },
      { label: "finalSourceGroundedDashboardRecords.json", path: "apps/web/src/content/finalSourceGroundedDashboardRecords.json", role: "source-grounded" },
      { label: "cc-natal-source-grounded-bundle.json", path: "tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json", role: "phrasebank" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "natal-aspect-detail",
    surface: "Natal Aspect Detail Pages",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["aspect meaning"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeNatalAspectSurface resolves reviewed source-grounded aspect prose first, then a source-based madlib fallback frame.",
    risk: "The page is normalized, but the madlib fallback still needs editorial QA for tone and specificity.",
    nextAction: "Expose section-level layer/tier/sourceKeys in the detail UI so QA can see whether a page is reviewed or fallback.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "sourceGroundedRuntime.ts", path: "apps/web/src/content/sourceGroundedRuntime.ts", role: "source-grounded" },
      { label: "finalSourceGroundedDashboardRecords.json", path: "apps/web/src/content/finalSourceGroundedDashboardRecords.json", role: "source-grounded" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "soul-roadmap-card",
    surface: "You / Friends: Soul Roadmap Card",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["purpose pattern"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "SoulRoadmapCard resolves local sign-roadmap material through normalizedSoulRoadmapSection and omits missing development slots.",
    risk: "This surface is structurally normalized but currently has only Layer 2 local roadmap material, not a reviewed source-grounded bundle.",
    nextAction: "Move sign-roadmap material into a reviewed/source-grounded bundle if this card should graduate to Layer 1, and expose section provenance in QA.",
    sources: [
      { label: "SoulRoadmapCard.tsx", path: "apps/web/src/components/charts/SoulRoadmapCard.tsx", role: "renderer" }
    ]
  },
  {
    id: "career-archetype-card",
    surface: "You / Friends: Career Archetype Card",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["career pattern"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "resolveCareerArchetypeProfile emits CareerArchetypeSection rows with layer/tier/sourceKeys; the visible career-pattern section is a source-based local madlib fallback.",
    risk: "The current visible section is Layer 2 until a reviewed/source-grounded career-archetype bundle exists.",
    nextAction: "Promote reviewed career archetype rows into Layer 1 and expose section provenance in the card UI.",
    sources: [
      { label: "CareerArchetypeCard.tsx", path: "apps/web/src/components/charts/CareerArchetypeCard.tsx", role: "renderer" },
      { label: "careerArchetype.ts", path: "apps/web/src/services/careerArchetype.ts", role: "madlib-material" }
    ]
  },
  {
    id: "sky-placement-detail",
    surface: "Sky Placement Detail Pages",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["current placement meaning"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeSkyPlacementSurface resolves READY source-grounded V2 sky placement copy first, then a source-based madlib fallback frame.",
    risk: "Generated slot-template and fallback-hook placement prose no longer feed the detail body; if those should return, they need explicit source-grounded or madlib slots.",
    nextAction: "Expose section-level layer/tier/sourceKeys in the detail UI and create optional slots for retrograde nuance if needed.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "sourceGroundedRuntime.ts", path: "apps/web/src/content/sourceGroundedRuntime.ts", role: "source-grounded" },
      { label: "sourceGroundedV2.ts", path: "apps/web/src/content/sourceGroundedV2.ts", role: "source-grounded" },
      { label: "finalSourceGroundedDashboardRecords.json", path: "apps/web/src/content/finalSourceGroundedDashboardRecords.json", role: "source-grounded" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "sky-aspect-detail",
    surface: "Sky Aspect Detail Pages",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["current aspect meaning"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeSkyAspectSurface resolves source-grounded sky aspect prose first, then a source-based madlib fallback frame.",
    risk: "Optional sign-context and condition-modifier prose has been removed from the detail body until it can be normalized into explicit optional slots.",
    nextAction: "Add optional normalized slots for sign context and condition modifiers if those details should return.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "sourceGroundedRuntime.ts", path: "apps/web/src/content/sourceGroundedRuntime.ts", role: "source-grounded" },
      { label: "sourceGroundedV2.ts", path: "apps/web/src/content/sourceGroundedV2.ts", role: "source-grounded" },
      { label: "finalSourceGroundedDashboardRecords.json", path: "apps/web/src/content/finalSourceGroundedDashboardRecords.json", role: "source-grounded" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "personal-transit-detail",
    surface: "Personal Transit Detail Pages",
    area: "Transits",
    status: "normalized",
    requiredSlots: ["transit meaning", "personal activation"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizePersonalTransitSurface resolves reviewed/source-grounded transit composition first, then a source-based transit-to-natal madlib fallback.",
    risk: "The visible detail block is normalized; friend/circle transit summary cards now use a shared card-body normalizer, but their QA provenance is not yet visible in the card UI.",
    nextAction: "Expose section-level layer/tier/sourceKeys in the read block and card previews.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "sourceGroundedRuntime.ts", path: "apps/web/src/content/sourceGroundedRuntime.ts", role: "source-grounded" },
      { label: "sourceGroundedV2.ts", path: "apps/web/src/content/sourceGroundedV2.ts", role: "source-grounded" },
      { label: "finalSourceGroundedDashboardRecords.json", path: "apps/web/src/content/finalSourceGroundedDashboardRecords.json", role: "source-grounded" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "friends-compatibility-highlights",
    surface: "Friends Compatibility: Highlight Cards",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["highlight body"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "compatibilityHighlights passes every highlight body through normalizeMadlibCardSurface before rendering.",
    risk: "This surface currently has only Layer 2 coverage because the highlights are synthesized from calculated chart facts instead of a reviewed authored bundle.",
    nextAction: "Add reviewed/source-grounded highlight rows if these cards need Layer 1 coverage, and expose layer/sourceKeys in the UI.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "friends-circle-feed-cards",
    surface: "Friends Circle Feed And Overview Cards",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["card body"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "circleActivationCards and circleFeedPreviewCards pass card bodies through normalizeMadlibCardSurface and omit empty cards.",
    risk: "This surface is structurally normalized, but its product reason to exist is unresolved; most cards are Layer 2 because they are assembled from live chart facts rather than reviewed card prose.",
    nextAction: "Product-review Friends Circle before writing more prose: decide whether it is relationship radar, friend timing, social feed, or circle overview, then add authored rows only for the chosen job.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "sky-daily-timing",
    surface: "Sky / You: Daily Timing Writeup",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["daily timing body"],
    visibleLayerOrder: ["source-grounded"],
    currentRenderPath: "normalizeDailyTimingSurface wraps stored source-grounded daily timing sections before they are rendered in the Today/You timing writeup.",
    risk: "The surface is normalized, but stored daily timing rows need clearer editorial tiering if they are not all reviewed.",
    nextAction: "Expose layer/tier/sourceKeys in the Today QA view and split unreviewed stored rows into explicit madlib fallback if needed.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "generatedContent.ts", path: "apps/web/src/services/generatedContent.ts", role: "stored-source" }
    ]
  },
  {
    id: "sky-calendar-event-cards",
    surface: "Sky Calendar: Event Cards",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["event description"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "normalizeCalendarEventSurface resolves exact stored source descriptions first, then source-based madlib event descriptions.",
    risk: "Calendar cards now avoid empty filler, but stored event descriptions need visible per-card provenance for editorial QA.",
    nextAction: "Expose layer/tier/sourceKeys in calendar event cards.",
    sources: [
      { label: "LunarCalendar.tsx", path: "apps/web/src/features/calendar/LunarCalendar.tsx", role: "renderer" },
      { label: "generatedContent.ts", path: "apps/web/src/services/generatedContent.ts", role: "stored-source" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "sky-lunar-day-editorial",
    surface: "Sky Calendar: Lunar Day Editorial",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["lunar day body"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "lunarDayResolver resolves each editorial field through normalizedLunarSlot, with source rows first, saved fallback-hook rows second, and local static lunar beats only as madlib fallback.",
    risk: "The resolver is normalized per slot, but the UI does not yet show which lunar editorial fields were omitted or came from fallback.",
    nextAction: "Expose slot-level layer/sourceKeys in the lunar calendar QA/admin view.",
    sources: [
      { label: "lunarDayResolver.ts", path: "apps/web/src/features/calendar/lunarDayResolver.ts", role: "renderer" },
      { label: "generatedContent.ts", path: "apps/web/src/services/generatedContent.ts", role: "stored-source" },
      { label: "fallbackHooks.ts", path: "apps/web/src/content/fallbackHooks.ts", role: "knowledge" }
    ]
  },
  {
    id: "sky-calendar-day-cards",
    surface: "Sky Calendar: Day Cards",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["day body"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "normalizeCalendarDaySurface resolves lunation, moon-sign, season, and transit-thread slots before dayCardBody renders them.",
    risk: "This surface currently has Layer 2 local calendar material only; reviewed/source-grounded day-card rows are not wired yet.",
    nextAction: "Add reviewed/source-grounded calendar day rows if this card needs Layer 1 coverage, and expose section provenance in QA.",
    sources: [
      { label: "LunarCalendar.tsx", path: "apps/web/src/features/calendar/LunarCalendar.tsx", role: "renderer" }
    ]
  },
  {
    id: "sky-horoscopes",
    surface: "Sky / You: Horoscope Summaries",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["period summary", "reflection"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "getHoroscope renders the output of normalizeHoroscopeSurface for period summary, Moon context, and reflection slots.",
    risk: "This surface currently has Layer 2 local horoscope material only; reviewed/source-grounded horoscope rows are not wired yet.",
    nextAction: "Add reviewed/source-grounded horoscope rows if this surface should remain in product, and expose slot provenance in QA.",
    sources: [
      { label: "horoscopes.ts", path: "apps/web/src/services/horoscopes.ts", role: "renderer" }
    ]
  },
  {
    id: "chart-placement-row-microcopy",
    surface: "Chart Placement Row Microcopy",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["placement label description"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "PlacementRows wraps placement descriptions and dignity tooltip text through normalizePlacementMicrocopySection before rendering.",
    risk: "Most of this is short UI explanatory text and currently Layer 2 local material.",
    nextAction: "Move any interpretive row descriptions that need editorial control into Layer 1 source-grounded records.",
    sources: [
      { label: "PlacementRows.tsx", path: "apps/web/src/components/charts/PlacementRows.tsx", role: "renderer" }
    ]
  },
  {
    id: "natal-empty-house",
    surface: "Natal / Friends: Empty House Cards And Detail Pages",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["house sign"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "normalizeEmptyHouseCardSurface and normalizeEmptyHouseDetailSurface wrap empty-house card summaries and detail paragraphs before rendering.",
    risk: "This surface currently has Layer 2 local empty-house material only; no reviewed/source-grounded empty-house bundle is wired yet.",
    nextAction: "Move reviewed empty-house copy into Layer 1 records if this surface remains prominent, and expose section provenance in QA.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" }
    ]
  },
  {
    id: "personal-transit-house",
    surface: "Personal Transit House Rows",
    area: "Transits",
    status: "normalized",
    requiredSlots: ["house activation"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "normalizeTransitHouseSurface renders a source-based house activation madlib frame; no generated rows or fallback hooks feed the visible row.",
    risk: "This surface currently has only the madlib fallback layer because no reviewed transit-house source bundle is wired yet.",
    nextAction: "Add reviewed/source-grounded transit-through-house records if this row needs Layer 1 coverage.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "emergencyCopy.json", path: "apps/web/src/content/emergencyCopy.json", role: "madlib-material" }
    ]
  },
  {
    id: "surface-specs-builders",
    surface: "Phrasebank Specs And Builders",
    area: "System",
    status: "partial",
    requiredSlots: ["surface contract"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "Specs and builders define target bundles, but not every app route is forced through a normalizer yet.",
    risk: "The content source can be correct while the app still renders from an older route.",
    nextAction: "Make the app normalizers the only renderer entry points, then align tests to those contracts.",
    sources: [
      { label: "APP-RENDER-SPEC.md", path: "tldr-astro-phrasebank/APP-RENDER-SPEC.md", role: "spec" },
      { label: "CODEX-COMPATIBILITY-SYNASTRY-PROMPT.md", path: "tldr-astro-phrasebank/CODEX-COMPATIBILITY-SYNASTRY-PROMPT.md", role: "spec" },
      { label: "build_compatibility_writeups.py", path: "tldr-astro-phrasebank/tests/build_compatibility_writeups.py", role: "spec" },
      { label: "build_compatibility_cards.py", path: "tldr-astro-phrasebank/tests/build_compatibility_cards.py", role: "spec" },
      { label: "build_synastry_web_bundle.py", path: "tldr-astro-phrasebank/tests/build_synastry_web_bundle.py", role: "spec" },
      { label: "build_natal_source_grounded_bundle.py", path: "tldr-astro-phrasebank/tests/build_natal_source_grounded_bundle.py", role: "spec" }
    ]
  }
];
