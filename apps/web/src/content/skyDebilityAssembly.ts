import {
  DIGNITY_FRAMEWORK, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities,
  type TraditionalSkyDebilities
} from "../services/planetSignDignity.mjs";
import { skyDebilityExampleOrder, skyDebilityField, skyDebilityLegacyContext, skyDebilityTemplateErrors } from "./skyDebilityCatalog.js";
import { skyDebilityPhraseKey, skyDebilityPhraseNames, skyDebilityPhraseSet, skyDebilityPlacementId } from "./skyDebilityPhrases.js";

export type SkyDebilityCopyReader = (key: string) => string | null | undefined;
const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven"] as const;
const capitalize = (text: string) => text ? text[0].toUpperCase() + text.slice(1) : text;
export function skyDebilitySlots(snapshot: TraditionalSkyDebilities) {
  return {
    count: String(snapshot.count), total: String(snapshot.traditionalCount),
    planetWord: snapshot.count === 1 ? "planet" : "planets",
    countWord: capitalize(numberWords[snapshot.count] ?? ""),
    totalWord: numberWords[snapshot.traditionalCount] ?? "",
    countVerb: snapshot.count === 1 ? "is" : "are",
    planetReference: snapshot.count === 1 ? "this planet" : "these planets"
  };
}
export function joinSkyDebilityList(parts: readonly string[], conjunction: "and" | "or") {
  if (parts.length < 2) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, ${conjunction} ${parts.at(-1)}`;
}

/** One deterministic assembler for the reader and every Studio view. */
export function assembleSkyDebilityCopy(
  snapshot: TraditionalSkyDebilities,
  read: SkyDebilityCopyReader = key => skyDebilityField(key)?.body
) {
  const slots: Record<string, string> = skyDebilitySlots(snapshot);
  const errors: string[] = [];
  const requiredKeys: string[] = [];
  const output = {
    visible: false, hiddenReason: "", openingHook: "", titleLead: "", titleSoft: "",
    countLabel: "", countUnit: slots.planetWord, body: "", paragraphs: [] as string[],
    accessibleName: "", slots, errors, requiredKeys, legacyContext: false,
    selectedPlacementKeys: [] as string[], allPlacementKeys: [] as string[], omittedExamplePlacementKeys: [] as string[]
  };
  if (snapshot.framework !== DIGNITY_FRAMEWORK || snapshot.traditionalCount !== 7 || snapshot.knownCount !== 7) {
    return { ...output, hiddenReason: "incomplete-sky", errors: ["All seven traditional planet positions are required for this card."] };
  }
  const planetNames = snapshot.planets.map(row => row.planet);
  if (snapshot.count !== snapshot.planets.length || new Set(planetNames).size !== planetNames.length
    || snapshot.planets.some(row => !planetSignDebilities(row.planet, row.sign).length)) {
    return { ...output, hiddenReason: "invalid-sky", errors: ["The qualifying placements do not match the shared dignity lookup."] };
  }
  if (snapshot.count === 0) return { ...output, hiddenReason: "no-qualifying-planets" };

  function required(key: string) {
    requiredKeys.push(key);
    const value = read(key);
    if (typeof value !== "string") { errors.push(`${key}: Missing or unavailable wording.`); return ""; }
    errors.push(...skyDebilityTemplateErrors(key, value).map(issue => `${key}: ${issue}`));
    return value.trim();
  }
  const field = (name: string) => required(`cms/sky-debility/${name}`);
  const heading = field("openingHook");
  const countLabel = field("countLabel");
  const countUnit = field("countUnit");
  const experienceTemplate = field("experienceTemplate");
  const contextTemplate = field("contextTemplate");
  const order = skyDebilityExampleOrder(field("exampleOrder"));
  output.legacyContext = skyDebilityLegacyContext(contextTemplate);
  if (snapshot.count === 1) slots.signTitle = snapshot.planets[0].sign;
  if (output.legacyContext) {
    const connector = field(snapshot.count === 1 ? "signConditionOne" : "signConditionMany");
    slots.signConditionClause = snapshot.count === 1 ? connector.replace(/\{signTitle\}/gu, () => slots.signTitle) : connector;
  } else {
    const explanation = field(snapshot.count === 1 ? "dignityExplanationOne" : "dignityExplanationMany");
    // Explicit, one-level expansion of this sentence's calculated sign only.
    slots.dignityExplanationSentence = snapshot.count === 1 ? explanation.replace(/\{signTitle\}/gu, () => slots.signTitle) : explanation;
  }

  const canonicalOrder = TRADITIONAL_DIGNITY_PLANETS as readonly string[];
  const rows = [...snapshot.planets].sort((a, b) => canonicalOrder.indexOf(a.planet) - canonicalOrder.indexOf(b.planet)).map(row => {
    if (!skyDebilityPhraseSet(row.planet, row.sign)) errors.push(`${row.planet} in ${row.sign}: Missing placement phrase set.`);
    const phrases = Object.fromEntries(skyDebilityPhraseNames.map(name => [name, required(skyDebilityPhraseKey(row.planet, row.sign, name))])) as Record<typeof skyDebilityPhraseNames[number], string>;
    return { ...row, ...phrases, placementKey: skyDebilityPlacementId(row.planet, row.sign) };
  });
  const examples = [...rows].sort((a, b) => order.indexOf(a.planet) - order.indexOf(b.planet)).slice(0, 3);
  output.allPlacementKeys = rows.map(row => row.placementKey);
  output.selectedPlacementKeys = examples.map(row => row.placementKey);
  output.omittedExamplePlacementKeys = rows.filter(row => !output.selectedPlacementKeys.includes(row.placementKey)).map(row => row.placementKey);
  if (errors.length) return { ...output, hiddenReason: "missing-or-invalid-wording" };

  slots.livedExperienceList = joinSkyDebilityList(examples.map(row => row.livedExperienceClause), "or");
  slots.situationList = capitalize(joinSkyDebilityList(examples.map(row => row.situationPhrase), "or"));
  slots.responseList = joinSkyDebilityList(examples.map(row => row.responseClause), "and");
  const planetList = joinSkyDebilityList(rows.map(row => row.planet === "Sun" || row.planet === "Moon" ? `the ${row.planet}` : row.planet), "and");
  slots.planetList = output.legacyContext ? capitalize(planetList) : planetList;
  slots.planetFunctionList = joinSkyDebilityList(rows.map(row => row.planetFunctionVerbPhrase), "and");
  const fill = (template: string) => template.replace(/\{([^{}]+)\}/gu, (_, name: string) => slots[name]);
  const paragraphs = [fill(experienceTemplate), fill(contextTemplate)];
  return { ...output, visible: true, openingHook: heading, titleLead: heading,
    accessibleName: heading, countLabel: fill(countLabel), countUnit: fill(countUnit),
    paragraphs, body: paragraphs.join("\n\n") };
}
