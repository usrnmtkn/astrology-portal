import type { SkySummaryField } from "./skyDailySummaryCatalog";
import { TRADITIONAL_DIGNITY_PLANETS } from "../services/planetSignDignity.mjs";
import { skyDebilityPhraseKey, skyDebilityPhraseNames, skyDebilityPhraseSets } from "./skyDebilityPhrases.js";

export const SKY_DEBILITY_KEY_PREFIX = "cms/sky-debility/";

// Legacy keys stay readable and editable for recovery. The new card uses the
// complete openingHook and the two paragraph templates, not the legacy bodies.
export const skyDebilityDefaults = {
  titleLead: "Without",
  titleSoft: "their tools",
  countLabel: "{count} of {total}",
  countUnit: "{planetWord}",
  none: "None of the {total} planets are in detriment or fall.",
  one: "{count} of {total} planets is in detriment or fall. It does not have access to its usual tools.",
  many: "{count} of {total} planets are in detriment or fall. They do not have access to their usual tools.",
  openingHook: "Things may take more effort right now",
  experienceTemplate: "You may {livedExperienceList}. {situationList} can take more out of you than you expected.",
  contextTemplate: "{planetList} {signConditionClause} how we {planetFunctionList}. That is what “detriment or fall” describes, not a prediction that things will go badly. It may help to {responseList}.",
  signConditionOne: "is in a sign that complicates",
  signConditionMany: "are in signs that complicate",
  exampleOrder: "Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn"
} as const;
export type SkyDebilityTemplateName = keyof typeof skyDebilityDefaults;
export const skyDebilityLegacyNames: readonly SkyDebilityTemplateName[] = ["titleLead", "titleSoft", "none", "one", "many"];

const fieldMeta: Record<SkyDebilityTemplateName, { label: string; allowedSlots: string[] }> = {
  titleLead: { label: "Legacy title first word", allowedSlots: [] },
  titleSoft: { label: "Legacy title remainder", allowedSlots: [] },
  countLabel: { label: "Count line", allowedSlots: ["count", "total"] },
  countUnit: { label: "Count unit", allowedSlots: ["planetWord"] },
  none: { label: "Legacy zero-planet wording", allowedSlots: ["total"] },
  one: { label: "Legacy one-planet wording", allowedSlots: ["count", "total"] },
  many: { label: "Legacy several-planet wording", allowedSlots: ["count", "total"] },
  openingHook: { label: "Heading", allowedSlots: [] },
  experienceTemplate: { label: "Experience paragraph template", allowedSlots: ["livedExperienceList", "situationList"] },
  contextTemplate: { label: "Context and response paragraph template", allowedSlots: ["planetList", "signConditionClause", "planetFunctionList", "responseList"] },
  signConditionOne: { label: "One-planet connecting phrase", allowedSlots: [] },
  signConditionMany: { label: "Multiple-planet connecting phrase", allowedSlots: [] },
  exampleOrder: { label: "Example order (not a severity ranking)", allowedSlots: [] }
};
const phraseLabels = {
  livedExperienceClause: "Lived experience",
  situationPhrase: "Everyday situation",
  planetFunctionVerbPhrase: "Planetary function in human terms",
  responseClause: "Helpful response"
};
export const skyDebilityFields: SkySummaryField[] = [
  ...(Object.keys(skyDebilityDefaults) as SkyDebilityTemplateName[]).map(name => ({
    key: `${SKY_DEBILITY_KEY_PREFIX}${name}`, label: fieldMeta[name].label,
    group: "Things may take more effort right now", body: skyDebilityDefaults[name], allowedSlots: fieldMeta[name].allowedSlots
  })),
  ...skyDebilityPhraseSets.flatMap(row => skyDebilityPhraseNames.map(name => ({
    key: skyDebilityPhraseKey(row.planetTitle, row.signTitle, name),
    label: `${row.planetTitle} in ${row.signTitle}: ${phraseLabels[name]}`,
    group: "Things may take more effort right now", body: row[name], allowedSlots: []
  })))
];
const byKey = new Map(skyDebilityFields.map(field => [field.key, field]));
export function isSkyDebilityKey(key: string) { return key.startsWith(SKY_DEBILITY_KEY_PREFIX); }
export function skyDebilityField(key: string) { return byKey.get(key); }
export function skyDebilityExampleOrder(body: string) { return body.split(",").map(value => value.trim()); }

export function skyDebilityTemplateErrors(key: string, body: string): string[] {
  if (!isSkyDebilityKey(key)) return [];
  const field = skyDebilityField(key);
  if (!field) return ["Unknown effort-summary field."];
  const slots = Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]);
  const errors: string[] = [];
  if (/[{}]/u.test(body.replace(/\{[^{}]+\}/gu, ""))) errors.push("Close every slot with matching single braces.");
  if (body.includes("—")) errors.push("Use sentence punctuation without em dashes.");
  if (body.includes("{{") || body.includes("}}")) errors.push("Use single-brace slots, for example {count}.");
  if (slots.some(slot => !field.allowedSlots.includes(slot))) errors.push("This field contains an unsupported slot.");
  for (const slot of field.allowedSlots) {
    if (slots.filter(value => value === slot).length !== 1) errors.push(`Keep exactly one {${slot}} slot.`);
  }
  if (!body.trim()) errors.push("Keep wording in this field.");
  if (key.includes("/placement/") || /\/signCondition(One|Many)$/u.test(key)) {
    if (/[.!?;:,]$/u.test(body.trim())) errors.push("Leave final punctuation to the paragraph template.");
    if (/[\r\n]/u.test(body)) errors.push("Keep this phrase on one line.");
    if (/^(you may|it may help to|how we|and\b|or\b)/iu.test(body.trim())) errors.push("Do not repeat the sentence introduction or start with a conjunction.");
    if (/[{}<>]/u.test(body)) errors.push("Use plain wording, not nested variables or markup.");
  }
  if (key.endsWith("/situationPhrase") && !/^(a|an|the)\s/iu.test(body.trim())) errors.push("Include the situation's article: a, an, or the.");
  if (key.endsWith("/exampleOrder")) {
    const order = skyDebilityExampleOrder(body);
    if (order.length !== 7 || new Set(order).size !== 7 || order.some(name => !(TRADITIONAL_DIGNITY_PLANETS as readonly string[]).includes(name)))
      errors.push("List Sun, Moon, Mercury, Venus, Mars, Jupiter, and Saturn exactly once, separated by commas.");
  }
  return errors;
}
