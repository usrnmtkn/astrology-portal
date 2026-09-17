import type { SkySummaryField } from "./skyDailySummaryCatalog";

export const SKY_DEBILITY_KEY_PREFIX = "cms/sky-debility/";

export const skyDebilityDefaults = {
  titleLead: "Without",
  titleSoft: "their tools",
  countLabel: "{count} of {total}",
  countUnit: "{planetWord}",
  none: "None of the {total} planets are in detriment or fall.",
  one: "{count} of {total} planets is in detriment or fall. It does not have access to its usual tools.",
  many: "{count} of {total} planets are in detriment or fall. They do not have access to their usual tools."
} as const;

const fieldMeta: Record<keyof typeof skyDebilityDefaults, { label: string; allowedSlots: string[] }> = {
  titleLead: { label: "Title first word", allowedSlots: [] },
  titleSoft: { label: "Title remainder", allowedSlots: [] },
  countLabel: { label: "Count line", allowedSlots: ["count", "total"] },
  countUnit: { label: "Count unit", allowedSlots: ["planetWord"] },
  none: { label: "No debilitated planets", allowedSlots: ["total"] },
  one: { label: "One debilitated planet", allowedSlots: ["count", "total"] },
  many: { label: "Several debilitated planets", allowedSlots: ["count", "total"] }
};

export const skyDebilityFields: SkySummaryField[] = (Object.keys(skyDebilityDefaults) as Array<keyof typeof skyDebilityDefaults>).map(name => ({
  key: `${SKY_DEBILITY_KEY_PREFIX}${name}`,
  label: fieldMeta[name].label,
  group: "Without their tools",
  body: skyDebilityDefaults[name],
  allowedSlots: fieldMeta[name].allowedSlots
}));

export function isSkyDebilityKey(key: string) {
  return key.startsWith(SKY_DEBILITY_KEY_PREFIX);
}

export function skyDebilityField(key: string) {
  return skyDebilityFields.find(field => field.key === key);
}

export function skyDebilityTemplateErrors(key: string, body: string): string[] {
  if (!isSkyDebilityKey(key)) return [];
  const field = skyDebilityField(key);
  if (!field) return ["Unknown Without their tools field."];
  const slots = Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]);
  const errors: string[] = [];
  if (/[{}]/u.test(body.replace(/\{[^{}]+\}/gu, ""))) errors.push("Close every slot with matching single braces.");
  if (body.includes("—")) errors.push("Use sentence punctuation without em dashes.");
  if (body.includes("{{") || body.includes("}}")) errors.push("Use single-brace calculated slots, for example {count}.");
  if (slots.some(slot => !field.allowedSlots.includes(slot))) errors.push("This field contains an unsupported calculated slot.");
  for (const slot of field.allowedSlots) {
    if (slots.filter(value => value === slot).length !== 1) errors.push(`Keep exactly one {${slot}} slot.`);
  }
  if (!body.trim()) errors.push("Keep wording in this field.");
  return errors;
}
