import { assembleSkyDebilityCopy, type SkyDebilityCopyReader } from "../../web/src/content/skyDebilityAssembly.js";
import { skyDebilityField } from "../../web/src/content/skyDebilityCatalog.js";
import { skyDebilityPhraseKey, skyDebilityPhraseSet, type SkyDebilityPhraseName } from "../../web/src/content/skyDebilityPhrases.js";
import type { TraditionalSkyDebilities } from "../../web/src/services/planetSignDignity.mjs";

export type SkyDebilityMappedPart = {
  text: string;
  kind: "template" | "phrase" | "fact" | "grammar";
  sourceKey?: string;
  slot?: string;
};
export const skyDebilityTemplateKey = (name: string) => `cms/sky-debility/${name}`;
export const skyDebilityMappedText = (parts: readonly SkyDebilityMappedPart[]) => parts.map(part => part.text).join("");

function capitalize(parts: SkyDebilityMappedPart[]) {
  const index = parts.findIndex(part => part.text.length > 0);
  return parts.map((part, i) => i === index ? { ...part, text: part.text[0].toUpperCase() + part.text.slice(1) } : part);
}
function list(parts: SkyDebilityMappedPart[], conjunction: "and" | "or", slot: string) {
  return parts.flatMap((part, index): SkyDebilityMappedPart[] => {
    // Match the shared list formatter; parity is checked before any map is shown.
    const separator = index === 0 ? "" : index < parts.length - 1 ? ", " : parts.length === 2 ? ` ${conjunction} ` : `, ${conjunction} `;
    return [...(separator ? [{ text: separator, kind: "grammar" as const, slot }] : []), { ...part, slot }];
  });
}
function template(text: string, sourceKey: string, slots: Record<string, SkyDebilityMappedPart[]>) {
  return text.split(/(\{[^{}]+\})/gu).filter(Boolean).flatMap((chunk): SkyDebilityMappedPart[] => {
    const match = /^\{([^{}]+)\}$/u.exec(chunk);
    return match ? slots[match[1]] ?? [] : [{ text: chunk, kind: "template", sourceKey }];
  });
}

/** An editor-only source map over the production assembler, never a second
 * reader composer. One captured source snapshot feeds both; every mapped field
 * must reproduce the assembler byte-for-byte or the map fails closed. */
export function buildSkyDebilityComposition(snapshot: TraditionalSkyDebilities, read: SkyDebilityCopyReader = key => skyDebilityField(key)?.body) {
  const sources = new Map<string, string | null | undefined>();
  const capturedRead: SkyDebilityCopyReader = key => {
    if (!sources.has(key)) sources.set(key, read(key));
    return sources.get(key);
  };
  const copy = assembleSkyDebilityCopy(snapshot, capturedRead);
  const empty = { copy, sources, slots: {} as Record<string, SkyDebilityMappedPart[]>, heading: [] as SkyDebilityMappedPart[],
    countLabel: [] as SkyDebilityMappedPart[], countUnit: [] as SkyDebilityMappedPart[], paragraphs: [] as SkyDebilityMappedPart[][],
    errors: [] as string[] };
  if (!copy.visible) return empty;
  const body = (key: string) => (capturedRead(key) ?? "").trim();
  const sourceFor = (placementKey: string) => {
    const [planet, sign] = placementKey.split("/");
    return skyDebilityPhraseSet(planet, sign)!;
  };
  const phrase = (placementKey: string, name: SkyDebilityPhraseName): SkyDebilityMappedPart => {
    const row = sourceFor(placementKey);
    const sourceKey = skyDebilityPhraseKey(row.planetTitle, row.signTitle, name);
    return { text: body(sourceKey), sourceKey, kind: "phrase" };
  };
  const facts = (slot: string): SkyDebilityMappedPart[] => [{ text: copy.slots[slot], slot, kind: "fact" }];
  const slots: Record<string, SkyDebilityMappedPart[]> = {
    count: facts("count"), total: facts("total"), planetWord: facts("planetWord"),
    livedExperienceList: list(copy.selectedPlacementKeys.map(key => phrase(key, "livedExperienceClause")), "or", "livedExperienceList"),
    situationList: capitalize(list(copy.selectedPlacementKeys.map(key => phrase(key, "situationPhrase")), "or", "situationList")),
    responseList: list(copy.selectedPlacementKeys.map(key => phrase(key, "responseClause")), "and", "responseList"),
    planetFunctionList: list(copy.allPlacementKeys.map(key => phrase(key, "planetFunctionVerbPhrase")), "and", "planetFunctionList"),
    planetList: capitalize(list(copy.allPlacementKeys.map(key => {
      const { planetTitle } = sourceFor(key);
      return { text: planetTitle === "Sun" || planetTitle === "Moon" ? `the ${planetTitle}` : planetTitle, kind: "fact" as const };
    }), "and", "planetList"))
  };
  const conditionKey = skyDebilityTemplateKey(snapshot.count === 1 ? "signConditionOne" : "signConditionMany");
  if (snapshot.count === 1) slots.signTitle = facts("signTitle");
  slots.signConditionClause = template(body(conditionKey), conditionKey, slots);
  const headingKey = skyDebilityTemplateKey("openingHook");
  const heading: SkyDebilityMappedPart[] = [{ text: body(headingKey), kind: "template", sourceKey: headingKey }];
  const countLabel = template(body(skyDebilityTemplateKey("countLabel")), skyDebilityTemplateKey("countLabel"), slots);
  const countUnit = template(body(skyDebilityTemplateKey("countUnit")), skyDebilityTemplateKey("countUnit"), slots);
  const paragraphs = ["experienceTemplate", "contextTemplate"].map(name => template(body(skyDebilityTemplateKey(name)), skyDebilityTemplateKey(name), slots));
  const checks: [string, string, string][] = [
    ["Heading", skyDebilityMappedText(heading), copy.openingHook],
    ["Count line", skyDebilityMappedText(countLabel), copy.countLabel],
    ["Count unit", skyDebilityMappedText(countUnit), copy.countUnit],
    ...paragraphs.map((parts, i): [string, string, string] => [`Paragraph ${i + 1}`, skyDebilityMappedText(parts), copy.paragraphs[i]]),
    ...Object.entries(slots).map(([slot, parts]): [string, string, string] => [slot, skyDebilityMappedText(parts), copy.slots[slot]])
  ];
  const errors = checks.filter(([, actual, expected]) => actual !== expected).map(([label]) => `${label}: Source map does not match the reader. Use the read-through view and individual fields.`);
  return errors.length ? { ...empty, errors } : { copy, sources, slots, heading, countLabel, countUnit, paragraphs, errors };
}

/** Template tokens are read from current fields, not from a hardcoded paragraph. */
export function skyDebilityTemplateTokens(body: string) {
  return [...new Set(Array.from(body.matchAll(/\{([^{}]+)\}/gu), match => match[1]))];
}
