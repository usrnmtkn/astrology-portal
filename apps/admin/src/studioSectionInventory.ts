/** Content Studio list queries: section first, compact inventory, one document on open. */

export const STUDIO_ASTRO_101_PREFIXES = ["education/astro-101/"] as const;

export const STUDIO_BETWEEN_YOU_TWO_PREFIXES = [
  "fallback-hook/bond-effect-",
  "fallback-hook/synastry-pair/",
  "fallback-hook/synastry-aspect-type/"
] as const;

export const STUDIO_PERSONAL_TRANSIT_PREFIXES = [
  "authored/transit-aspect/",
  "fallback-hook/transit-effect-hard/",
  "fallback-hook/transit-effect-soft/",
  "fallback-hook/transit-house-event-",
  "cms/personal-transit-aspect",
  "fallback-template/transit.aspect"
] as const;

export const STUDIO_HOUSE_TRANSIT_PREFIXES = [
  "authored/transit-house/",
  "authored/transit-house-intro/",
  "authored/transit-house-sign/",
  "fallback-hook/transit-house-retro-overlay/",
  "fallback-hook/transit-effect-house/",
  "fallback-template/transit.house"
] as const;

export const STUDIO_SKY_WRITEUP_PREFIXES = [
  "fallback-hook/planet-lived/",
  "sky-placement/",
  "sky-article",
  "sky/article",
  "sky/placement/",
  "sky/station/",
  "authored/sky-placement/",
  "authored/sky-lunation-macro/",
  "fallback-hook/sky-placement-lived/",
  "fallback-hook/sky-placement-hook/moon/",
  "fallback-hook/sky-placement-turn/moon/",
  "sky.placement."
] as const;

export const STUDIO_CALENDAR_ASPECT_PREFIXES = [
  "sky-card/",
  "fallback-hook/sky-aspect-sign/",
  "sky.aspect."
] as const;

export const STUDIO_PLANETARY_INGRESS_PREFIXES = ["sky.ingress.", "sky-ingress-", "sky-mercury-", "sky-venus-", "sky-mars-", "sky-jupiter-", "sky-saturn-", "sky-uranus-", "sky-neptune-", "sky-pluto-", "sky-chiron-", "sky-lilith-", "ms/ingress/", "fallback-hook/sky.ingress"] as const;
export const STUDIO_PLANETARY_STATION_PREFIXES = ["authored/station/", "sky.station.", "sky.retrograde.", "sky-retrograde-", "ms/retrograde/", "fallback-hook/sky.retrograde/", "fallback-hook/sky.station/"] as const;

export const STUDIO_NATAL_ASPECT_PREFIXES = ["fallback-hook/natal-aspect-lived/"] as const;

export const STUDIO_NATAL_CHART_PREFIXES = [
  "fallback-hook/natal/planet-intro/",
  "fallback-hook/natal-you-placement-",
  "fallback-template/natal.planet-in-sign",
  "fallback-hook/natal-core/"
] as const;

export const STUDIO_LUNAR_CALENDAR_PREFIXES = [
  "authored/calendar-timing/",
  "authored/calendar-weekly-moon/",
  "authored/calendar-moon-continuation-summary/",
  "authored/calendar-moon-context/",
  "authored/calendar-moon-transition/",
  "authored/calendar-season-transition/",
  "authored/lunar-journal/",
  "authored/sky-lunation-macro/",
  "cms/sky-daily-summary/sun/",
  "cms/sky-daily-summary/moon/",
  "lunation/",
  "season/",
  "season-arc/",
  "transit-fallback/"
] as const;

// Template browsing includes lunar templates and template-role rows stored in
// authored/fallback families, not only keys named "template".
export const STUDIO_TEMPLATE_PREFIXES = [
  "slot-template/", "fallback-template/", "fallback-hook/", "authored/week-opener/",
  ...STUDIO_LUNAR_CALENDAR_PREFIXES
] as const;
export const STUDIO_FALLBACK_PREFIXES = ["fallback-hook/", "fallback-template/", "house-horoscope-core/", "authored/calendar-weekly-moon/"] as const;
export const STUDIO_VOCABULARY_PREFIXES = ["vocab/", "vocab.", "fallback-vocab/", "guide-phrase/"] as const;

export const STUDIO_DAILY_PREFIXES = [
  "fallback-hook/daily-headline/",
  "fallback-hook/daily-body/",
  "fallback-hook/pair-daily/"
] as const;

export const STUDIO_FRIENDS_SECTION_PREFIXES = [
  ...STUDIO_BETWEEN_YOU_TWO_PREFIXES,
  "fallback-hook/friends",
  "fallback-hook/relationship",
  "fallback-hook/synastry",
  "fallback-hook/compat-"
] as const;

export type StudioInventoryVisibility = "editorial" | "all";
export type StudioInventoryScope = "all" | "compatibility" | "composite" | "sky-types" | "template-types" | "fallback-types" | "slot-types" | "vocabulary-types";

export type StudioInventoryQuery = {
  visibility: StudioInventoryVisibility;
  scope: StudioInventoryScope;
  prefixes: string[];
  mode: string | null;
  catalog: boolean;
  supplementalScope?: StudioInventoryScope;
};

export type StudioInventoryRoute = {
  page: string;
  categoryFilter?: string;
  fallbackSectionFilter?: string;
  skyWriteupWorkspaceView?: string;
  calendarWriteupWorkspaceView?: string;
  friendsTransitAudience?: boolean;
  betweenYouTwoWorkspace?: boolean;
  showReferenceRows?: boolean;
  showRetiredRows?: boolean;
};

function prefixesQuery(prefixes: readonly string[], visibility: StudioInventoryVisibility = "all", supplementalScope?: StudioInventoryScope): StudioInventoryQuery {
  return {
    visibility,
    scope: "all",
    prefixes: [...prefixes],
    ...(supplementalScope ? { supplementalScope } : {}),
    mode: null,
    catalog: false
  };
}

function catalogQuery(visibility: StudioInventoryVisibility = "all"): StudioInventoryQuery {
  return {
    visibility,
    scope: "all",
    prefixes: [],
    mode: null,
    catalog: true
  };
}

export function studioInventoryQuery(route: StudioInventoryRoute): StudioInventoryQuery {
  // Visibility widens the rows inside a section, never the section itself.
  const catalogVisibility = route.showReferenceRows || route.showRetiredRows ? "all" : "editorial";
  if (route.page === "reviewQueue" || route.page === "unresolvedContent") return catalogQuery("all");
  if (route.page === "content" && (!route.categoryFilter || route.categoryFilter === "all")) {
    return catalogQuery(catalogVisibility);
  }
  if (route.page === "compositeByType") {
    return { visibility: "all", scope: "composite", prefixes: [], mode: null, catalog: false };
  }
  if (route.page === "compatibility") {
    return { visibility: "all", scope: "compatibility", prefixes: [], mode: null, catalog: false };
  }
  if (route.page === "astro101") return prefixesQuery(STUDIO_ASTRO_101_PREFIXES);
  if (route.page === "articles") {
    return { visibility: "all", scope: "all", prefixes: [], mode: "article", catalog: false };
  }
  if (route.page === "content" && route.categoryFilter === "Natal Chart") {
    return prefixesQuery(STUDIO_NATAL_CHART_PREFIXES);
  }
  if (route.page === "content" && route.categoryFilter === "Natal Aspects") {
    return prefixesQuery(STUDIO_NATAL_ASPECT_PREFIXES);
  }
  if (route.page === "content" && route.categoryFilter === "Calendar Aspects") {
    return prefixesQuery(STUDIO_CALENDAR_ASPECT_PREFIXES);
  }
  if (route.page === "content" && route.categoryFilter === "Personal Transits") {
    return prefixesQuery(STUDIO_PERSONAL_TRANSIT_PREFIXES);
  }
  if (route.page === "content" && route.categoryFilter === "House Transits") {
    return prefixesQuery(STUDIO_HOUSE_TRANSIT_PREFIXES);
  }
  if (route.page === "calendarWriteups") {
    if (route.calendarWriteupWorkspaceView === "moon-transition-phrases") return prefixesQuery(["authored/calendar-timing/", "authored/calendar-moon-continuation-summary/", "authored/calendar-moon-context/"]);
    if (route.calendarWriteupWorkspaceView === "planetary-ingresses") return prefixesQuery(STUDIO_PLANETARY_INGRESS_PREFIXES);
    if (route.calendarWriteupWorkspaceView === "planetary-stations") return prefixesQuery(STUDIO_PLANETARY_STATION_PREFIXES);
    return prefixesQuery(STUDIO_LUNAR_CALENDAR_PREFIXES);
  }
  if (route.page === "skyWriteups" && route.skyWriteupWorkspaceView === "house-transits") {
    return prefixesQuery(STUDIO_HOUSE_TRANSIT_PREFIXES);
  }
  if (route.page === "skyWriteups" && route.skyWriteupWorkspaceView === "transits-to-natal") {
    return prefixesQuery(STUDIO_PERSONAL_TRANSIT_PREFIXES);
  }
  if (route.page === "skyWriteups" && route.skyWriteupWorkspaceView === "daily-summary") {
    return prefixesQuery(["cms/sky-daily-summary/", "cms/sky-debility/"]);
  }
  if (route.page === "skyWriteups") return prefixesQuery(STUDIO_SKY_WRITEUP_PREFIXES, "all", "sky-types");
  if (route.page === "knowledge" && route.betweenYouTwoWorkspace) {
    return prefixesQuery(STUDIO_BETWEEN_YOU_TWO_PREFIXES);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "daily") {
    return prefixesQuery(STUDIO_DAILY_PREFIXES);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "lunar-calendar") {
    return prefixesQuery(STUDIO_LUNAR_CALENDAR_PREFIXES);
  }
  // Fallback section membership also uses the row's surface, not just its key.
  // The writing-workspace prefixes exclude reusable ingredients in these lists.
  if (route.page === "knowledge") return prefixesQuery(STUDIO_FALLBACK_PREFIXES, "all", "fallback-types");
  if (route.page === "vocabulary") return prefixesQuery(STUDIO_VOCABULARY_PREFIXES, "all", "vocabulary-types");
  if (route.page === "slotDictionary") return prefixesQuery([...STUDIO_TEMPLATE_PREFIXES, ...STUDIO_VOCABULARY_PREFIXES], "all", "slot-types");
  if (route.page === "templates") return prefixesQuery(STUDIO_TEMPLATE_PREFIXES, "all", "template-types");
  if (route.page === "compositionMap" || route.page === "hooks") return catalogQuery("all");
  return catalogQuery(catalogVisibility);
}

export function studioInventoryQueryKey(query: StudioInventoryQuery) {
  return [
    query.catalog ? "catalog" : "section",
    query.visibility,
    query.scope,
    query.supplementalScope ?? "",
    query.mode ?? "",
    ...query.prefixes
  ].join("|");
}

export function studioInventoryRequestPath(query: StudioInventoryQuery, pageSize: number, cursor?: string | null) {
  const params = new URLSearchParams({
    status: "all",
    visibility: query.visibility,
    scope: query.scope,
    limit: String(pageSize),
    view: "inventory"
  });
  if (query.mode) params.set("mode", query.mode);
  for (const prefix of query.prefixes) params.append("contentKeyPrefix", prefix);
  if (cursor) params.set("cursor", cursor);
  return `/api/admin/generated-content-inventory?${params}`;
}

/** Prefix passes retain virtual starters; the final metadata pass finds older/custom keys. */
export function studioInventoryPasses(query: StudioInventoryQuery): StudioInventoryQuery[] {
  const passes = query.prefixes.length
    ? query.prefixes.map(prefix => ({ ...query, prefixes: [prefix] }))
    : [{ ...query, prefixes: [] }];
  if (query.supplementalScope) passes.push({ ...query, scope: query.supplementalScope, prefixes: [], supplementalScope: undefined });
  return passes;
}
