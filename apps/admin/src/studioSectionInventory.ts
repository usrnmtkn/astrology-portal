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
  "sky-placement/",
  "sky-article/",
  "authored/sky-lunation-macro/",
  "sky.placement."
] as const;

export const STUDIO_CALENDAR_ASPECT_PREFIXES = [
  "sky-card/",
  "fallback-hook/sky-aspect-sign/",
  "sky.aspect."
] as const;

export const STUDIO_NATAL_ASPECT_PREFIXES = ["fallback-hook/natal-aspect-lived/"] as const;

export const STUDIO_NATAL_CHART_PREFIXES = [
  "fallback-hook/natal-you-placement-",
  "fallback-template/natal.planet-in-sign",
  "fallback-hook/natal-core/"
] as const;

export const STUDIO_LUNAR_CALENDAR_PREFIXES = [
  "authored/calendar-weekly-moon/",
  "lunation/",
  "season/",
  "season-arc/",
  "transit-fallback/"
] as const;

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
export type StudioInventoryScope = "all" | "compatibility";

export type StudioInventoryQuery = {
  visibility: StudioInventoryVisibility;
  scope: StudioInventoryScope;
  prefixes: string[];
  mode: string | null;
  catalog: boolean;
};

export type StudioInventoryRoute = {
  page: string;
  categoryFilter?: string;
  fallbackSectionFilter?: string;
  skyWriteupWorkspaceView?: string;
  friendsTransitAudience?: boolean;
  betweenYouTwoWorkspace?: boolean;
  showReferenceRows?: boolean;
  showRetiredRows?: boolean;
};

function prefixesQuery(prefixes: readonly string[], visibility: StudioInventoryVisibility = "all"): StudioInventoryQuery {
  return {
    visibility,
    scope: "all",
    prefixes: [...prefixes],
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
  if (route.showReferenceRows || route.showRetiredRows) return catalogQuery("all");
  if (route.page === "reviewQueue" || route.page === "unresolvedContent") return catalogQuery("all");
  if (route.page === "content" && (!route.categoryFilter || route.categoryFilter === "all")) {
    return catalogQuery("editorial");
  }
  if (route.page === "compatibility" || route.page === "compositeByType") {
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
  if (route.page === "calendarWriteups") return prefixesQuery(STUDIO_LUNAR_CALENDAR_PREFIXES);
  if (route.page === "skyWriteups" && route.friendsTransitAudience && route.skyWriteupWorkspaceView === "house-transits") {
    return prefixesQuery(STUDIO_HOUSE_TRANSIT_PREFIXES);
  }
  if (route.page === "skyWriteups" && route.friendsTransitAudience && route.skyWriteupWorkspaceView === "transits-to-natal") {
    return prefixesQuery(STUDIO_PERSONAL_TRANSIT_PREFIXES);
  }
  if (route.page === "skyWriteups") return prefixesQuery(STUDIO_SKY_WRITEUP_PREFIXES);
  if (route.page === "knowledge" && route.betweenYouTwoWorkspace) {
    return prefixesQuery(STUDIO_BETWEEN_YOU_TWO_PREFIXES);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "friends") {
    return prefixesQuery(STUDIO_FRIENDS_SECTION_PREFIXES);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "daily") {
    return prefixesQuery(STUDIO_DAILY_PREFIXES);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "lunar-calendar") {
    return prefixesQuery(STUDIO_LUNAR_CALENDAR_PREFIXES);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "you") {
    return prefixesQuery([...STUDIO_NATAL_CHART_PREFIXES, ...STUDIO_NATAL_ASPECT_PREFIXES]);
  }
  if (route.page === "knowledge" && route.fallbackSectionFilter === "sky") {
    return prefixesQuery([...STUDIO_SKY_WRITEUP_PREFIXES, ...STUDIO_CALENDAR_ASPECT_PREFIXES]);
  }
  if (route.page === "knowledge") return prefixesQuery(["fallback-hook/", "authored/calendar-weekly-moon/"]);
  if (route.page === "vocabulary") return prefixesQuery(["vocab/", "fallback-vocab/"]);
  if (route.page === "slotDictionary") return prefixesQuery(["slot-template/"]);
  if (route.page === "templates") return prefixesQuery(["fallback-template/", "slot-template/"]);
  if (route.page === "compositionMap" || route.page === "hooks") return catalogQuery("all");
  return catalogQuery("editorial");
}

export function studioInventoryQueryKey(query: StudioInventoryQuery) {
  return [
    query.catalog ? "catalog" : "section",
    query.visibility,
    query.scope,
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
