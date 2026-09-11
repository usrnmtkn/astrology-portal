import { validSummaryGeometry } from "./skySummaryGeometry";
import { selectedMoonKind, moonEventNames, moonSummaryKey, moonSummaryBody } from "./skyMoonSummary";
import defaultAssembly from "./skyDailySummaryAssembly.json" with { type: "json" };
import clauses from "./skyDailySummaryClauses.json" with { type: "json" };
import defaultTiming from "./skyDailySummaryTiming.json" with { type: "json" };
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
export type SummaryPart = { text: string; paragraphStart?: boolean; emphasis?: boolean; highlight?: boolean; action?: "lunation" | "sun" | "moon" | "retrograde" | "event"; eventId?: string; planet?: string; sourceKey?: string };
export type SummaryPlacement = { sign: string; degree?: number };
export type SkyDailySummaryFacts = {
  sun?: SummaryPlacement;
  moon?: SummaryPlacement;
  moonIsVoid: boolean;
  asOf?: string;
  retrogradePlanets?: string[];
  retrogradePlacements?: Array<SummaryPlacement & { planet: string }>;
  exactAspects?: Array<{ id: string; label: string }>;
  stations?: Array<{ id: string; label: string; direction: "direct" | "retrograde"; planet?: string; startsAt?: string }>;
  ingresses?: Array<{ id: string; label: string; tldr?: string }>;
  voidRemainingLabel?: string;
  event?: { placementsPending?: boolean; sun?: SummaryPlacement; name: string; degree?: number; sign: string; countdown: string; isToday?: boolean; eclipseType?: "solar" | "lunar" };
};

function fullerClause(body: "sun" | "moon", sign?: string, content?: CmsGeneratedContentMap, editorialPreview = false) {
  return sign ? savedCopy(content, `cms/sky-daily-summary/${body}/${sign.toLowerCase()}`, (clauses.sun as Record<string, string>)[sign.toLowerCase()] ?? "", editorialPreview) : "";
}

// Templates contain text and named slots only. Slot values remain structured parts,
// so edited wording cannot change a calculated fact, article target, or introduce HTML.
export function fillSkyTemplate(template: string, slots: Record<string, SummaryPart[]>): SummaryPart[] {
  return template.split(/(\{[^{}]+\})/gu).flatMap(text => text.startsWith("{")
    ? (slots[text.slice(1, -1)] ?? []).map(part => ({ ...part })) : text ? [{ text }] : []);
}
function listParts(items: SummaryPart[]): SummaryPart[] {
  return items.flatMap((item, index) => index ? [{ text: index === items.length - 1 ? items.length === 2 ? " and " : ", and " : ", " }, item] : [item]);
}
const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const plain = (text: string): SummaryPart[] => [{ text }];
const degreeText = (degree?: number) => typeof degree === "number" && Number.isFinite(degree) && degree >= 0 && degree < 30 ? ` at ${Math.floor(degree)}°` : "";

export function skySummaryOpeningKey(sun?: string, moon?: string, content?: CmsGeneratedContentMap): "opening" | "openingSameSign" {
  // An existing customized general template retains its behavior unless the owner
  // has explicitly supplied the more specific same-sign template.
  const custom = content?.get("cms/sky-daily-summary/assembly/opening")?.body;
  const specific = content?.get("cms/sky-daily-summary/assembly/openingSameSign");
  return sun && moon && sun.toLowerCase() === moon.toLowerCase()
    && (!custom || currentSkySummaryWording("cms/sky-daily-summary/assembly/opening", custom) === defaultAssembly.opening || specific)
    ? "openingSameSign" : "opening";
}

export function skyDailySummaryParts(facts: SkyDailySummaryFacts, content?: CmsGeneratedContentMap, { editorialPreview = false } = {}): SummaryPart[] {
  const copy = (key: string, fallback: string) => savedCopy(content, `cms/sky-daily-summary/${key}`, fallback, editorialPreview);
  const timing = { ...defaultTiming };
  for (const field of skyDailySummaryFields.filter(field => field.group === "Timing and retrogrades")) {
    timing[field.key.split("/").at(-1) as Exclude<keyof typeof timing, "provenance">] = copy(field.key.replace("cms/sky-daily-summary/", ""), field.body);
  }
  const assembly = Object.fromEntries(Object.entries(defaultAssembly).map(([key, value]) => [key, copy(`assembly/${key}`, value)])) as typeof defaultAssembly;
  const values: Record<string, SummaryPart[]> = {};
  const moonKind = selectedMoonKind(facts.event);
  const specialMoon = moonKind !== "regular";
  const sunPlacement = specialMoon ? facts.event?.sun ?? facts.sun : facts.sun;
  if (specialMoon && facts.event?.sun && !validSummaryGeometry(facts.event.sun.sign, facts.event.sign, moonKind)) {
    throw new Error("IMPOSSIBLE_SKY: event-time Sun and Moon do not match the selected lunation.");
  }
  const moonPlacement = specialMoon ? { sign: facts.event!.sign, degree: facts.event!.degree } : facts.moon;
  for (const body of ["sun", "moon"] as const) {
    const placement = body === "moon" ? moonPlacement : sunPlacement;
    if (!placement?.sign) continue;
    const sourceKey = body === "moon" ? moonSummaryKey(placement.sign, moonKind) : `cms/sky-daily-summary/sun/${placement.sign.toLowerCase()}`;
    const clause = body === "moon" ? savedCopy(content, sourceKey, moonSummaryBody(placement.sign, moonKind), editorialPreview) : fullerClause(body, placement.sign, content, editorialPreview);
    values[`${body}Name`] = plain(body === "sun" ? "Sun" : moonEventNames[moonKind]);
    values[`${body}Sign`] = plain(placement.sign);
    values[`${body}Degree`] = plain(degreeText(placement.degree));
    values[`${body}Summary`] = clause ? [{ text: clause, sourceKey }] : [];
  }
  const hasSun = Boolean(values.sunName), hasMoon = Boolean(values.moonName);
  const openingKey = skySummaryOpeningKey(sunPlacement?.sign, moonPlacement?.sign, content);
  let opening = hasSun && hasMoon ? assembly[openingKey] : hasSun ? assembly.sunOnly : assembly.moonOnly;
  // Preserve the existing factual fallback when a summary is unavailable.
  if (!values.sunSummary?.length) opening = opening.replace("{sunName} in {sunSign}", "{sunName} is in {sunSign}");
  if (!values.moonSummary?.length) opening = opening.replace("{moonName} in {moonSign}", specialMoon ? "{moonName} is in {moonSign}" : "{moonName} moves through {moonSign}");
  // The editor separates facts; readers still get one complete placement link.
  for (const body of ["sun", "moon"] as const) {
    opening = opening.replace(new RegExp(`\\{${body}Name\\}[^{}]*(?:\\{${body}Sign\\}[^{}]*)?\\{${body}Degree\\}`), placement => {
      values[`${body}PlacementLink`] = [{ text: fillSkyTemplate(placement, values).map(part => part.text).join(""), action: body === "moon" && specialMoon ? "lunation" : body, emphasis: true }];
      return `{${body}PlacementLink}`;
    });
  }
  values.openingSentence = hasSun || hasMoon ? fillSkyTemplate(opening, values) : [];
  const planets = [...new Set((facts.retrogradePlacements?.map(p => p.planet) ?? facts.retrogradePlanets ?? []).map(name => name.trim()).filter(Boolean))];
  if (planets.length) {
    const intro = planets.length === 1 ? timing.singleRetrograde : timing.retrograde.replace("{count}", words[planets.length] ?? String(planets.length));
    const highlighted = intro.match(/^.*?\bretrograde\b/iu)?.[0];
    values.retrogradeIntro = highlighted ? [{ text: highlighted, highlight: true }, { text: intro.slice(highlighted.length).trimEnd() }] : plain(intro.trimEnd());
    values.retrogradeList = listParts(planets.map(planet => {
      const p = facts.retrogradePlacements?.find(p => p.planet === planet);
      return { text: `${planet} Rx${p ? ` in ${p.sign}${degreeText(p.degree)}` : ""}`, planet, action: "retrograde", emphasis: true };
    }));
    values.retrogradeCount = plain((words[planets.length] ?? String(planets.length)).toLowerCase());
    values.currentRetrogradesSentence = intro ? fillSkyTemplate(assembly.retrogrades, values) : [];
  }
  if (facts.moon && facts.moonIsVoid) {
    const remaining = facts.voidRemainingLabel?.replace(/(\d+)\s*(?:min|m)\b/giu, (_, n) => `${n} ${n === "1" ? "minute" : "minutes"}`)
      .replace(/(\d+)\s*(?:hrs?|h)\b/giu, (_, n) => `${n} ${n === "1" ? "hour" : "hours"}`);
    values.voidSentence = [{ text: remaining ? timing.voidRemaining.replace("{remaining}", remaining) : timing.voidWithoutTiming, highlight: true }];
  }
  // Resolve transitions in the order chosen in the full layout. Hidden or empty
  // categories never cause a later sentence to begin with "also".
  let previousEvent = false;
  for (const match of assembly.layout.matchAll(/\{(exactAspectsSentence|stationsSentence|ingressesSentence|lunationSentence)\}/gu)) {
    const slot = match[1];
    if (slot === "lunationSentence") {
      if (!facts.event || specialMoon) continue;
      const event = facts.event;
      const name = event.eclipseType === "solar" ? "Solar Eclipse" : event.eclipseType === "lunar" ? "Lunar Eclipse" : event.name;
      const link: SummaryPart[] = [{ text: `${name} in ${event.sign}`, action: "lunation", emphasis: true }];
      values[slot] = event.isToday ? fillSkyTemplate(previousEvent ? assembly.lunationAlsoToday : assembly.lunationToday, { lunationLink: link })
        : fillSkyTemplate(timing.lunation.replace("{name} in {sign}", "{lunationLink}"), { lunationLink: link, countdown: plain(event.countdown) });
      if (event.isToday && values[slot].some(p => p.text)) previousEvent = true;
      continue;
    }
    const items = slot === "exactAspectsSentence" ? facts.exactAspects : slot === "stationsSentence" ? facts.stations : facts.ingresses;
    if (!items?.length) continue;
    const many = items.length > 1;
    const position = previousEvent ? "Also" : "First";
    let key: keyof typeof assembly;
    let listSlot: string;
    if (slot === "exactAspectsSentence") { key = `aspects${position}${items.length === 2 ? "Two" : many ? "Many" : "One"}`; listSlot = "aspectList"; }
    else if (slot === "ingressesSentence") { key = `ingresses${position}${many ? "Many" : "One"}`; listSlot = "ingressList"; }
    else {
      key = many ? `stations${position}Many` : `station${facts.stations![0].direction === "retrograde" ? "Retrograde" : "Direct"}${position}`;
      listSlot = "stationList";
    }
    const count = words[items.length] ?? String(items.length);
    values[slot] = fillSkyTemplate(assembly[key], {
      Count: plain(count), count: plain(count.toLowerCase()),
      [listSlot]: listParts(items.map(item => ({ text: item.label, action: "event", eventId: item.id, emphasis: true })))
    });
    // A station changes the current Rx count only after its timestamp and when
    // the same calculated snapshot contains that planet as retrograde. Avoid
    // claiming a new count for future, direct, multiple, or unmatched stations.
    const station = facts.stations?.[0];
    const stationAt = Date.parse(station?.startsAt ?? "");
    const asOf = Date.parse(facts.asOf ?? "");
    const stationIsCurrentRx = station?.planet && planets.some(planet => planet.toLowerCase() === station.planet!.toLowerCase());
    if (slot === "stationsSentence" && facts.stations?.length === 1 && station?.direction === "retrograde"
      && Number.isFinite(stationAt) && Number.isFinite(asOf) && stationAt <= asOf && stationIsCurrentRx
      && values.currentRetrogradesSentence?.length && assembly.layout.includes("{currentRetrogradesSentence}") && assembly.stationRetrogradeCount) {
      values[slot] = fillSkyTemplate(assembly.stationRetrogradeCount, {
        stationList: [{ text: station.label, action: "event", eventId: station.id, emphasis: true }],
        count: values.retrogradeCount, retrogradeList: values.retrogradeList
      });
      values.currentRetrogradesSentence = [];
    }
    if (slot === "ingressesSentence" && values[slot].length) {
      for (const item of facts.ingresses ?? []) if (item.tldr) values[slot].push({ text: ` ${item.tldr}` });
    }
    if (values[slot].some(p => p.text)) previousEvent = true;
  }
  // Blank lines in the editable template are actual paragraph boundaries.
  return assembly.layout.split(/\n\s*\n/gu).flatMap(paragraph => {
    const parts = fillSkyTemplate(paragraph, values);
    // Normalize assembly whitespace only. Authored summaries stay byte-for-byte.
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].sourceKey || parts[i].action) continue;
      parts[i].text = parts[i].text.replace(/\s+/gu, " ");
      if (/^\s*[,.]/u.test(parts[i].text)) {
        parts[i].text = parts[i].text.trimStart();
        for (let j = i - 1; j >= 0 && !parts[j].sourceKey && !parts[j].action; j--) {
          parts[j].text = parts[j].text.trimEnd();
          if (parts[j].text) break;
        }
      }
      if (i && /\s$/u.test(parts[i - 1].text)) parts[i].text = parts[i].text.trimStart();
    }
    while (parts.length && !parts[0].text.trim()) parts.shift();
    while (parts.length && !parts.at(-1)!.text.trim()) parts.pop();
    if (!parts.length) return [];
    parts[0].text = parts[0].text.trimStart();
    parts.at(-1)!.text = parts.at(-1)!.text.trimEnd();
    parts[0].paragraphStart = true;
    return parts;
  });
}

export function skySummaryParagraphs(parts: SummaryPart[]): SummaryPart[][] {
  const paragraphs: SummaryPart[][] = [];
  for (const part of parts) {
    if (!paragraphs.length || part.paragraphStart) paragraphs.push([]);
    paragraphs[paragraphs.length - 1].push(part);
  }
  return paragraphs;
}
