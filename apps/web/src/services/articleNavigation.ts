/** Emitted inside the portal view-transition callback for nested article state. */
export const articleHistoryChangeEvent = "tldrastro:article-history-change";

/** Keep the immediate reader parent on the browser entry, including across reloads. */
export function pushArticleUrl(url: URL) {
  const parent = window.location.href;
  if (url.href === parent) return;
  window.history.pushState({ articleParent: parent, articleUrl: url.href }, "", url.href);
}

/** A reopened forecast link can restore its day sheet without browser-entry state. */
export function forecastDialogReturnUrl(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    const params = url.pathname === "/friends" ? url.searchParams
      : url.pathname === "/" && /^#\/?friends(?:\?|$)/.test(url.hash) ? new URLSearchParams(url.hash.split("?")[1]) : null;
    return url.origin === window.location.origin && params && (params.get("tab") ?? "feed") === "feed"
      && !params.has("chart") && url.searchParams.get("flowPair") && /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("flowDate") ?? "") ? url : null;
  } catch {
    return null;
  }
}

export function returnToArticleParent() {
  const state = window.history.state;
  if (state?.articleUrl === window.location.href && typeof state.articleParent === "string") {
    const parent = new URL(state.articleParent, window.location.href);
    if (parent.origin === window.location.origin) {
      window.history.back();
      return true;
    }
  }
  const fallback = new URL(window.location.href).searchParams.get("flowReturn");
  const parent = fallback ? forecastDialogReturnUrl(fallback) : null;
  if (!parent) return false;
  window.history.replaceState({}, "", parent.href);
  window.dispatchEvent(new PopStateEvent("popstate"));
  return true;
}
