export type TemplateSlotValues = Record<string, string | number | boolean | null | undefined>;

const slotPattern = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}|\{(?!\{)\s*([A-Za-z0-9_]+)\s*\}(?!\})/g;
const sectionPattern = /\{\{\s*([#^])\s*([A-Za-z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/\s*\2\s*\}\}/g;
const sectionTagPattern = /\{\{\s*[#^/]\s*[A-Za-z0-9_]+\s*\}\}/;
const warnedTemplateSlots = new Set<string>();

type InterpolationOptions = {
  contentKey?: string;
  field?: string;
  missingSlotBehavior?: "empty" | "preserve";
  capitalizeSentenceStart?: boolean;
};

function slotValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return "";
  }

  return String(value).trim();
}

function slotTruthy(value: TemplateSlotValues[string]) {
  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(slotValue(value));
}

function renderTemplateSections(template: string, slots: TemplateSlotValues) {
  let rendered = template;
  let previous = "";

  while (rendered !== previous) {
    previous = rendered;
    rendered = rendered.replace(sectionPattern, (_match, marker: string, slotName: string, body: string) => {
      const truthy = slotTruthy(slots[slotName]);
      const shouldRender = marker === "#" ? truthy : !truthy;

      return shouldRender ? body : "";
    });
  }

  return rendered;
}

export function interpolateTemplateString(
  template: string,
  slots: TemplateSlotValues,
  options: InterpolationOptions = {}
): string {
  const sectionRenderedTemplate = renderTemplateSections(template, slots);
  const missingSlots = new Set<string>();

  sectionRenderedTemplate.replace(slotPattern, (_match, doubleBraceSlot: string | undefined, singleBraceSlot: string | undefined) => {
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

  return sectionRenderedTemplate.replace(slotPattern, (_match, doubleBraceSlot: string | undefined, singleBraceSlot: string | undefined, offset: number) => {
    const value = slotValue(slots[doubleBraceSlot ?? singleBraceSlot ?? ""]);

    if (!options.capitalizeSentenceStart || !value) {
      return value;
    }

    const before = sectionRenderedTemplate.slice(0, offset);
    const atSentenceStart = before.trim().length === 0 || /(?:^|[.!?]\s+)$/.test(before);

    return atSentenceStart ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  });
}

export function hasTemplateSlots(value: string) {
  slotPattern.lastIndex = 0;
  return slotPattern.test(value) || sectionTagPattern.test(value);
}

export function hasMissingTemplateSlots(value: string, slots: TemplateSlotValues) {
  const sectionRenderedValue = renderTemplateSections(value, slots);
  const missingSlots = new Set<string>();

  sectionRenderedValue.replace(slotPattern, (_match, doubleBraceSlot: string | undefined, singleBraceSlot: string | undefined) => {
    const slotName = doubleBraceSlot ?? singleBraceSlot ?? "";

    if (!slotValue(slots[slotName])) {
      missingSlots.add(slotName);
    }

    return "";
  });

  return missingSlots.size > 0 || sectionTagPattern.test(sectionRenderedValue);
}
