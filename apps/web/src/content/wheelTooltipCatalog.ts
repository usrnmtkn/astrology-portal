import { WHEEL_TOOLTIP_PREFIX, wheelTooltipDraftErrors, wheelTooltipHouseSlots, wheelTooltipHouseVariable } from "./wheelTooltipValidation";
export { WHEEL_TOOLTIP_PREFIX };

// Existing wheel wording, moved intact into editable sources. These defaults
// preserve the exploration UI; they do not confer editorial or publication approval.
const definitions = {
  "hover/planet-title": ["Hover details", "Planet or point title", "{{planet}} · {{degree}} {{sign}}{{house}}"],
  "hover/aspects": ["Hover details", "Close aspect facts", "{{aspects}}"],
  "hover/no-aspects": ["Hover details", "No close aspects", "No close aspects"],
  "hover/point": ["Hover details", "Point label", "Point"],
  "hover/sky-house-title": ["Hover details", "Sky house title", "{{houseOrdinal}} house · {{sign}}"],
  "hover/natal-house-title": ["Hover details", "Natal house title", "{{houseOrdinal}} house · {{sign}} · Lord {{ruler}}"],
  "hover/occupants": ["Hover details", "House occupant facts", "{{occupants}}"],
  "hover/empty-house": ["Hover details", "Empty house", "Empty house"],
  "hover/angle-title": ["Hover details", "Angle title", "{{angle}} · {{degree}} {{sign}}"],
  "hover/angle-house": ["Hover details", "Angle house", "{{houseOrdinal}} house"],
  "ruler/title": ["House ruler popup", "Title: ruler in another house", "{{ownerPossessive}} {{houseOrdinal}} house ruler is in {{possessive}} {{rulerHouseOrdinal}}"],
  "ruler/title-own": ["House ruler popup", "Title: ruler in its own house", "{{ownerPossessive}} {{houseOrdinal}} house ruler is in its own house"],
  "ruler/rising": ["House ruler popup", "Opening: rising sign", "{{sign}} is rising in {{ownerPossessive}} chart, so {{ruler}} rules {{possessive}} {{houseOrdinal}} house."],
  "ruler/house": ["House ruler popup", "Opening: other houses", "{{sign}} is {{ownerPossessive}} {{houseOrdinal}} house, so {{ruler}} rules it."],
  "ruler/placement": ["House ruler popup", "Ruler in another house", "{{ruler}} is {{motion}}in {{sign}} in the {{houseOrdinal}}{{dignity}}."],
  "ruler/placement-own": ["House ruler popup", "Ruler in its own house", "{{ruler}} is {{motion}}in {{sign}}, {{ownSign}}{{exaltation}}, so it sits in the house it rules."],
  "ruler/also-rules": ["House ruler popup", "Other house ruled", "{{ruler}} also rules the {{houseOrdinal}}."],
  "dignity/domicile": ["Dignity wording", "Domicile", ", {{ownSign}}{{exaltation}}"],
  "dignity/exalted": ["Dignity wording", "Exaltation", ", where it's {{exalted}}"],
  "dignity/and-exalted": ["Dignity wording", "Domicile and exaltation", ", and it's {{exalted}} there"],
  "dignity/detriment": ["Dignity wording", "Detriment", ", where it's in its {{dignity}}"],
  "dignity/fall": ["Dignity wording", "Fall", ", where it's in its {{dignity}}"],
  "dignity/detriment-fall": ["Dignity wording", "Detriment and fall", ", where it's in its {{dignity}}"],
  "terms/own-sign": ["Terms and guide links", "Own sign link", "its own sign"],
  "terms/other-sign": ["Terms and guide links", "Other ruled sign link", "the other sign it rules"],
  "terms/exalted": ["Terms and guide links", "Exaltation link", "exalted"],
  "terms/detriment": ["Terms and guide links", "Detriment link", "detriment"],
  "terms/fall": ["Terms and guide links", "Fall link", "fall"],
  "terms/detriment-fall": ["Terms and guide links", "Detriment and fall link", "detriment and fall"],
  "terms/retrograde": ["Terms and guide links", "Retrograde wording", "retrograde"],
  "variables/owner-you-title": ["Variable wording", "ownerPossessive · You, title", "Your"],
  "variables/owner-you-body": ["Variable wording", "ownerPossessive · You, body", "your"],
  "variables/owner-friend": ["Variable wording", "ownerPossessive · Friend name", "{{ownerName}}'s"],
  "variables/possessive-you": ["Variable wording", "possessive · You", "your"],
  "variables/possessive-she": ["Variable wording", "possessive · She", "her"],
  "variables/possessive-he": ["Variable wording", "possessive · He", "his"],
  "variables/possessive-they": ["Variable wording", "possessive · They", "their"],
  "variables/possessive-unspecified": ["Variable wording", "possessive · Unspecified pronouns", "the"],
  "variables/house-ordinal": ["Variable wording", "houseOrdinal · Selected house", "{{houseOrdinal}}"],
  "variables/ruler-house-ordinal": ["Variable wording", "rulerHouseOrdinal · Ruler's house", "{{houseOrdinal}}"]
} as const;

export type WheelTooltipName = keyof typeof definitions;
export const wheelTooltipFields = (Object.entries(definitions) as [WheelTooltipName, readonly [string, string, string]][]).map(([name, [group, label, body]]) => ({
  key: WHEEL_TOOLTIP_PREFIX + name, name, group, label, body,
  allowedSlots: wheelTooltipHouseVariable(WHEEL_TOOLTIP_PREFIX + name) ? wheelTooltipHouseSlots : [...new Set([...body.matchAll(/\{\{(\w+)\}\}/gu)].map(match => match[1]))]
}));
export const wheelTooltipField = (key: string) => wheelTooltipFields.find(field => field.key === key);
export function wheelTooltipTemplateErrors(key: string, body: string) {
  if (!key.startsWith(WHEEL_TOOLTIP_PREFIX)) return [];
  const field = wheelTooltipField(key);
  return field ? wheelTooltipDraftErrors(key, body, field.allowedSlots) : ["Choose a registered wheel tooltip source."];
}
