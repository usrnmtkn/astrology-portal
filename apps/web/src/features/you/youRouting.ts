import { friendsHashParts } from "../friends/friendsRouting";

export type YouTab = "transits" | "chart";

export function parseYouTab(value: string | null): YouTab {
  return value === "chart" ? "chart" : "transits";
}

export function youTabFromHref(href: string): YouTab {
  try {
    const url = new URL(href);
    const { path, params } = friendsHashParts(url.hash);

    return path === "you" ? parseYouTab(params.get("tab")) : "transits";
  } catch {
    return "transits";
  }
}

export function youTabFromUrl(): YouTab {
  if (typeof window === "undefined") {
    return "transits";
  }

  return youTabFromHref(window.location.href);
}

export function youTabHref(href: string, tab: YouTab) {
  const url = new URL(href);
  const { path, params } = friendsHashParts(url.hash);
  const nextParams = path === "you" ? params : new URLSearchParams();

  if (tab === "chart") {
    nextParams.set("tab", "chart");
  } else {
    nextParams.delete("tab");
  }

  const query = nextParams.toString();
  url.hash = query ? `you?${query}` : "you";

  return url.toString();
}

export function updateYouTabUrl(tab: YouTab, mode: "push" | "replace" = "push") {
  try {
    const href = youTabHref(window.location.href, tab);

    if (href === window.location.href) {
      return;
    }

    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", href);
  } catch {
    // URL state is an enhancement; local tab navigation remains available.
  }
}
