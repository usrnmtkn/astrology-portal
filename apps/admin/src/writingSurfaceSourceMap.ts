export type WritingLayer = "source-grounded" | "generated" | "madlib-fallback";
export type WritingSurfaceStatus = "normalized" | "partial" | "not-normalized";

export type WritingSurfaceSource = {
  label: string;
  path: string;
  role: "renderer" | "source-grounded" | "phrasebank" | "knowledge" | "madlib-material" | "fallback-package" | "stored-source" | "spec";
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

export type WritingSurfaceAdminRoute = {
  label: string;
  hash: string;
  purpose: "reader-copy" | "supporting-copy" | "source-review";
  note: string;
};

export type WritingSurfaceAdminAccess = {
  readerLocation: string;
  editability: "editable" | "partial";
  routes: WritingSurfaceAdminRoute[];
};

export const writingLayerLabels: Record<WritingLayer, string> = {
  "source-grounded": "Source-grounded",
  generated: "Generated",
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
  "fallback-package": "Fallback package",
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
    currentRenderPath: "normalizeCompatibilityCardSurface resolves LIVE dashboard compatibility rows first, then falls back to authored phrasebank writeup slots and omits cards missing required fields.",
    risk: "The card is source-grounded only; no madlib fallback is currently defined for missing compatibility card pairs.",
    nextAction: "Import/materialize new planet libraries as dashboard rows when they need admin editing.",
    sources: [
      { label: "CompatibilityTab.tsx", path: "apps/web/src/features/friends/CompatibilityTab.tsx", role: "renderer" },
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "generated_interpretations compatibility.* rows", path: "generated_interpretations:compatibility.{planet}.{readerSign}.{otherSign}", role: "stored-source" },
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "knowledge" },
      { label: "generatedContent.ts", path: "apps/web/src/services/generatedContent.ts", role: "stored-source" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "knowledge" },
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
      { label: "fallbackArchitectureV3Runtime.ts", path: "apps/web/src/content/fallbackArchitectureV3Runtime.ts", role: "source-grounded" },
      { label: "fallbackArchitectureV3/dist/tldr-content.js", path: "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js", role: "source-grounded" },
      { label: "dashboard materializer", path: "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", role: "stored-source" },
      { label: "cc-natal-source-grounded-bundle.json", path: "tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json", role: "phrasebank" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallbackArchitectureV3Runtime.ts", path: "apps/web/src/content/fallbackArchitectureV3Runtime.ts", role: "source-grounded" },
      { label: "dashboard materializer", path: "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", role: "stored-source" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
    ]
  },
  {
    id: "soul-roadmap-card",
    surface: "You / Friends: Soul Roadmap Card",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["purpose pattern"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "SoulRoadmapCard resolves local sign-roadmap material through normalizedSoulRoadmapSection, omits missing development slots, and exposes fallback provenance labels in the card/detail UI.",
    risk: "This surface is structurally normalized but currently has only Layer 2 local roadmap material, not a reviewed source-grounded bundle.",
    nextAction: "Move sign-roadmap material into a reviewed/source-grounded bundle if this card should graduate to Layer 1.",
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
    currentRenderPath: "resolveCareerArchetypeProfile loads LIVE serving ms/career/* dashboard rows first, assembles the visible Career Pattern section from matching Sun/Moon/Rising/MC/Saturn/North Node/hemisphere rows, and falls back to local Midheaven madlibs when stored rows are missing.",
    risk: "Source-grounded quality now depends on reviewed ms/career/* row coverage and LIVE serving status; missing rows fall back locally.",
    nextAction: "Keep reviewed ms/career/* rows LIVE serving and add QA coverage for source badge, fallback badge, and no-row fallback grammar.",
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
    currentRenderPath: "normalizeSkyPlacementSurface resolves current sky placement articles through fallbackArchitectureV3/dist/tldr-content.js via renderSkyPlacement / renderSkySeason.",
    risk: "Sky placement copy now depends on the imported fallback-architecture package and its authored/fallback review status; stale dashboard or legacy bundle rows should not serve reader copy.",
    nextAction: "Keep fallbackArchitectureV3 imported from the package bundle and QA the detail UI for source badges, factual titles, and no legacy sky placement copy.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "dist/tldr-content.js", path: "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js", role: "fallback-package" },
      { label: "fallbackArchitectureV3Runtime.ts", path: "apps/web/src/content/fallbackArchitectureV3Runtime.ts", role: "renderer" }
    ]
  },
  {
    id: "sky-aspect-detail",
    surface: "Sky Aspect Detail Pages",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["current aspect meaning"],
    visibleLayerOrder: ["source-grounded", "generated", "madlib-fallback"],
    currentRenderPath: "normalizeSkyAspectSurface resolves reviewed sign-specific copy first, then LIVE exact-aspect readerCopy, reviewed exact/pair package copy, approved generated prose, and then SOURCE_GAP.",
    risk: "Generated rows must retain generated provenance and must never outrank owner-approved exact or reviewed package copy; the retired generic compositor must never serve direct-address prose on this collective surface.",
    nextAction: "Keep the dashboard provenance labels and precedence regression aligned with the Sky aspect surface contract.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "data/transits", path: "packages/astro-knowledge/data/transits", role: "knowledge" },
      { label: "fallbackArchitectureV3Runtime.ts", path: "apps/web/src/content/fallbackArchitectureV3Runtime.ts", role: "source-grounded" },
      { label: "dist/tldr-content.js", path: "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js", role: "fallback-package" },
      { label: "dashboard materializer", path: "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", role: "stored-source" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallbackArchitectureV3Runtime.ts", path: "apps/web/src/content/fallbackArchitectureV3Runtime.ts", role: "source-grounded" },
      { label: "dist/tldr-content.js", path: "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js", role: "fallback-package" },
      { label: "dashboard materializer", path: "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", role: "stored-source" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "knowledge" }
    ]
  },
  {
    id: "sky-calendar-day-cards",
    surface: "Sky Calendar: Day Cards",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["day body"],
    visibleLayerOrder: ["madlib-fallback"],
    currentRenderPath: "LunarCalendar weeklyDayWriteups resolves exact stored event copy first, then reviewed weekly Moon or calendar-phase package guidance, with a calculated Moon continuation only when neither is available.",
    risk: "Exact event descriptions are editable, but weekly Moon and phase guidance plus the calculated continuation do not yet share one saved-row override contract.",
    nextAction: "Add stored-row overrides for weekly Moon and phase guidance plus the continuation slot, then expose their provenance in QA.",
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
    currentRenderPath: "buildWeeklyHoroscope composes event-time facts with reviewed package rows and V3 renderers; YouPage renders the resulting weekly reading and aspect sections.",
    risk: "The weekly source rows are package-owned and not every composition slot has a saved dashboard override.",
    nextAction: "Define saved-row overrides for weekly macro and section families, then expose their source keys in the You-page QA view.",
    sources: [
      { label: "weeklyHoroscope.ts", path: "apps/web/src/services/weeklyHoroscope.ts", role: "renderer" },
      { label: "YouPage.tsx", path: "apps/web/src/features/you/YouPage.tsx", role: "renderer" }
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
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
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

/**
 * Admin destinations are deliberately separate from the runtime description above.
 * The dashboard consumes this record as its navigation contract, and the focused
 * admin test fails when a reader surface is added without an editorial route.
 */
export const writingSurfaceAdminAccess: Record<string, WritingSurfaceAdminAccess> = {
  "friends-compatibility-planet-cards": {
    readerLocation: "Friends > Compatibility > planet comparison cards",
    editability: "editable",
    routes: [{ label: "Edit compatibility copy", hash: "#compatibility?q=compatibility", purpose: "reader-copy", note: "Opens saved compatibility rows and the card-copy authoring flow." }]
  },
  "friends-compatibility-exact-dynamics": {
    readerLocation: "Friends > Compatibility > exact dynamics",
    editability: "editable",
    routes: [{ label: "Edit exact dynamics", hash: "#compatibility?q=synastry", purpose: "reader-copy", note: "Searches the compatibility workspace for exact synastry copy." }]
  },
  "friends-synastry-contact": {
    readerLocation: "Friends > Synastry > aspect row and detail",
    editability: "editable",
    routes: [{ label: "Edit synastry content", hash: "#exact-content?q=synastry", purpose: "reader-copy", note: "Opens stored synastry rows in the full content editor." }]
  },
  "friends-house-overlays": {
    readerLocation: "Friends > Synastry > house overlays",
    editability: "editable",
    routes: [{ label: "Edit house overlays", hash: "#exact-content?q=house+overlay", purpose: "reader-copy", note: "Opens house-overlay rows and source records." }]
  },
  "friends-composite": {
    readerLocation: "Friends > Composite chart",
    editability: "editable",
    routes: [{ label: "Edit composite copy", hash: "#composite-review", purpose: "reader-copy", note: "Opens relationship-type composite variants in one editor." }]
  },
  "natal-placement-detail": {
    readerLocation: "You or Friends > Birth chart > placement detail",
    editability: "editable",
    routes: [{ label: "Edit natal placements", hash: "#exact-content?category=Natal+Chart&q=placement", purpose: "reader-copy", note: "Opens saved natal placement rows and source material." }]
  },
  "natal-aspect-detail": {
    readerLocation: "You or Friends > Birth chart > natal aspect detail",
    editability: "editable",
    routes: [{ label: "Edit natal aspects", hash: "#exact-content?category=Natal+Aspects&q=aspect", purpose: "reader-copy", note: "Opens saved natal-aspect rows." }]
  },
  "soul-roadmap-card": {
    readerLocation: "You or Friends > Birth chart > Soul Roadmap",
    editability: "partial",
    routes: [{ label: "Find Soul Roadmap copy", hash: "#exact-content?q=soul+roadmap", purpose: "reader-copy", note: "Saved overrides are editable; the current local fallback still needs runtime override wiring." }]
  },
  "career-archetype-card": {
    readerLocation: "You or Friends > Birth chart > Career Archetype",
    editability: "editable",
    routes: [{ label: "Edit career copy", hash: "#exact-content?q=ms%2Fcareer", purpose: "reader-copy", note: "Opens the LIVE-first career content family." }]
  },
  "sky-placement-detail": {
    readerLocation: "Sky > placement detail > article and Rising-sign house horoscope",
    editability: "editable",
    routes: [
      { label: "Edit placement articles", hash: "#articles?q=sky", purpose: "reader-copy", note: "Opens Sky article rows, house horoscopes, and attached aspect passages." },
      { label: "Review Sky queue", hash: "#review-queue?source=all&q=sky", purpose: "source-review", note: "Opens scheduled and held Sky candidates." }
    ]
  },
  "sky-aspect-detail": {
    readerLocation: "Sky > aspect card > aspect detail page",
    editability: "editable",
    routes: [
      { label: "Review source drafts", hash: "#source-drafts", purpose: "source-review", note: "Searches all held Current Sky aspect passages, including drafts that are not allowed to serve." },
      { label: "Edit saved aspect rows", hash: "#exact-content?category=Sky&q=sky.", purpose: "reader-copy", note: "Opens saved exact-aspect rows in the editor." }
    ]
  },
  "personal-transit-detail": {
    readerLocation: "You or Friends > personal transit detail",
    editability: "editable",
    routes: [{ label: "Edit personal transits", hash: "#exact-content?q=transit", purpose: "reader-copy", note: "Opens stored personal-transit rows." }]
  },
  "friends-compatibility-highlights": {
    readerLocation: "Friends > Compatibility > highlight cards",
    editability: "partial",
    routes: [{ label: "Find highlight copy", hash: "#compatibility?q=highlight", purpose: "reader-copy", note: "Saved copy is editable; locally assembled highlights still need a stored-row override." }]
  },
  "friends-circle-feed-cards": {
    readerLocation: "Friends > Circle feed and overview",
    editability: "partial",
    routes: [{ label: "Find circle copy", hash: "#exact-content?q=circle", purpose: "reader-copy", note: "Saved copy is editable; calculated local cards still need an authored-row contract." }]
  },
  "sky-daily-timing": {
    readerLocation: "Today or You > daily timing writeup",
    editability: "editable",
    routes: [{ label: "Edit daily timing", hash: "#exact-content?q=daily+timing", purpose: "reader-copy", note: "Opens stored daily timing sections." }]
  },
  "sky-calendar-event-cards": {
    readerLocation: "Calendar > event cards",
    editability: "editable",
    routes: [{ label: "Edit calendar events", hash: "#exact-content?q=calendar+event", purpose: "reader-copy", note: "Opens exact stored event descriptions." }]
  },
  "sky-lunar-day-editorial": {
    readerLocation: "Calendar > lunar day detail",
    editability: "editable",
    routes: [
      { label: "Edit lunar rows", hash: "#exact-content?q=lunar", purpose: "reader-copy", note: "Opens stored lunar editorial rows." },
      { label: "Edit lunar fallbacks", hash: "#fallback-hooks?section=lunar-calendar", purpose: "supporting-copy", note: "Opens fallback wording used when an exact row is unavailable." }
    ]
  },
  "sky-calendar-day-cards": {
    readerLocation: "Calendar > day cards",
    editability: "partial",
    routes: [{ label: "Find day-card copy", hash: "#exact-content?q=calendar+day", purpose: "reader-copy", note: "Saved copy is editable; local day-card material still needs a stored-row override." }]
  },
  "sky-horoscopes": {
    readerLocation: "Sky or You > daily and weekly horoscope summaries",
    editability: "partial",
    routes: [{ label: "Find horoscope copy", hash: "#exact-content?q=horoscope", purpose: "reader-copy", note: "Saved horoscope rows are editable; locally assembled period copy still needs a stored-row override." }]
  },
  "chart-placement-row-microcopy": {
    readerLocation: "You or Friends > chart placement rows and tooltips",
    editability: "partial",
    routes: [{ label: "Edit natal phrases", hash: "#vocabulary?category=natal&q=placement", purpose: "supporting-copy", note: "Phrase rows are editable; remaining UI microcopy is still code-owned." }]
  },
  "natal-empty-house": {
    readerLocation: "You or Friends > empty-house card and detail",
    editability: "partial",
    routes: [{ label: "Find empty-house copy", hash: "#exact-content?q=empty+house", purpose: "reader-copy", note: "Saved copy is editable; the current local fallback still needs runtime override wiring." }]
  },
  "personal-transit-house": {
    readerLocation: "You or Friends > personal transit house rows",
    editability: "partial",
    routes: [{ label: "Find transit-house copy", hash: "#exact-content?q=transit+house", purpose: "reader-copy", note: "Saved copy is editable; the current local fallback still needs a reviewed source-row layer." }]
  },
  "surface-specs-builders": {
    readerLocation: "Internal composition system; not shown directly to readers",
    editability: "editable",
    routes: [
      { label: "Edit templates", hash: "#templates", purpose: "supporting-copy", note: "Opens saved composition templates." },
      { label: "Edit slots", hash: "#slots", purpose: "supporting-copy", note: "Opens editable slot-backed rows." }
    ]
  }
};
