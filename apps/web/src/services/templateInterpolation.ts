export type TemplateSlotValues = Record<string, string | number | null | undefined>;

const slotPattern = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const warnedTemplateSlots = new Set<string>();

type InterpolationOptions = {
  contentKey?: string;
  field?: string;
};

function slotValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function interpolateTemplateString(
  template: string,
  slots: TemplateSlotValues,
  options: InterpolationOptions = {}
): string {
  const missingSlots = new Set<string>();

  template.replace(slotPattern, (_match, slotName: string) => {
    if (!slotValue(slots[slotName])) {
      missingSlots.add(slotName);
    }

    return "";
  });

  if (missingSlots.size > 0) {
    const missing = Array.from(missingSlots).sort();
    const warningKey = `${options.contentKey ?? "unknown"}:${options.field ?? "body"}:${missing.join(",")}`;

    if (!warnedTemplateSlots.has(warningKey)) {
      warnedTemplateSlots.add(warningKey);
      console.warn(
        `Generated content template "${options.contentKey ?? "unknown"}" could not render "${options.field ?? "body"}" because slot(s) were missing: ${missing.join(", ")}.`
      );
    }

    return "";
  }

  return template.replace(slotPattern, (_match, slotName: string) => slotValue(slots[slotName]));
}

export function hasTemplateSlots(value: string) {
  slotPattern.lastIndex = 0;
  return slotPattern.test(value);
}
