import { pushArticleUrl, returnToArticleParent } from "./articleNavigation";
import { natalReadingRoute, type NatalReadingKind } from "./natalReadingPath";

export function natalReadingHref(kind: NatalReadingKind, chartId?: string) {
  return `${chartId ? `/friends/${encodeURIComponent(chartId)}` : "/you"}/natal/${kind}`;
}

export function natalReadingTriggerId(kind: NatalReadingKind, chartId?: string) {
  return `natal-${kind}-trigger-${chartId ?? "you"}`;
}

export function openNatalReadingPage(href: string) {
  const url = new URL(href, window.location.origin), route = natalReadingRoute(url.pathname);
  if (!route) return;
  window.history.replaceState({ ...window.history.state, natalReadingOpener: natalReadingTriggerId(route.kind, route.chartId ?? undefined) }, "", window.location.href);
  url.search = window.location.search;
  pushArticleUrl(url);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function closeNatalReadingPage(kind: NatalReadingKind, chartId?: string) {
  if (returnToArticleParent()) return;
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.hash = chartId ? `friends?${new URLSearchParams({ tab: "charts", chart: chartId, view: "natal" })}` : "you?tab=chart";
  window.history.replaceState({ natalReadingOpener: natalReadingTriggerId(kind, chartId) }, "", url.href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
