export type TemplateSlotValues = Record<string, string | number | null | undefined>;

const slotPattern = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

function slotValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function interpolateTemplateString(
  template: string,
  slots: TemplateSlotValues
): string | null {
  const missingSlots = new Set<string>();

  template.replace(slotPattern, (_match, slotName: string) => {
    if (!slotValue(slots[slotName])) {
      missingSlots.add(slotName);
    }

    return "";
  });

  if (missingSlots.size > 0) {
    return null;
  }

  return template.replace(slotPattern, (_match, slotName: string) => slotValue(slots[slotName]));
}

export function hasTemplateSlots(value: string) {
  slotPattern.lastIndex = 0;
  return slotPattern.test(value);
}
