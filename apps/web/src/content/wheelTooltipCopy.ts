import type { GeneratedContentRow } from "../services/generatedContent";
import { contentPublication, publicationAllowsContent, publicationRestoresBaseline } from "./contentPublicationState";
import { wheelTooltipField, wheelTooltipTemplateErrors, WHEEL_TOOLTIP_PREFIX, type WheelTooltipName } from "./wheelTooltipCatalog";

export type WheelTooltipTemplates = (name: WheelTooltipName) => string | null;
export type WheelTooltipPreviewBody = { key: string; body: string };
export function wheelTooltipPreviewTemplates(base: WheelTooltipTemplates, drafts: readonly WheelTooltipPreviewBody[]): WheelTooltipTemplates {
  return name => {
    const draft = drafts.find(draft => draft.key === WHEEL_TOOLTIP_PREFIX + name);
    return draft ? wheelTooltipTemplateErrors(draft.key, draft.body).length ? null : draft.body : base(name);
  };
}
/** A component-local overlay. Never installs publications or changes reader caches. */
export function wheelTooltipDraftPreview(base: WheelTooltipTemplates, key: string, body: string) {
  const field = wheelTooltipField(key);
  const errors = field ? wheelTooltipTemplateErrors(key, body) : ["Choose a registered wheel tooltip source."];
  return { errors, templates: errors.length ? null : ((name: WheelTooltipName) => name === field!.name ? body : base(name)) };
}
export function wheelTooltipTemplates(rows: readonly GeneratedContentRow[] = []): WheelTooltipTemplates {
  return name => {
    const key = WHEEL_TOOLTIP_PREFIX + name;
    const publication = contentPublication(key);
    if (publication && publicationRestoresBaseline(publication)) return wheelTooltipField(key)!.body;
    if (publication?.state === "retired") return null;
    const row = rows.find(row => row.content_key === key && row.status === "LIVE" && row.lane === "serving" && !row.review_state);
    if (row && publicationAllowsContent(key, row.id, row.updated_at)) {
      return wheelTooltipTemplateErrors(key, row.body).length ? null : row.body;
    }
    return publication ? null : wheelTooltipField(key)!.body;
  };
}

export function fillWheelTooltip(template: string | null, slots: Record<string, string | number> = {}) {
  if (template === null) return null;
  let missing = false;
  const text = template.replace(/\{\{(\w+)\}\}/gu, (_, name: string) => {
    if (!Object.hasOwn(slots, name)) { missing = true; return ""; }
    return String(slots[name]);
  });
  return missing ? null : text;
}

export function wheelTooltipHouseWording(templates: WheelTooltipTemplates, house: number, ordinal: string, ruler = false) {
  if (!Number.isInteger(house) || house < 1 || house > 12) return null;
  return fillWheelTooltip(templates(ruler ? "variables/ruler-house-ordinal" : "variables/house-ordinal"), { house, houseOrdinal: ordinal });
}
