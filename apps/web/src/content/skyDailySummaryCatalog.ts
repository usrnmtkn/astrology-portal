import clauses from "./skyDailySummaryClauses.json" with { type: "json" };
import timing from "./skyDailySummaryTiming.json" with { type: "json" };

export const skySummarySigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export type SkySummaryField = { key: string; label: string; group: string; body: string; allowedSlots: string[] };
// Exact owner-approved replacements only. Other editorial wording remains untouched.
export function currentSkySummaryWording(key: string, body: string): string {
  const part = key.replace("cms/sky-daily-summary/", "");
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
  lunation: "Next New Moon, Full Moon, or eclipse", fullMoonMeaning: "Full Moon explanation"
};
export const skyDailySummaryFields: SkySummaryField[] = [
  ...(["sun", "moon"] as const).flatMap(body => skySummarySigns.map(sign => ({
    key: `cms/sky-daily-summary/${body}/${sign.toLowerCase()}`,
    label: `${body === "sun" ? "Sun" : "Moon"} in ${sign}`,
    group: body === "sun" ? "Sun summaries" : "Moon summaries",
    body: (clauses[body] as Record<string, string>)[sign.toLowerCase()] ?? "",
    allowedSlots: []
  }))),
  ...Object.entries(timingLabels).map(([key, label]) => ({
    key: `cms/sky-daily-summary/${key}`, label, group: "Timing and retrogrades",
    body: timing[key as keyof typeof timing] as string,
    allowedSlots: key === "retrograde" ? ["count"] : key === "voidRemaining" ? ["remaining"] : key === "lunation" ? ["name", "sign", "countdown"] : []
  }))
];

// These slots are required because the summary preserves calculated facts and linked event names.
export function skySummaryTemplateErrors(key: string, body: string): string[] {
  body = currentSkySummaryWording(key, body);
  const field = [...skyDailySummaryFields, ...skyIngressSummaryFields].find(field => field.key === key);
  if (!field) return key.startsWith("cms/sky-daily-summary/") ? ["Unknown daily sky summary field."] : [];
  const slots = Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]);
  const errors: string[] = [];
  if (body.includes("—")) errors.push("Use sentence punctuation without em dashes.");
  if (body.includes("{{") || body.includes("}}")) errors.push("Use single-brace calculated slots, for example {name}.");
  if (slots.some(slot => !field.allowedSlots.includes(slot))) errors.push("This field contains an unsupported calculated slot.");
  if (key === "cms/sky-daily-summary/lunation" && !body.includes("{name} in {sign}")) errors.push("Keep {name} in {sign} together so the complete event name links to its article.");
  for (const slot of field.allowedSlots) {
    if (slots.filter(value => value === slot).length !== 1) errors.push(`Keep exactly one {${slot}} slot.`);
  }
  return errors;
}
