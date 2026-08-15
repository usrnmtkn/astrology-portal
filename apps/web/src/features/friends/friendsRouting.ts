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
const friendsTabStorageKey = "tldrastro:friendsTab";

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

    if (!routeParams) {
      return null;
    }

    return {
      tab: parseFriendsTab(routeParams.get("tab")),
      chartId: routeParams.get("chart"),
      view: parseFriendProfileTab(routeParams.get("view")),
      detail: routeParams.get("detail")
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

    if (friendsTabs.includes(searchTab as FriendsTab)) {
      return parseFriendsTab(searchTab);
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

    return url.pathname === "/friends" || path === "friends";
  } catch {
    return false;
  }
}

export function isFriendsUrl() {
  return isFriendsHref(window.location.href);
}

export function friendsTabHref(href: string, tab: FriendsTab) {
  const url = new URL(href);

  if (url.pathname === "/friends") {
    url.searchParams.set("tab", tab);
    url.searchParams.delete("chart");
    url.searchParams.delete("view");
    url.searchParams.delete("detail");
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

export function friendProfileHref(
  href: string,
  chartId: string,
  view: FriendProfileTab = "natal",
  detail?: string | null
) {
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

export function updateFriendProfileUrl(
  chartId: string,
  view: FriendProfileTab = "natal",
  mode: "push" | "replace" = "push",
  detail?: string | null
) {
  try {
    const href = friendProfileHref(window.location.href, chartId, view, detail);
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", href);
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
