import type { AskTldrGovernedFactor } from "./ask-tldr-governed-evidence.ts";
import type { AskTldrWriterOutput } from "./ask-tldr-writer.ts";

export type AskTldrFactLockIssue = {
  code: "untraceable_date" | "untraceable_degree" | "untraceable_attribution" | "untraceable_house_claim" | "untraceable_sign_claim";
  value: string;
  message: string;
};

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BODIES = "sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node";
const POINTS = `${BODIES}|ascendant|midheaven|descendant|ic|imum coeli`;
const SIGNS = "aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces";
const ASPECT_WORD = "conjunct(?:s|ing|ed|ion)?|oppos(?:es|ing|ed|ition)|squar(?:es|ing|ed|e)|trin(?:es|ing|ed|e)|sextil(?:es|ing|ed|e)";

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  const record = recordValue(value);
  return record ? Object.values(record).flatMap(strings) : [];
}

function normalizeBody(value: unknown) {
  const normalized = words(value).toLowerCase().replace(/[_-]+/gu, " ").replace(/\s+/gu, " ");
  if (normalized === "mc") return "midheaven";
  if (normalized === "dsc") return "descendant";
  if (normalized === "asc") return "ascendant";
  if (["imum coeli", "imum_coeli"].includes(normalized)) return "ic";
  return normalized;
}

function normalizeAspect(value: unknown) {
  const normalized = words(value).toLowerCase();
  if (/^conj/iu.test(normalized)) return "conjunction";
  if (/^oppos/iu.test(normalized)) return "opposition";
  if (/^squar/iu.test(normalized)) return "square";
  if (/^trin/iu.test(normalized)) return "trine";
  if (/^sextil/iu.test(normalized)) return "sextile";
  return normalized;
}

function dateTokens(evidence: AskTldrGovernedFactor[]) {
  const tokens = new Set<string>();
  const values = evidence.flatMap((factor) => [
    factor.exactAt,
    factor.startsAt,
    factor.endsAt,
    ...strings(factor.facts)
  ]).filter(Boolean) as string[];
  for (const value of values) {
    if (!/^\d{4}-\d{2}-\d{2}/u.test(value)) continue;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) continue;
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    tokens.add(`${MONTH_LONG[month]} ${day}`.toLowerCase());
    tokens.add(`${MONTH_SHORT[month]} ${day}`.toLowerCase());
    tokens.add(value.slice(0, 10).toLowerCase());
  }
  return tokens;
}

function evidenceFactsText(evidence: AskTldrGovernedFactor[]) {
  return JSON.stringify(evidence.map((factor) => ({
    kind: factor.kind,
    temporalState: factor.temporalState,
    houses: factor.houses,
    angles: factor.angles,
    points: factor.points,
    exactAt: factor.exactAt,
    startsAt: factor.startsAt,
    endsAt: factor.endsAt,
    facts: factor.facts
  }))).toLowerCase();
}

function transitMatch(evidence: AskTldrGovernedFactor[], planet: string, aspect: string, point: string) {
  const p = normalizeBody(planet);
  const a = normalizeAspect(aspect);
  const n = normalizeBody(point);
  return evidence.some((factor) => {
    if (!["transit_to_natal", "return"].includes(factor.kind)) return false;
    const facts = factor.facts;
    return normalizeBody(facts.transitPlanet) === p
      && normalizeBody(facts.natalPoint) === n
      && normalizeAspect(facts.aspect) === a;
  });
}

function natalAspectMatch(evidence: AskTldrGovernedFactor[], first: string, aspect: string, second: string) {
  const a = normalizeAspect(aspect);
  const pair = [normalizeBody(first), normalizeBody(second)].sort().join("|");
  return evidence.some((factor) => {
    if (factor.kind !== "natal_aspect") return false;
    const facts = factor.facts;
    const from = normalizeBody(facts.from ?? facts.from_);
    const to = normalizeBody(facts.to);
    return [from, to].sort().join("|") === pair && normalizeAspect(facts.type ?? facts.aspect) === a;
  });
}

function returnMatch(evidence: AskTldrGovernedFactor[], planet: string) {
  const p = normalizeBody(planet);
  return evidence.some((factor) => factor.kind === "return"
    && normalizeBody(factor.facts.transitPlanet) === p
    && normalizeBody(factor.facts.natalPoint) === p);
}

function houseClaimMatch(evidence: AskTldrGovernedFactor[], point: string, house: number, context: string) {
  const p = normalizeBody(point);
  const normalizedContext = context.toLowerCase();
  return evidence.some((factor) => {
    const facts = factor.facts;
    if (factor.kind === "transit_through_house") {
      return normalizeBody(facts.transitPlanet ?? facts.planet) === p
        && Number(facts.transitHouse ?? facts.house) === house;
    }
    if (factor.kind === "natal_placement") {
      return normalizeBody(facts.point ?? facts.planet) === p && Number(facts.house) === house;
    }
    if (factor.kind === "solar_return_overlay" && /solar return/u.test(normalizedContext)) {
      return normalizeBody(facts.point) === p && Number(facts.house) === house;
    }
    return false;
  });
}

function signClaimMatch(evidence: AskTldrGovernedFactor[], point: string, sign: string, context: string) {
  const p = normalizeBody(point);
  const s = words(sign).toLowerCase();
  const normalizedContext = context.toLowerCase();
  return evidence.some((factor) => {
    const facts = factor.facts;
    if (factor.kind === "natal_placement") {
      return normalizeBody(facts.point ?? facts.planet) === p && words(facts.sign).toLowerCase() === s;
    }
    if (factor.kind === "transit_through_house" || factor.kind === "transit_to_natal" || factor.kind === "return") {
      return normalizeBody(facts.transitPlanet ?? facts.planet) === p && words(facts.transitSign ?? facts.sign).toLowerCase() === s;
    }
    if (factor.kind === "solar_return_overlay" && /solar return/u.test(normalizedContext)) {
      return normalizeBody(facts.point) === p && words(facts.sign).toLowerCase() === s;
    }
    return false;
  });
}

export function verifyAskTldrFactLock(input: {
  output: AskTldrWriterOutput;
  evidence: AskTldrGovernedFactor[];
}) {
  const used = input.evidence.filter((factor) => input.output.evidenceIdsUsed.includes(factor.id));
  const issues: AskTldrFactLockIssue[] = [];
  if (!used.length) {
    return {
      passed: false,
      checkedEvidenceIds: [],
      issues: [{
        code: "untraceable_attribution" as const,
        value: "no evidence",
        message: "No governed evidence was supplied for the writer's declared evidence IDs."
      }]
    };
  }

  const answer = input.output.answer;
  const allowedDates = dateTokens(used);
  const dates = answer.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/giu) ?? [];
  for (const date of dates) {
    if (!allowedDates.has(date.toLowerCase())) {
      issues.push({ code: "untraceable_date", value: date, message: `${date} is not present in the writer's declared calculated evidence.` });
    }
  }
  const isoDates = answer.match(/\b\d{4}-\d{2}-\d{2}\b/gu) ?? [];
  for (const date of isoDates) {
    if (!allowedDates.has(date.toLowerCase())) {
      issues.push({ code: "untraceable_date", value: date, message: `${date} is not present in the writer's declared calculated evidence.` });
    }
  }

  const factsText = evidenceFactsText(used);
  const degrees = answer.match(/\b\d{1,3}(?:\.\d+)?°/gu) ?? [];
  for (const degree of degrees) {
    const numeric = degree.slice(0, -1);
    if (!factsText.includes(numeric)) {
      issues.push({ code: "untraceable_degree", value: degree, message: `${degree} is not traceable to the writer's declared calculated evidence.` });
    }
  }

  const transitRegex = new RegExp(`\\b(${BODIES})\\s+(${ASPECT_WORD})\\s+(?:your\\s+)?(?:natal\\s+)?(${POINTS})\\b`, "giu");
  for (const match of answer.matchAll(transitRegex)) {
    const [value, planet, aspect, point] = match;
    if (!transitMatch(used, planet, aspect, point) && !natalAspectMatch(used, planet, aspect, point)) {
      issues.push({
        code: "untraceable_attribution",
        value,
        message: `${value} does not match a transit-to-natal or natal aspect in the writer's declared evidence.`
      });
    }
  }

  const natalAspectRegex = new RegExp(`\\byour\\s+(${POINTS})\\s+(${ASPECT_WORD})\\s+(?:your\\s+)?(${POINTS})\\b`, "giu");
  for (const match of answer.matchAll(natalAspectRegex)) {
    const [value, first, aspect, second] = match;
    if (!natalAspectMatch(used, first, aspect, second) && !transitMatch(used, first, aspect, second)) {
      issues.push({ code: "untraceable_attribution", value, message: `${value} is not present in the writer's declared evidence.` });
    }
  }

  const returnRegex = new RegExp(`\\b(${BODIES})\\s+return\\b`, "giu");
  for (const match of answer.matchAll(returnRegex)) {
    const [value, planet] = match;
    if (!returnMatch(used, planet)) {
      issues.push({ code: "untraceable_attribution", value, message: `${value} is not present in the writer's declared evidence.` });
    }
  }

  const houseRegex = new RegExp(`\\b(?:your\\s+)?(${POINTS})\\s+(?:is\\s+|moving\\s+|moves\\s+|in\\s+)?(?:through\\s+|in\\s+)?(?:your\\s+)?(?:the\\s+)?([1-9]|1[0-2])(?:st|nd|rd|th)?\\s+house\\b`, "giu");
  for (const match of answer.matchAll(houseRegex)) {
    const [value, point, rawHouse] = match;
    if (!houseClaimMatch(used, point, Number(rawHouse), value)) {
      issues.push({ code: "untraceable_house_claim", value, message: `${value} is not a natal, transit-through-house, or Solar Return house fact in the writer's declared evidence.` });
    }
  }

  const signRegex = new RegExp(`\\b(?:your\\s+)?(${POINTS})\\s+(?:is\\s+)?in\\s+(${SIGNS})\\b`, "giu");
  for (const match of answer.matchAll(signRegex)) {
    const [value, point, sign] = match;
    if (!signClaimMatch(used, point, sign, value)) {
      issues.push({ code: "untraceable_sign_claim", value, message: `${value} is not a natal, transit, or Solar Return sign fact in the writer's declared evidence.` });
    }
  }

  return {
    passed: issues.length === 0,
    checkedEvidenceIds: used.map((factor) => factor.id),
    issues
  };
}
