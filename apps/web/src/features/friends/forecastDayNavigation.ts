import { articleHistoryChangeEvent, forecastDialogReturnUrl, pushArticleUrl } from "../../services/articleNavigation";
import { friendProfileHref } from "./friendsRouting";
import { forecastTransitIdentity } from "./forecastDayLinks";
import type { ForecastContact } from "../../services/relationshipForecast";

export function forecastPersonHref(chartId: string | null, date: string, contact?: ForecastContact) {
  const url = new URL(chartId ? friendProfileHref(window.location.href, chartId, "transits",
    contact ? `transit-${`${contact.planet}-${contact.aspect}-${contact.target}`.toLowerCase().replaceAll(" ", "-")}` : undefined) : window.location.origin);
  url.searchParams.delete("flowPair");
  url.searchParams.delete("flowDate");
  const parent = forecastDialogReturnUrl(window.location.href);
  if (parent) url.searchParams.set("flowReturn", `${parent.pathname}${parent.search}${parent.hash}`);
  else url.searchParams.delete("flowReturn");
  url.searchParams.set("date", date);
  if (!chartId) {
    url.hash = "you";
    if (contact) url.searchParams.set("personalTransit", forecastTransitIdentity(contact));
  }
  return url.href;
}

export function navigateForecast(href: string) {
  pushArticleUrl(new URL(href));
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.dispatchEvent(new Event(articleHistoryChangeEvent));
}
