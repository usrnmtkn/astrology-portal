import { moonEventNames, moonSummaryKey, moonSummaryBody, type MoonSummaryKind } from "./skyMoonSummary.js";
import legacyAssembly from "./skyDailySummaryLegacyAssembly.json" with { type: "json" };
import assembly from "./skyDailySummaryAssembly.json" with { type: "json" };
import clauses from "./skyDailySummaryClauses.json" with { type: "json" };
import timing from "./skyDailySummaryTiming.json" with { type: "json" };

export const skySummarySigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export type SkySummaryField = { key: string; label: string; group: string; body: string; allowedSlots: string[]; readerEnabled?: boolean; optionalSlots?: boolean };
// Exact owner-approved replacements only. Other editorial wording remains untouched.
export function currentSkySummaryWording(key: string, body: string): string {
  const part = key.replace("cms/sky-daily-summary/", "");
  if (["assembly/opening", "assembly/sunOnly", "assembly/moonOnly"].includes(part)) {
    body = body.replaceAll("{sunPlacementLink}", "{sunName} in {sunSign}{sunDegree}").replaceAll("{moonPlacementLink}", "{moonName} in {moonSign}{moonDegree}");
  }
  // Owner correction (2026-09-10): name the Moon's sign even when it matches
  // the Sun. Upgrade only the former built-in template saved by older editors.
  if (part === "assembly/openingSameSign" && body.trim() === "The {sunName} in {sunSign}{sunDegree} {sunSummary}, while the {moonName} there{moonDegree} {moonSummary}.") return assembly.openingSameSign;
  if (part === "assembly/sunIngressBefore" && body.trim() === "The Sun is in {fromSign} until {transitionTime} today, when it enters {toSign}.") return assembly.sunIngressBefore;
  if (part === "assembly/sunIngressAfter" && body.trim() === "The Sun entered {toSign} at {transitionTime} today, ending {fromSign} season.") return assembly.sunIngressAfter;
  const assemblyName = part.replace(/^assembly\//u, "") as keyof typeof legacyAssembly;
  if (part === "assembly/layout" && [
    "{openingSentence} {voidSentence}\n\n{ingressesSentence} {stationsSentence}\n\n{exactAspectsSentence}\n\n{currentRetrogradesSentence}\n\n{lunationSentence}",
    "{openingSentence} {voidSentence}\n\n{seasonTransitionSentence}\n\n{ingressesSentence} {stationsSentence}\n\n{exactAspectsSentence}\n\n{currentRetrogradesSentence}\n\n{lunationSentence}"
  ].includes(body.trim())) {
    return assembly.layout;
  }
  if (part.startsWith("assembly/") && body.trim() === legacyAssembly[assemblyName]) return assembly[assemblyName];
  const previous = clauses.provenance.previousClauses[part as keyof typeof clauses.provenance.previousClauses];
  if (previous && body.trim() === previous) {
    return part === "sun/virgo" ? clauses.sun.virgo : clauses.moon.cancer;
  }
  if (part === "lunation" && body.trim() === "The next {name} arrives in {sign} {countdown}.") return timing.lunation;
  return body;
}
export const skyIngressBodies = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "North Node", "South Node", "Lilith"];
export const skyIngressSummaryFields: SkySummaryField[] = skyIngressBodies.flatMap(planet => skySummarySigns.map(sign => ({
  key: `cms/sky-daily-summary/ingress/${planet.toLowerCase().replace(/ /gu, "-")}/${sign.toLowerCase()}`,
  label: `${planet} enters ${sign}`, group: "Ingress TLDRs", body: "", allowedSlots: []
})));
const timingLabels: Record<string, string> = {
  retrograde: "Multiple retrograde planets", singleRetrograde: "One retrograde planet", noRetrogrades: "No retrograde planets",
  voidRemaining: "Void of course with remaining time", voidWithoutTiming: "Void of course without remaining time",
  lunation: "Next New Moon, Full Moon, or eclipse",
  seasonTransition: "Zodiac season change",
  fullMoonMeaning: "Full Moon explanation"
};
export const skyAssemblyFields: SkySummaryField[] = Object.entries(assembly).map(([name, body]) => ({
  key: `cms/sky-daily-summary/assembly/${name}`,
  label: name === "layout" ? "Full summary template" : name.replace(/([A-Z])/gu, " $1").replace(/^./u, c => c.toUpperCase()),
  group: "Assembly templates", body,
  allowedSlots: [...new Set(Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]))],
  optionalSlots: name === "layout"
}));
export const skyMoonSummaryFields: SkySummaryField[] = skySummarySigns.flatMap(sign => (Object.keys(moonEventNames) as MoonSummaryKind[]).map(kind => ({
  key: moonSummaryKey(sign, kind), label: `${moonEventNames[kind]} in ${sign}`, group: "Moon summaries", body: moonSummaryBody(sign, kind), allowedSlots: []
})));
export const skyDailySummaryFields: SkySummaryField[] = [
  ...skyMoonSummaryFields,
  ...skyAssemblyFields,
  ...(["sun"] as const).flatMap(body => skySummarySigns.map(sign => ({
    key: `cms/sky-daily-summary/${body}/${sign.toLowerCase()}`,
    label: `${body === "sun" ? "Sun" : "Moon"} in ${sign}`,
    group: "Sun summaries",
    body: (clauses[body] as Record<string, string>)[sign.toLowerCase()] ?? "",
    allowedSlots: []
  }))),
  ...Object.entries(timingLabels).map(([key, label]) => ({
    key: `cms/sky-daily-summary/${key}`, label, group: "Timing and retrogrades",
    body: timing[key as keyof typeof timing] as string,
    readerEnabled: !["noRetrogrades", "fullMoonMeaning"].includes(key),
    allowedSlots: key === "retrograde" ? ["count"] : key === "voidRemaining" ? ["remaining"] : key === "lunation" ? ["name", "sign", "countdown"] : key === "seasonTransition" ? ["seasonName", "countdown", "nextSunSign", "seasonEndDate"] : []
  }))
];

// These slots are required because the summary preserves calculated facts and linked event names.
export function skySummaryTemplateErrors(key: string, body: string): string[] {
  body = currentSkySummaryWording(key, body);
  const field = [...skyDailySummaryFields, ...skyIngressSummaryFields].find(field => field.key === key);
  if (!field) return key.startsWith("cms/sky-daily-summary/") ? ["Unknown daily sky summary field."] : [];
  const slots = Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]);
  const errors: string[] = [];
  for (const planet of ["sun", "moon"]) {
    const placementPattern = new RegExp(`\\{${planet}Name\\}[^{}]*\\{${planet}Sign\\}[^{}]*\\{${planet}Degree\\}`);
    if (slots.includes(`${planet}Name`) && !placementPattern.test(body)) errors.push("Keep each planet, sign, and degree together in that order so the complete placement links to its article.");
  }
  if (/[{}]/u.test(body.replace(/\{[^{}]+\}/gu, ""))) errors.push("Close every slot with matching single braces.");
  if (key.includes("/assembly/") && /\b(?:also today|there (?:is|are)(?: also)?|today brings)\b/iu.test(body)) errors.push("Use direct event sentences without Also today, There are, or Today brings.");
  if (body.includes("—")) errors.push("Use sentence punctuation without em dashes.");
  if (body.includes("{{") || body.includes("}}")) errors.push("Use single-brace calculated slots, for example {name}.");
  if (slots.some(slot => !field.allowedSlots.includes(slot))) errors.push("This field contains an unsupported calculated slot.");
  if (key === "cms/sky-daily-summary/lunation" && !body.includes("{name} in {sign}")) errors.push("Keep {name} in {sign} together so the complete event name links to its article.");
  for (const slot of field.allowedSlots) {
    if (field.optionalSlots ? slots.filter(value => value === slot).length > 1 : slots.filter(value => value === slot).length !== 1) errors.push(`Keep exactly one {${slot}} slot.`);
  }
  if (field.optionalSlots && !slots.includes("openingSentence")) errors.push("Keep {openingSentence} in the full template.");
  return errors;
}
