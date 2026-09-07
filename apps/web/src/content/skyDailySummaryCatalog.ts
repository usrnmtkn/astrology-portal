import clauses from "./skyDailySummaryClauses.json";
import timing from "./skyDailySummaryTiming.json";

export const skySummarySigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export type SkySummaryField = { key: string; label: string; group: string; body: string; allowedSlots: string[] };
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
  const field = skyDailySummaryFields.find(field => field.key === key);
  if (!field) return key.startsWith("cms/sky-daily-summary/") ? ["Unknown daily sky summary field."] : [];
  const slots = Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]);
  const errors: string[] = [];
  if (body.includes("—")) errors.push("Use sentence punctuation without em dashes.");
  if (body.includes("{{") || body.includes("}}")) errors.push("Use single-brace calculated slots, for example {name}.");
  if (slots.some(slot => !field.allowedSlots.includes(slot))) errors.push("This field contains an unsupported calculated slot.");
  for (const slot of field.allowedSlots) {
    if (slots.filter(value => value === slot).length !== 1) errors.push(`Keep exactly one {${slot}} slot.`);
  }
  return errors;
}
