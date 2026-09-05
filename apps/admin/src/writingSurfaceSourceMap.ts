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
  area: "Friends" | "Natal" | "Sky" | "Transits" | "Reports" | "System";
  runtimeSurfaceIds?: string[];
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

export type WritingSurfaceCmsStarter = {
  label: string;
  contentKey: string;
  surface: "sky" | "you" | "natal" | "relationship";
  headline: string;
  allowedSlots: string[];
};

export type WritingSurfaceAdminAccess = {
  readerLocation: string;
  editability: "editable" | "partial" | "missing";
  routes: WritingSurfaceAdminRoute[];
  cmsStarters?: WritingSurfaceCmsStarter[];
};

export const personalTransitAspectAllowedSlots = [
  "transitPlanet",
  "transitPlanetTopic",
  "transitSign",
  "transitHouse",
  "transitHouseOrdinal",
  "transitHouseTopic",
  "aspect",
  "aspectAdj",
  "aspectVerb",
  "aspectTone",
  "natalPoint",
  "natalPointTopic",
  "natalSign",
  "natalHouse",
  "natalHouseOrdinal",
  "natalHouseTopic",
  "window",
  "owner",
  "ownerPossessive"
] as const;

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
    id: "friends-pair-daily",
    surface: "Friends: Between You Two V2",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["shared relationship evidence", "headline", "canonical bond body or shared-Moon body", "optional individual context", "optional useful move"],
    visibleLayerOrder: ["source-grounded"],
    currentRenderPath: "ManualChartsPanel selects the top-ranked active bond transit first. BetweenYouTwoV2 resolves only an approved direction-specific headline + canonical owner-approved family body + approved move. If no bond transit exists, an approved shared-Moon note may render. With no shared condition, the daily synthesis is omitted.",
    risk: "V2 approval is directional. Reader-facing headline/move approval must never be copied to an unseen reverse-direction row. Held rows remain visible in Content Studio but excluded from the reader bundle.",
    nextAction: "Review held V2 reader-direction and reverse-direction rows separately in Content Studio. Promote only exact wording the owner has reviewed.",
    sources: [
      { label: "ManualChartsPanel.tsx", path: "apps/web/src/features/friends/ManualChartsPanel.tsx", role: "renderer" },
      { label: "betweenYouTwoV2.ts", path: "apps/web/src/services/betweenYouTwoV2.ts", role: "renderer" },
      { label: "pair-daily-v2-rows.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-v2-rows.json", role: "source-grounded" },
      { label: "bond-effect directional corpus", path: "packages/astro-knowledge/review/bond-effect-directional-copy-v1", role: "source-grounded" },
      { label: "pair-daily-frames-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-frames-v1.json", role: "source-grounded" },
      { label: "pair-daily-clauses-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-clauses-v1.json", role: "source-grounded" }
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
    id: "natal-aspect-patterns",
    surface: "Natal / Friends: Aspect Patterns And Active Now",
    area: "Natal",
    status: "normalized",
    requiredSlots: ["pattern title", "pattern interpretation", "optional activation interpretation"],
    visibleLayerOrder: ["source-grounded"],
    currentRenderPath: "The astrology service detects and ranks chart patterns, then requests governed authored pattern and activation copy. YouPage and FriendNatalTab render only the server-resolved records returned with the calculated pattern facts.",
    risk: "Pattern geometry and activation timing are calculated and cannot be edited as prose. Missing authored copy must remain unavailable rather than being replaced by an untracked local paragraph.",
    nextAction: "Edit natal and Active Now pattern records in the dedicated Aspect Patterns workspace, then verify the shared You/Friends reader component.",
    sources: [
      { label: "NatalAspectPatternsSection.tsx", path: "apps/web/src/features/you/NatalAspectPatternsSection.tsx", role: "renderer" },
      { label: "natalAspectPatterns.ts", path: "apps/web/src/services/natalAspectPatterns.ts", role: "renderer" },
      { label: "AspectPatternWriteups.tsx", path: "apps/admin/src/AspectPatternWriteups.tsx", role: "stored-source" },
      { label: "aspect-pattern-writeups.ts", path: "api/admin/aspect-pattern-writeups.ts", role: "stored-source" }
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
    id: "sky-retrograde-summary",
    surface: "Sky: Retrograde Summary",
    area: "Sky",
    status: "normalized",
    requiredSlots: ["retrograde count", "planet list", "personal retrograde list"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "The Sky retrograde callout resolves a reviewed LIVE CMS summary first and keeps the active planet names and counts as calculated slots. If no reviewed override exists, the existing local sentence remains the fallback.",
    risk: "The active retrograde list changes with the selected date. Editors may change only the surrounding sentence and must keep planet names and counts as slots when they are mentioned.",
    nextAction: "Use the retrograde-summary starter, review the rendered example, and publish it when the wording is ready.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "cmsSurfaceOverrides.ts", path: "apps/web/src/content/cmsSurfaceOverrides.ts", role: "stored-source" }
    ]
  },
  {
    id: "personal-transit-detail",
    surface: "Personal Transit Detail Pages",
    area: "Transits",
    status: "normalized",
    requiredSlots: ["transit meaning", "personal activation"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "Personal transit details and Sky-placement natal-aspect sections resolve a LIVE CMS override first, then compose the reader's calculated transit house and natal house with governed authored aspect rows.",
    risk: "The house values are reader-specific calculated facts and must remain slots; they must never be copied into reusable authored-row metadata as fixed values.",
    nextAction: "Keep the CMS allowed-slot contract aligned with transitToNatalTemplateSlots and preserve source-key provenance in previews.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "fallbackArchitectureV3Runtime.ts", path: "apps/web/src/content/fallbackArchitectureV3Runtime.ts", role: "source-grounded" },
      { label: "dist/tldr-content.js", path: "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js", role: "fallback-package" },
      { label: "dashboard materializer", path: "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", role: "stored-source" },
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
    id: "daily-at-a-glance",
    surface: "You / Friends: Daily At-a-Glance",
    area: "Transits",
    status: "normalized",
    requiredSlots: ["calculated daily driver", "daily headline", "daily body"],
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "The app calculates the tightest applying Moon-to-natal contact for the reader's civil day, or the Moon's reliable whole-sign house when no contact qualifies. renderDailyGlance then selects the matching reviewed daily headline and body hook; a source gap hides the card.",
    risk: "The driver is calculated per chart and date. Editors can change the reviewed hook wording, but must not hard-code a planet, aspect, house, person, or date into reusable rows.",
    nextAction: "Edit the daily headline/body hook families, then QA both You and friend voice against calculated aspect and house drivers.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "chartMath.ts", path: "apps/web/src/services/chartMath.ts", role: "renderer" },
      { label: "renderTransitSynastry.browser.ts", path: "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts", role: "renderer" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" },
      { label: "daily-glance-variants-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/daily-glance-variants-v1.json", role: "source-grounded" }
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
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "Calendar day cards resolve matching LIVE CMS Moon, phase, and continuation rows first, then use the reviewed package guidance or calculated fallback.",
    risk: "Dates, Moon signs, and phases stay calculated; CMS templates may edit only the prose around those facts.",
    nextAction: "Use the Moon-day starter or create a phase or continuation row, then review and publish it.",
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
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "buildWeeklyHoroscope resolves matching LIVE CMS rows for the weekly macro and each section, then uses the reviewed package renderer while keeping dates, houses, and event facts calculated.",
    risk: "A template with an unavailable calculated slot fails closed and leaves the reviewed weekly fallback in place.",
    nextAction: "Use the weekly Moon starter or create a source-specific weekly row, then review and publish it.",
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
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "PlacementRows resolves a planet-specific or generic LIVE CMS description first, then uses the existing normalized placement microcopy.",
    risk: "Placement facts and dignity labels remain calculated; the CMS row controls only the descriptive prose.",
    nextAction: "Use the placement-row starter, or create a planet-specific cms/chart-placement-row row, then review and publish it.",
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
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "Empty-house cards and details resolve the most specific matching LIVE CMS row first, then use the existing normalized local copy.",
    risk: "House, sign, and ruler facts stay calculated; missing template slots safely return the reader to the local fallback.",
    nextAction: "Use the detail starter or create card/detail rows for a specific house or sign, then review and publish them.",
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
    visibleLayerOrder: ["source-grounded", "madlib-fallback"],
    currentRenderPath: "Personal transit house rows resolve the most specific matching LIVE CMS row first, then use the existing source-based house activation fallback.",
    risk: "Planet, house, sign, motion, and timing remain calculated; a template that cannot resolve those slots does not serve.",
    nextAction: "Use the transit-house starter or create a more specific planet/house row, then review and publish it.",
    sources: [
      { label: "App.tsx", path: "apps/web/src/App.tsx", role: "renderer" },
      { label: "fallback-source-rows-v3.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", role: "fallback-package" }
    ]
  },
  {
    id: "generated-reports",
    surface: "Purchased Reports: Delivered Report Article",
    area: "Reports",
    status: "normalized",
    requiredSlots: ["frozen chart facts", "owner prompt", "report units", "assembled chapters", "key dates"],
    visibleLayerOrder: ["source-grounded", "generated"],
    currentRenderPath: "The fulfillment service freezes report facts, selects governed source material and owner prompt versions, generates and validates each report unit, assembles the accepted units, and delivers the stored report through ReportDeliveryView and ReportArticle.",
    risk: "Delivered report prose is generated per order. Corrections must be staged privately and explicitly published so an in-progress edit never changes the reader's live report.",
    nextAction: "Use Preview and edit in Report Fulfillment to inspect each delivered unit, save a private correction draft, and explicitly publish the reviewed correction.",
    sources: [
      { label: "ReportDeliveryView.tsx", path: "apps/web/src/components/reports/ReportDeliveryView.tsx", role: "renderer" },
      { label: "ReportArticle.tsx", path: "apps/web/src/components/reports/ReportArticle.tsx", role: "renderer" },
      { label: "report-generation.ts", path: "api/_lib/report-generation.ts", role: "source-grounded" },
      { label: "report-writer-chain.ts", path: "api/_lib/report-writer-chain.ts", role: "renderer" },
      { label: "report-assembly.ts", path: "api/_lib/report-assembly.ts", role: "renderer" },
      { label: "ReportFulfillmentAdminPanel.tsx", path: "apps/admin/src/ReportFulfillmentAdminPanel.tsx", role: "stored-source" },
      { label: "Owner report prompts", path: "tldr-astro-phrasebank", role: "source-grounded" },
      { label: "Report manifestation sets", path: "packages/astro-knowledge/data/manifestation-sets", role: "knowledge" }
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
  "friends-pair-daily": {
    readerLocation: "Friends > selected person > Today between you two",
    editability: "editable",
    routes: [
      { label: "Edit Today between you two", hash: "#fallback-hooks?section=daily&q=pair-daily", purpose: "reader-copy", note: "Opens every reviewed opener, personal clause, shared bridge, and closing-advice source used by the pair-daily renderer." }
    ]
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
  "natal-aspect-patterns": {
    readerLocation: "You or Friends > Birth chart > Patterns in your chart; Friends > Active Now",
    editability: "editable",
    routes: [
      { label: "Edit natal aspect patterns", hash: "#content/aspect-patterns", purpose: "reader-copy", note: "Opens authored natal pattern records with coverage and preview tools." },
      { label: "Edit Active Now patterns", hash: "#content/aspect-patterns/activation", purpose: "reader-copy", note: "Opens authored activation copy used when a current transit triggers a natal pattern." }
    ]
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
  "sky-retrograde-summary": {
    readerLocation: "Sky > retrograde callout > summary sentence",
    editability: "editable",
    routes: [{ label: "Edit retrograde summary", hash: "#exact-content?q=cms%2Fsky-retrograde-summary", purpose: "reader-copy", note: "Opens the reviewed LIVE-first summary template used above the retrograde planet cards." }],
    cmsStarters: [{
      label: "Start retrograde-summary template",
      contentKey: "cms/sky-retrograde-summary",
      surface: "sky",
      headline: "Retrogrades",
      allowedSlots: ["count", "planetList", "personalCount", "personalPlanetList"]
    }]
  },
  "personal-transit-detail": {
    readerLocation: "Sky > placement detail > Aspects to the natal chart; You or Friends > personal transit detail",
    editability: "editable",
    routes: [{ label: "Edit personalized aspect overrides", hash: "#exact-content?q=cms%2Fpersonal-transit-aspect", purpose: "reader-copy", note: "Opens house-aware LIVE-first overrides for transits to natal placements." }],
    cmsStarters: [{
      label: "Start personalized aspect template",
      contentKey: "cms/personal-transit-aspect/you/template",
      surface: "you",
      headline: "{{transitPlanet}} {{aspect}} your {{natalPoint}}",
      allowedSlots: [...personalTransitAspectAllowedSlots]
    }]
  },
  "sky-daily-timing": {
    readerLocation: "Today or You > daily timing writeup",
    editability: "editable",
    routes: [{ label: "Edit daily timing", hash: "#exact-content?q=daily+timing", purpose: "reader-copy", note: "Opens stored daily timing sections." }]
  },
  "daily-at-a-glance": {
    readerLocation: "You > Daily At-a-Glance; Friends > Daily At-a-Glance",
    editability: "editable",
    routes: [
      { label: "Edit daily headline and body hooks", hash: "#fallback-hooks?section=daily&q=daily", purpose: "reader-copy", note: "Opens the reviewed daily headline/body hook families used after the app calculates the day's driver." },
      { label: "Inspect daily slots", hash: "#slots?q=daily", purpose: "supporting-copy", note: "Shows the daily template variables and whether each value is calculated or saved copy." }
    ]
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
    editability: "editable",
    routes: [{ label: "Edit day-card copy", hash: "#exact-content?q=cms%2Fcalendar-day", purpose: "reader-copy", note: "Opens LIVE-first Calendar day templates." }],
    cmsStarters: [
      { label: "Start Moon-day template", contentKey: "cms/calendar-day/moon", surface: "sky", headline: "Moon in {{moonSign}}", allowedSlots: ["date", "moonSign", "phase", "role"] },
      { label: "Start phase-day template", contentKey: "cms/calendar-day/phase", surface: "sky", headline: "{{phase}}", allowedSlots: ["date", "moonSign", "phase", "role"] },
      { label: "Start continuation template", contentKey: "cms/calendar-day/continuation", surface: "sky", headline: "Moon in {{moonSign}}", allowedSlots: ["date", "moonSign", "phase", "role"] }
    ]
  },
  "sky-horoscopes": {
    readerLocation: "Sky or You > daily and weekly horoscope summaries",
    editability: "editable",
    routes: [{ label: "Edit horoscope copy", hash: "#exact-content?q=cms%2Fweekly-horoscope", purpose: "reader-copy", note: "Opens LIVE-first weekly section templates; calculated dates and houses remain runtime facts." }],
    cmsStarters: [
      { label: "Start weekly Moon template", contentKey: "cms/weekly-horoscope/weekly-moon", surface: "you", headline: "Your week", allowedSlots: ["risingSign", "date", "day", "driver", "timing", "house", "houseOrdinal"] },
      { label: "Start lunation-week template", contentKey: "cms/weekly-horoscope/lunation", surface: "you", headline: "{{driver}}", allowedSlots: ["risingSign", "date", "day", "driver", "timing", "house", "houseOrdinal"] },
      { label: "Start station-week template", contentKey: "cms/weekly-horoscope/station", surface: "you", headline: "{{driver}}", allowedSlots: ["risingSign", "date", "day", "driver", "timing", "house", "houseOrdinal"] },
      { label: "Start return-week template", contentKey: "cms/weekly-horoscope/return", surface: "you", headline: "{{driver}}", allowedSlots: ["risingSign", "date", "day", "driver", "timing", "house", "houseOrdinal"] },
      { label: "Start heavy-transit template", contentKey: "cms/weekly-horoscope/heavy", surface: "you", headline: "{{driver}}", allowedSlots: ["risingSign", "date", "day", "driver", "timing", "house", "houseOrdinal"] },
      { label: "Start weekly overview template", contentKey: "cms/weekly-horoscope/macro", surface: "you", headline: "Your week", allowedSlots: ["risingSign", "weekStart", "weekEnd"] }
    ]
  },
  "chart-placement-row-microcopy": {
    readerLocation: "You or Friends > chart placement rows and tooltips",
    editability: "editable",
    routes: [{ label: "Edit placement-row copy", hash: "#exact-content?q=cms%2Fchart-placement-row", purpose: "reader-copy", note: "Opens LIVE-first placement-row overrides." }],
    cmsStarters: [{ label: "Start placement-row template", contentKey: "cms/chart-placement-row/template", surface: "natal", headline: "Placement row", allowedSlots: ["planet", "sign", "voice", "ownerName"] }]
  },
  "natal-empty-house": {
    readerLocation: "You or Friends > empty-house card and detail",
    editability: "editable",
    routes: [{ label: "Edit empty-house copy", hash: "#exact-content?q=cms%2Fnatal-empty-house", purpose: "reader-copy", note: "Opens LIVE-first card and detail templates." }],
    cmsStarters: [
      { label: "Start your empty-house card", contentKey: "cms/natal-empty-house/card/you/template", surface: "natal", headline: "{{houseOrdinal}} house", allowedSlots: ["house", "houseOrdinal", "sign", "ruler", "rulerSign", "rulerHouse", "rulerHouseOrdinal", "ownerName"] },
      { label: "Start empty-house detail template", contentKey: "cms/natal-empty-house/detail/you/template", surface: "natal", headline: "{{houseOrdinal}} house", allowedSlots: ["house", "houseOrdinal", "sign", "ruler", "rulerSign", "rulerHouse", "rulerHouseOrdinal"] },
      { label: "Start friend empty-house card", contentKey: "cms/natal-empty-house/card/they/template", surface: "natal", headline: "{{houseOrdinal}} house", allowedSlots: ["house", "houseOrdinal", "sign", "ruler", "rulerSign", "rulerHouse", "rulerHouseOrdinal", "ownerName"] },
      { label: "Start friend empty-house detail", contentKey: "cms/natal-empty-house/detail/they/template", surface: "natal", headline: "{{houseOrdinal}} house", allowedSlots: ["house", "houseOrdinal", "sign", "ruler", "rulerSign", "rulerHouse", "rulerHouseOrdinal"] }
    ]
  },
  "personal-transit-house": {
    readerLocation: "You or Friends > personal transit house rows",
    editability: "editable",
    routes: [{ label: "Edit transit-house copy", hash: "#exact-content?q=cms%2Fpersonal-transit-house", purpose: "reader-copy", note: "Opens LIVE-first transit-house overrides." }],
    cmsStarters: [
      { label: "Start your transit-house template", contentKey: "cms/personal-transit-house/you/template", surface: "you", headline: "{{planet}} through your {{houseOrdinal}} house", allowedSlots: ["planet", "sign", "house", "houseOrdinal", "motion", "window", "owner", "ownerPossessive"] },
      { label: "Start friend transit-house template", contentKey: "cms/personal-transit-house/they/template", surface: "you", headline: "{{planet}} through {{ownerPossessive}} {{houseOrdinal}} house", allowedSlots: ["planet", "sign", "house", "houseOrdinal", "motion", "window", "owner", "ownerPossessive"] }
    ]
  },
  "generated-reports": {
    readerLocation: "Purchased report delivery > report cover, chapters, and key dates",
    editability: "editable",
    routes: [
      { label: "Preview and edit delivered reports", hash: "#report-fulfillment", purpose: "reader-copy", note: "Opens the exact delivered title, TL;DR, body, and chapter sections. Corrections remain private until an editor explicitly publishes them." }
    ]
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
