import {
  DIGNITY_FRAMEWORK, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities,
  type TraditionalSkyDebilities
} from "../services/planetSignDignity.mjs";
import { skyDebilityExampleOrder, skyDebilityField, skyDebilityTemplateErrors } from "./skyDebilityCatalog.js";
import { skyDebilityPhraseKey, skyDebilityPhraseNames, skyDebilityPhraseSet, skyDebilityPlacementId } from "./skyDebilityPhrases.js";

export type SkyDebilityCopyReader = (key: string) => string | null | undefined;
export function skyDebilitySlots(snapshot: TraditionalSkyDebilities) {
  return { count: String(snapshot.count), total: String(snapshot.traditionalCount), planetWord: snapshot.count === 1 ? "planet" : "planets" };
}
export function joinSkyDebilityList(parts: readonly string[], conjunction: "and" | "or") {
  if (parts.length < 2) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, ${conjunction} ${parts.at(-1)}`;
}
const capitalize = (text: string) => text ? text[0].toUpperCase() + text.slice(1) : text;

/** Same deterministic assembly for the reader and Studio. No runtime generation. */
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
    accessibleName: "", slots, errors, requiredKeys,
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
    const issues = skyDebilityTemplateErrors(key, value);
    errors.push(...issues.map(issue => `${key}: ${issue}`));
    return value.trim();
  }
  const field = (name: string) => required(`cms/sky-debility/${name}`);
  const heading = field("openingHook");
  const countLabel = field("countLabel");
  const countUnit = field("countUnit");
  const experienceTemplate = field("experienceTemplate");
  const contextTemplate = field("contextTemplate");
  const order = skyDebilityExampleOrder(field("exampleOrder"));
  slots.signConditionClause = field(snapshot.count === 1 ? "signConditionOne" : "signConditionMany");

  const canonicalOrder = TRADITIONAL_DIGNITY_PLANETS as readonly string[];
  const rows = [...snapshot.planets].sort((a, b) => canonicalOrder.indexOf(a.planet) - canonicalOrder.indexOf(b.planet)).map(row => {
    const source = skyDebilityPhraseSet(row.planet, row.sign);
    if (!source) errors.push(`${row.planet} in ${row.sign}: Missing placement phrase set.`);
    // Resolve the whole matched set, including entries not selected as examples.
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
  slots.planetList = capitalize(joinSkyDebilityList(rows.map(row => row.planet === "Sun" || row.planet === "Moon" ? `the ${row.planet}` : row.planet), "and"));
  slots.planetFunctionList = joinSkyDebilityList(rows.map(row => row.planetFunctionVerbPhrase), "and");
  const fill = (template: string) => template.replace(/\{([^{}]+)\}/gu, (_, name: string) => slots[name]);
  const paragraphs = [fill(experienceTemplate), fill(contextTemplate)];
  return { ...output, visible: true, openingHook: heading, titleLead: heading,
    accessibleName: heading, countLabel: fill(countLabel), countUnit: fill(countUnit),
    paragraphs, body: paragraphs.join("\n\n") };
}
