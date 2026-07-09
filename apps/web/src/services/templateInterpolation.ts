export type TemplateSlotValues = Record<string, string | number | null | undefined>;

const slotPattern = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}|\{(?!\{)\s*([A-Za-z0-9_]+)\s*\}(?!\})/g;
const warnedTemplateSlots = new Set<string>();

type InterpolationOptions = {
  contentKey?: string;
  field?: string;
  missingSlotBehavior?: "empty" | "preserve";
  capitalizeSentenceStart?: boolean;
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

  template.replace(slotPattern, (_match, doubleBraceSlot: string | undefined, singleBraceSlot: string | undefined) => {
    const slotName = doubleBraceSlot ?? singleBraceSlot ?? "";

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

    if (options.missingSlotBehavior === "preserve") {
      return template;
    }

    return "";
  }

  return template.replace(slotPattern, (_match, doubleBraceSlot: string | undefined, singleBraceSlot: string | undefined, offset: number) => {
    const value = slotValue(slots[doubleBraceSlot ?? singleBraceSlot ?? ""]);

    if (!options.capitalizeSentenceStart || !value) {
      return value;
    }

    const before = template.slice(0, offset);
    const atSentenceStart = before.trim().length === 0 || /(?:^|[.!?]\s+)$/.test(before);

    return atSentenceStart ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  });
}

export function hasTemplateSlots(value: string) {
  slotPattern.lastIndex = 0;
  return slotPattern.test(value);
}
