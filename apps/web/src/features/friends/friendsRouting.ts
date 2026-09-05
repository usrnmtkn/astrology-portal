export type FriendProfileTab = "compatibility" | "transits" | "natal" | "synastry" | "composite";
export type FriendsMainView = "circle" | "charts" | "requests" | "profile";
export type FriendsTab = Exclude<FriendsMainView, "profile">;

export type FriendsRouteState = {
  tab: FriendsTab;
  chartId: string | null;
  view: FriendProfileTab;
  detail: string | null;
};

const friendsTabs: FriendsTab[] = ["circle", "charts", "requests"];
const friendProfileTabs: FriendProfileTab[] = ["compatibility", "transits", "natal", "synastry", "composite"];
const friendsTabStorageKey = "tldrastro:friendsTab";
const reservedFriendHandlePaths = new Set([
  "account",
  "admin",
  "api",
  "auth",
  "calendar",
  "content",
  "friends",
  "login",
  "logout",
  "privacy",
  "reports",
  "settings",
  "signup",
  "sky",
  "support",
  "terms",
  "you"
]);
const chartIdByHandle = new Map<string, string>();
const handleByChartId = new Map<string, string>();

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function friendHandleIsValid(value: string) {
  return /^[a-z][a-z0-9_]{2,23}$/.test(normalizeHandle(value));
}

function decodePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function friendProfilePathParts(url: URL) {
  const parts = url.pathname
    .split("/")
    .filter(Boolean)
    .map(decodePathPart);

  if (parts.length < 1 || parts.length > 2) {
    return null;
  }

  const handle = normalizeHandle(parts[0] ?? "");

  if (!friendHandleIsValid(handle) || reservedFriendHandlePaths.has(handle)) {
    return null;
  }

  const requestedView = parts[1]?.toLowerCase() ?? null;

  if (requestedView && !friendProfileTabs.includes(requestedView as FriendProfileTab)) {
    return null;
  }

  return {
    handle,
    view: requestedView ? (requestedView as FriendProfileTab) : "compatibility" as FriendProfileTab,
    detail: url.searchParams.get("detail")
  };
}

export function registerFriendHandleRoute(handle: string, chartId: string) {
  const normalizedHandle = normalizeHandle(handle);

  if (!friendHandleIsValid(normalizedHandle) || reservedFriendHandlePaths.has(normalizedHandle) || !chartId) {
    return false;
  }

  chartIdByHandle.set(normalizedHandle, chartId);
  handleByChartId.set(chartId, normalizedHandle);
  return true;
}

async function hydrateFriendHandleRoutes() {
  const { listSocialFriends, socialFriendChartId } = await import("../../services/socialFriends");
  const friends = await listSocialFriends();

  for (const friend of friends) {
    registerFriendHandleRoute(friend.handle, socialFriendChartId(friend.userId));
  }
}

export async function prepareFriendProfileRoute(href: string) {
  try {
    const url = new URL(href);
    const route = friendProfilePathParts(url);

    if (!route) {
      return false;
    }

    if (!chartIdByHandle.has(route.handle)) {
      await hydrateFriendHandleRoutes();
    }

    if (!chartIdByHandle.has(route.handle)) {
      return false;
    }

    try {
      window.localStorage.setItem("tldrastro:portalMode", "friends");
      window.localStorage.setItem(friendsTabStorageKey, "charts");
    } catch {
      // Route parsing still works if storage is unavailable.
    }

    return true;
  } catch {
    return false;
  }
}

export function parseFriendsTab(value: string | null): FriendsTab {
  return value === "charts" || value === "requests" || value === "circle" ? value : "circle";
}

export function parseFriendProfileTab(value: string | null): FriendProfileTab {
  return value === "compatibility" || value === "transits" || value === "synastry" || value === "composite" || value === "natal"
    ? value
    : "compatibility";
}

export function friendsHashParts(hash: string) {
  const cleanHash = hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = cleanHash.split("?");

  return { path, params: new URLSearchParams(query) };
}

export function friendsRouteStateFromHref(href: string): FriendsRouteState | null {
  try {
    const url = new URL(href);
    const { path, params } = friendsHashParts(url.hash);
    const routeParams = url.pathname === "/friends" ? url.searchParams : path === "friends" ? params : null;

    if (routeParams) {
      return {
        tab: parseFriendsTab(routeParams.get("tab")),
        chartId: routeParams.get("chart"),
        view: parseFriendProfileTab(routeParams.get("view")),
        detail: routeParams.get("detail")
      };
    }

    const profileRoute = friendProfilePathParts(url);
    const chartId = profileRoute ? chartIdByHandle.get(profileRoute.handle) ?? null : null;

    if (!profileRoute || !chartId) {
      return null;
    }

    return {
      tab: "charts",
      chartId,
      view: profileRoute.view,
      detail: profileRoute.detail
    };
  } catch {
    return null;
  }
}

export function initialFriendProfileContentRequest(href: string): FriendProfileTab | null {
  const routeState = friendsRouteStateFromHref(href);

  return routeState?.chartId ? routeState.view : null;
}

export function friendsRouteStateFromUrl() {
  return friendsRouteStateFromHref(window.location.href);
}

export function friendsTabFromHref(href: string): FriendsTab {
  try {
    const url = new URL(href);
    const searchTab = url.searchParams.get("tab");

    if (url.pathname === "/friends" && friendsTabs.includes(searchTab as FriendsTab)) {
      return parseFriendsTab(searchTab);
    }

    const profileRoute = friendProfilePathParts(url);

    if (profileRoute && chartIdByHandle.has(profileRoute.handle)) {
      return "charts";
    }

    const { path, params } = friendsHashParts(url.hash);

    return path === "friends" ? parseFriendsTab(params.get("tab")) : "circle";
  } catch {
    return "circle";
  }
}

export function friendsTabFromUrl(): FriendsTab {
  return friendsTabFromHref(window.location.href);
}

export function isFriendsHref(href: string) {
  try {
    const url = new URL(href);
    const { path } = friendsHashParts(url.hash);
    const profileRoute = friendProfilePathParts(url);

    return (
      url.pathname === "/friends"
      || path === "friends"
      || Boolean(profileRoute && chartIdByHandle.has(profileRoute.handle))
    );
  } catch {
    return false;
  }
}

export function isFriendsUrl() {
  return isFriendsHref(window.location.href);
}

export function friendsTabHref(href: string, tab: FriendsTab) {
  const url = new URL(href);
  const profileRoute = friendProfilePathParts(url);
  const isReadableProfile = Boolean(profileRoute && chartIdByHandle.has(profileRoute.handle));

  if (url.pathname === "/friends" || isReadableProfile) {
    url.pathname = "/friends";
    url.search = "";
    url.hash = "";
    url.searchParams.set("tab", tab);
  } else {
    const { path, params } = friendsHashParts(url.hash);
    const nextParams = path === "friends" ? params : new URLSearchParams();
    nextParams.set("tab", tab);
    nextParams.delete("chart");
    nextParams.delete("view");
    nextParams.delete("detail");
    url.hash = `friends?${nextParams.toString()}`;
  }

  return url.toString();
}

export function updateFriendsTabUrl(tab: FriendsTab, mode: "push" | "replace" = "push") {
  try {
    const href = friendsTabHref(window.location.href, tab);
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", href);
  } catch {
    // URL state is an enhancement; keep the tab usable if history is unavailable.
  }
}

export function friendHandleProfileHref(
  href: string,
  handle: string,
  view: FriendProfileTab = "compatibility",
  detail?: string | null
) {
  const url = new URL(href);
  const normalizedHandle = normalizeHandle(handle);

  if (!friendHandleIsValid(normalizedHandle) || reservedFriendHandlePaths.has(normalizedHandle)) {
    return url.toString();
  }

  url.pathname = view === "compatibility"
    ? `/${encodeURIComponent(normalizedHandle)}`
    : `/${encodeURIComponent(normalizedHandle)}/${view}`;
  url.search = "";
  url.hash = "";

  if (detail) {
    url.searchParams.set("detail", detail);
  }

  return url.toString();
}

export function friendProfileHref(
  href: string,
  chartId: string,
  view: FriendProfileTab = "natal",
  detail?: string | null
) {
  const knownHandle = handleByChartId.get(chartId);

  if (knownHandle) {
    return friendHandleProfileHref(href, knownHandle, view, detail);
  }

  const url = new URL(href);

  if (url.pathname === "/friends") {
    url.searchParams.set("tab", "charts");
    url.searchParams.set("chart", chartId);
    url.searchParams.set("view", view);
    if (detail) {
      url.searchParams.set("detail", detail);
    } else {
      url.searchParams.delete("detail");
    }
  } else {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", "charts");
    nextParams.set("chart", chartId);
    nextParams.set("view", view);
    if (detail) {
      nextParams.set("detail", detail);
    }
    url.hash = `friends?${nextParams.toString()}`;
  }

  return url.toString();
}

async function replaceSocialFriendProfileWithReadableUrl(
  chartId: string,
  view: FriendProfileTab,
  detail?: string | null
) {
  if (!chartId.startsWith("social:") || handleByChartId.has(chartId)) {
    return;
  }

  try {
    await hydrateFriendHandleRoutes();
    const handle = handleByChartId.get(chartId);

    if (!handle) {
      return;
    }

    const currentRoute = friendsRouteStateFromHref(window.location.href);

    if (
      currentRoute?.chartId !== chartId
      || currentRoute.view !== view
      || currentRoute.detail !== (detail ?? null)
    ) {
      return;
    }

    window.history.replaceState({}, "", friendHandleProfileHref(window.location.href, handle, view, detail));
  } catch {
    // Keep the legacy friend URL if the social handle cannot be resolved.
  }
}

export function updateFriendProfileUrl(
  chartId: string,
  view: FriendProfileTab = "natal",
  mode: "push" | "replace" = "push",
  detail?: string | null
) {
  try {
    const href = friendProfileHref(window.location.href, chartId, view, detail);
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", href);
    void replaceSocialFriendProfileWithReadableUrl(chartId, view, detail);
  } catch {
    // URL state is an enhancement; keep the friend profile usable if history is unavailable.
  }
}

export function friendDetailRoutePath(chartId: string, view: FriendProfileTab, detail: string) {
  const params = new URLSearchParams();
  params.set("tab", "charts");
  params.set("chart", chartId);
  params.set("view", view);
  params.set("detail", detail);

  return `friends?${params.toString()}`;
}

export function getStoredFriendsTab() {
  try {
    return parseFriendsTab(window.localStorage.getItem(friendsTabStorageKey));
  } catch {
    return "circle";
  }
}

export function initialFriendsTab(): FriendsTab {
  return isFriendsUrl() ? friendsTabFromUrl() : getStoredFriendsTab();
}

export function storeFriendsTab(tab: FriendsTab) {
  try {
    window.localStorage.setItem(friendsTabStorageKey, tab);
  } catch {
    return;
  }
}
