import { interpolateTemplateString, type TemplateSlotValues } from "../services/templateInterpolation.js";

const templateTokenPattern = /\{\{\s*([#^/]?)\s*([A-Za-z0-9_]+)\s*\}\}|\{(?!\{)\s*([A-Za-z0-9_]+)\s*\}(?!\})/g;

const previewSlotExamples: Record<string, string | number> = {
  aspect: "trine",
  aspectAdj: "trining",
  aspectTone: "supportive",
  aspectVerb: "trining",
  date: "August 22",
  day: "Monday",
  driver: "Saturn stations direct",
  house: 2,
  houseOrdinal: "2nd",
  moonSign: "Taurus",
  motion: "retrograde",
  natalHouse: 6,
  natalHouseOrdinal: "6th",
  natalHouseTopic: "work, routines, and health",
  natalPoint: "Moon",
  natalPointTopic: "feelings, needs, and habits",
  natalSign: "Taurus",
  owner: "Maya",
  ownerName: "Maya",
  ownerPossessive: "Maya's",
  phase: "First Quarter Moon",
  planet: "Saturn",
  risingSign: "Aries",
  role: "build",
  ruler: "Venus",
  rulerHouse: 6,
  rulerHouseOrdinal: "6th",
  rulerSign: "Virgo",
  sign: "Taurus",
  timing: "Monday through Wednesday",
  transitHouse: 3,
  transitHouseOrdinal: "3rd",
  transitHouseTopic: "communication, learning, and daily travel",
  transitPlanet: "Jupiter",
  transitPlanetTopic: "growth, opportunity, and excess",
  transitSign: "Leo",
  voice: "you",
  weekEnd: "August 30",
  weekStart: "August 24",
  window: "August 22 through September 3"
};

function templateTokens(values: readonly string[]) {
  return values.flatMap((value) => Array.from(value.matchAll(templateTokenPattern), (match) => ({
    marker: match[1] ?? "",
    name: match[2] ?? match[3] ?? ""
  })));
}

function sectionErrors(values: readonly string[]) {
  const errors: string[] = [];

  for (const value of values) {
    const stack: string[] = [];
    for (const token of templateTokens([value])) {
      if (token.marker === "#" || token.marker === "^") {
        stack.push(token.name);
      } else if (token.marker === "/") {
        const opened = stack.pop();
        if (opened !== token.name) {
          errors.push(`Section {{${token.marker}${token.name}}} does not match its opening tag.`);
        }
      }
    }
    if (stack.length > 0) {
      errors.push(`Section {{#${stack.at(-1)}}} is missing its closing tag.`);
    }
  }

  return errors;
}

export type CmsTemplateValidation = {
  errors: string[];
  previewSlots: TemplateSlotValues;
  unknownSlots: string[];
  usedSlots: string[];
};

export function validateCmsTemplate({
  allowedSlots,
  body,
  headline = "",
  summary = ""
}: {
  allowedSlots: readonly string[];
  body: string;
  headline?: string;
  summary?: string;
}): CmsTemplateValidation {
  const fields = [headline, summary, body];
  const usedSlots = Array.from(new Set(templateTokens(fields).map((token) => token.name).filter(Boolean))).sort();
  const allowed = new Set(allowedSlots);
  const unknownSlots = usedSlots.filter((slot) => !allowed.has(slot));
  const previewSlots = Object.fromEntries(allowedSlots.map((slot) => [slot, previewSlotExamples[slot] ?? `[${slot}]`]));
  const errors = [
    ...(!body.trim() ? ["Body copy is required before this template can be published."] : []),
    ...(unknownSlots.length > 0 ? [`Unavailable slot${unknownSlots.length === 1 ? "" : "s"}: ${unknownSlots.map((slot) => `{{${slot}}}`).join(", ")}.`] : []),
    ...sectionErrors(fields)
  ];

  return { errors: Array.from(new Set(errors)), previewSlots, unknownSlots, usedSlots };
}

export function renderCmsTemplatePreview(
  value: string,
  previewSlots: TemplateSlotValues,
  field: string
) {
  return interpolateTemplateString(value, previewSlots, {
    contentKey: "cms-admin-preview",
    field,
    missingSlotBehavior: "preserve",
    capitalizeSentenceStart: true
  });
}
