import { useEffect, useReducer } from "react";
import type { ReaderUnavailableKind } from "../components/ReaderUnavailable";

function validDay(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Invalid addresses are recovery states, never an indefinite reading loader. */
export function readerRouteIssue(url: URL, bodies: readonly string[], signs: readonly string[]): ReaderUnavailableKind | null {
  const [route, query] = url.hash.replace(/^#/u, "").split("?");
  const [area, kind, planet, sign] = route.split("/");
  const params = new URLSearchParams(query);
  const matches = (value: string, candidates: readonly string[]) => candidates.some(candidate => candidate.toLowerCase().replaceAll(" ", "-") === value);
  if (area === "sky" && ["placement", "retrograde"].includes(kind) && (!matches(planet, bodies) || !matches(sign, signs))) return "placement";
  if (area === "horoscopes" && (params.has("sign") && !matches(params.get("sign")!, signs)
    || params.has("period") && !["daily", "weekly", "monthly", "seasonal"].includes(params.get("period")!)
    || params.has("at") && !Number.isFinite(Date.parse(params.get("at")!)))) return "horoscope";
  if (area === "calendar") {
    const date = params.get("date") ?? url.searchParams.get("date");
    if (date !== null && !validDay(date)) return "date";
  }
  if (area && !["sky", "you", "profile", "friends", "horoscopes", "calendar", "articles", "account", "settings", "learn"].includes(area)
    && !/^(?:access_token|error|type)=/u.test(route)) return "page";
  return null;
}

export function useReaderRouteIssue(bodies: readonly string[], signs: readonly string[]) {
  const [, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    window.addEventListener("hashchange", refresh); window.addEventListener("popstate", refresh);
    return () => { window.removeEventListener("hashchange", refresh); window.removeEventListener("popstate", refresh); };
  }, []);
  return readerRouteIssue(new URL(window.location.href), bodies, signs);
}
