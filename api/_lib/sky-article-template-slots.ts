export type SkyArticleTemplateSlot = {
  name: string;
  description?: string;
};

const factDependentSlotPattern = /\b(?:aspect|aspects|crossing|crossings|date|dates|degree|degrees|era|exact|founded|historical|history|inheritance|lunation|lunations|previous|retrograde|station|stations|timeline|transit|transits|window|windows)\b/iu;

export function skyArticleTemplateSlotNeedsAdditionalFacts(slot: SkyArticleTemplateSlot) {
  const searchable = `${slot.name} ${slot.description ?? ""}`
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/[_-]+/gu, " ");
  return factDependentSlotPattern.test(searchable);
}

export function unfinishedSkyArticleTemplateSlots(input: {
  placeholders: SkyArticleTemplateSlot[];
  calculatedSlotValues: Record<string, string>;
  existingSlotValues: Record<string, string>;
}) {
  return input.placeholders.filter((slot) => (
    slot.name !== "risingBlocks"
    && !Object.prototype.hasOwnProperty.call(input.calculatedSlotValues, slot.name)
    && !Object.prototype.hasOwnProperty.call(input.existingSlotValues, slot.name)
  ));
}

export function validateSkyArticleTemplateSlotValues(
  value: unknown,
  requestedSlots: SkyArticleTemplateSlot[]
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The writing provider did not return template slot values.");
  }

  const requestedNames = requestedSlots.map((slot) => slot.name);
  const requestedSet = new Set(requestedNames);
  const returnedEntries = Object.entries(value as Record<string, unknown>);
  const unexpected = returnedEntries.map(([name]) => name).filter((name) => !requestedSet.has(name));
  if (unexpected.length) {
    throw new Error(`The writing provider returned unrequested template slots: ${unexpected.join(", ")}.`);
  }

  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const name of requestedNames) {
    const raw = (value as Record<string, unknown>)[name];
    if (typeof raw !== "string" || !raw.trim()) {
      missing.push(name);
      continue;
    }
    const body = raw.trim();
    if (body.includes("{{") || body.includes("}}")) {
      throw new Error(`The writing provider left an unresolved placeholder in ${name}.`);
    }
    if (body.includes("—")) {
      throw new Error(`The writing provider used an em dash in ${name}.`);
    }
    result[name] = body;
  }

  if (missing.length) {
    throw new Error(`The writing provider did not complete template slots: ${missing.join(", ")}.`);
  }
  return result;
}
