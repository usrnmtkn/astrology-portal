import clauses from "./skyDailySummaryClauses.json";
import defaultTiming from "./skyDailySummaryTiming.json";
import { currentSkySummaryWording, skyDailySummaryFields, skySummaryTemplateErrors } from "./skyDailySummaryCatalog";
import type { CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { contentPublication, publicationAllowsContent } from "./contentPublicationState";

function savedCopy(content: CmsGeneratedContentMap | undefined, key: string, fallback: string, editorialPreview = false) {
  const publication = editorialPreview ? undefined : contentPublication(key);
  if (publication?.state === "retired") return "";
  // The reader loader filters LIVE, serving, review-clear rows before normalizing this map.
  const row = content?.get(key);
  if (publication && (!row || !publicationAllowsContent(key, row.id, row.updatedAt))) return "";
  if (!row || (row.status && row.status !== "LIVE") || !row.body.trim() || skySummaryTemplateErrors(key, row.body).length) return publication ? "" : fallback;
  return currentSkySummaryWording(key, row.body.trim());
}

// Use the owner-selected fuller clauses when available; otherwise render linked facts.
export type SummaryPart = { text: string; emphasis?: boolean; highlight?: boolean; action?: "lunation" | "sun" | "moon" | "retrograde" | "event"; eventId?: string; planet?: string; sourceKey?: string };
export type SummaryPlacement = { sign: string; degree?: number };
export type SkyDailySummaryFacts = {
  sun?: SummaryPlacement;
  moon?: SummaryPlacement;
  moonIsVoid: boolean;
  retrogradePlanets?: string[];
  retrogradePlacements?: Array<SummaryPlacement & { planet: string }>;
  exactAspects?: Array<{ id: string; label: string }>;
  ingresses?: Array<{ id: string; label: string; tldr?: string }>;
  voidRemainingLabel?: string;
  event?: { name: string; sign: string; countdown: string; eclipseType?: "solar" | "lunar" };
};

function fullerClause(body: "sun" | "moon", sign?: string, content?: CmsGeneratedContentMap, editorialPreview = false) {
  return sign ? savedCopy(content, `cms/sky-daily-summary/${body}/${sign.toLowerCase()}`, (clauses[body] as Record<string, string>)[sign.toLowerCase()] ?? "", editorialPreview) : "";
}

function placementParts(body: "sun" | "moon", placement?: SummaryPlacement, continuation = false, content?: CmsGeneratedContentMap, editorialPreview = false): SummaryPart[] {
  if (!placement?.sign) return [];
  const degree = placement.degree;
  const degreeLabel = typeof degree === "number" && Number.isFinite(degree) && degree >= 0 && degree < 30
    ? ` at ${Math.floor(degree)}°`
    : "";
  const clause = fullerClause(body, placement.sign, content, editorialPreview);
  return [
    { text: continuation ? "while the " : "The " },
    { text: `${body === "sun" ? "Sun" : "Moon"}${clause ? " in " : body === "sun" ? " is in " : " moves through "}${placement.sign}${degreeLabel}`, emphasis: true, action: body },
    { text: clause ? ` ${clause}.` : ".", sourceKey: clause ? `cms/sky-daily-summary/${body}/${placement.sign.toLowerCase()}` : undefined }
  ];
}

export function skyDailySummaryParts(facts: SkyDailySummaryFacts, content?: CmsGeneratedContentMap, { editorialPreview = false } = {}): SummaryPart[] {
  const timing = { ...defaultTiming };
  for (const field of skyDailySummaryFields.filter(field => field.group === "Timing and retrogrades")) {
    const key = field.key.split("/").at(-1) as Exclude<keyof typeof timing, "provenance">;
    timing[key] = savedCopy(content, field.key, field.body, editorialPreview);
  }
  const parts = placementParts("sun", facts.sun, false, content, editorialPreview);
  const joined = Boolean(facts.sun?.sign && facts.moon?.sign);
  const moon = placementParts("moon", facts.moon, joined, content, editorialPreview);
  if (parts.length && moon.length) {
    if (joined) parts[parts.length - 1].text = parts[parts.length - 1].text.replace(/\.$/u, ",");
    parts.push({ text: " " });
  }
  parts.push(...moon);
  const planets = [...new Set((facts.retrogradePlacements?.map(p => p.planet) ?? facts.retrogradePlanets ?? []).map(name => name.trim()).filter(Boolean))];
  if (planets.length && (planets.length === 1 ? timing.singleRetrograde : timing.retrograde)) {
    if (parts.length) parts.push({ text: " " });
    const count = planets.length;
    const countWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
    parts.push({ text: count === 0 ? timing.noRetrogrades : count === 1 ? timing.singleRetrograde
      : timing.retrograde.replace("{count}", countWords[count] ?? String(count)) });
    const retrogradeIntro = parts.pop()!;
    const highlightedIntro = retrogradeIntro.text.match(/^.*?\bretrograde\b/iu)?.[0];
    if (highlightedIntro) {
      parts.push({ text: highlightedIntro, highlight: true }, { text: retrogradeIntro.text.slice(highlightedIntro.length) });
    } else {
      parts.push(retrogradeIntro);
    }
    if (count) {
      parts[parts.length - 1].text = parts[parts.length - 1].text.trimEnd() + " ";
      planets.forEach((planet, index) => {
        if (index) parts.push({ text: index === count - 1 ? count === 2 ? " and " : ", and " : ", " });
        const placement = facts.retrogradePlacements?.find(p => p.planet === planet);
        const degree = placement?.degree;
        parts.push({ text: `${planet} Rx${placement ? ` in ${placement.sign}${typeof degree === "number" && Number.isFinite(degree) && degree >= 0 && degree < 30 ? ` at ${Math.floor(degree)}°` : ""}` : ""}`, planet, action: "retrograde", emphasis: true });
      });
      parts.push({ text: "." });
    }
  }
  if (facts.moon && facts.moonIsVoid && (facts.voidRemainingLabel ? timing.voidRemaining : timing.voidWithoutTiming)) {
    if (parts.length) parts.push({ text: " " });
    const remaining = facts.voidRemainingLabel?.replace(/(\d+)\s*(?:min|m)\b/giu, (_, count) => `${count} ${count === "1" ? "minute" : "minutes"}`)
      .replace(/(\d+)\s*(?:hrs?|h)\b/giu, (_, count) => `${count} ${count === "1" ? "hour" : "hours"}`);
    parts.push({ text: remaining ? timing.voidRemaining.replace("{remaining}", remaining) : timing.voidWithoutTiming, highlight: true });
  }
  if (facts.exactAspects?.length) {
    if (parts.length) parts.push({ text: " " });
    facts.exactAspects.forEach((aspect, index, all) => {
      if (index) parts.push({ text: index === all.length - 1 ? all.length === 2 ? " and " : ", and " : ", " });
      parts.push({ text: aspect.label, action: "event", eventId: aspect.id, emphasis: true });
    });
    parts.push({ text: facts.exactAspects.length === 1 ? " is exact today." : " are exact today." });
  }
  for (const ingress of facts.ingresses ?? []) {
    if (parts.length) parts.push({ text: " " });
    parts.push({ text: ingress.label, action: "event", eventId: ingress.id, emphasis: true }, { text: " today." });
    if (ingress.tldr) parts.push({ text: ` ${ingress.tldr}` });
  }
  if (facts.event && timing.lunation) {
    const event = {
      ...facts.event,
      name: facts.event.eclipseType === "solar" ? "Solar Eclipse"
        : facts.event.eclipseType === "lunar" ? "Lunar Eclipse" : facts.event.name
    };
    if (parts.length) parts.push({ text: " " });
    const template = timing.lunation.includes("{name} in {sign}") ? timing.lunation : defaultTiming.lunation;
    const [prefix, suffix] = template.split("{name} in {sign}");
    parts.push({ text: prefix.replace("{countdown}", event.countdown) }, { text: `${event.name} in ${event.sign}`, emphasis: true, action: "lunation" }, { text: suffix.replace("{countdown}", event.countdown) });
  }
  return parts;
}
