import type { LunarCalendarEvent } from "../services/ephemeris";
import type { CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { skyIngressContentKey, skyIngressInstanceContentKey, slugContentPart } from "../services/generatedContentKeys";

export function ingressSummaryKeys(event: LunarCalendarEvent) {
  if (event.type !== "ingress" || !event.planet || !(event.toSign || event.sign)) return [];
  const sign = event.toSign || event.sign!;
  const planet = slugContentPart(event.planet);
  const zodiac = slugContentPart(sign);
  return [`cms/sky-daily-summary/ingress/${planet}/${zodiac}`,
    skyIngressInstanceContentKey(event.planet, sign, { targetDate: event.dateKey }),
    skyIngressContentKey(event.planet, sign), `sky-ingress-${planet}-${zodiac}-${event.dateKey}`,
    `sky-ingress-${planet}-${zodiac}`, `sky-${planet}-enters-${zodiac}`];
}

export function skySummaryEventFacts(events: LunarCalendarEvent[], content: CmsGeneratedContentMap) {
  const verbs: Record<string, string> = { conjunction: "conjoins", opposition: "opposes", square: "squares", trine: "trines", sextile: "sextiles" };
  const unique = [...new Map(events.map(event => [event.id, event])).values()];
  return {
    exactAspects: unique.flatMap(event => event.type === "aspect" && event.planets && event.aspect && verbs[event.aspect.toLowerCase()]
      ? [{ id: event.id, label: `${event.planets[0]} ${verbs[event.aspect.toLowerCase()]} ${event.planets[1]}` }] : []),
    ingresses: unique.flatMap(event => {
      if (event.type !== "ingress" || !event.planet || !(event.toSign || event.sign)) return [];
      let tldr: string | undefined;
      for (const key of ingressSummaryKeys(event)) {
        const row = content.get(key);
        if (!row || row.status && row.status !== "LIVE") continue;
        const copy = key.startsWith("cms/") ? row.body : row.summary;
        if (copy?.trim()) { tldr = copy; break; }
      }
      return [{ id: event.id, label: `${event.planet} enters ${event.toSign || event.sign}`, tldr }];
    })
  };
}
