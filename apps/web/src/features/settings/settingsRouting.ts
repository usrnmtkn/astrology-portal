import { friendsHashParts } from "../friends/friendsRouting";

export type SettingsSubpage = "root" | "blocked-accounts";

export const settingsRouteChangeEvent = "tldr:settings-route-change";

export function settingsSubpageFromHref(href: string): SettingsSubpage {
  try {
    const url = new URL(href);
    const { path, params } = friendsHashParts(url.hash);

    return path === "settings" && params.get("view") === "blocked-accounts"
      ? "blocked-accounts"
      : "root";
  } catch {
    return "root";
  }
}

export function settingsSubpageFromUrl(): SettingsSubpage {
  if (typeof window === "undefined") {
    return "root";
  }

  return settingsSubpageFromHref(window.location.href);
}

export function settingsSubpageHref(href: string, subpage: SettingsSubpage) {
  const url = new URL(href);
  url.hash = subpage === "blocked-accounts"
    ? "settings?view=blocked-accounts"
    : "settings";

  return url.toString();
}

export function updateSettingsSubpageUrl(
  subpage: SettingsSubpage,
  mode: "push" | "replace" = "push"
) {
  try {
    const href = settingsSubpageHref(window.location.href, subpage);
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", href);
    window.dispatchEvent(new Event(settingsRouteChangeEvent));
  } catch {
    // Nested Settings routing is an enhancement; local navigation still works.
  }
}
