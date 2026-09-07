import { normalizeAspectType } from "../components/charts/chartAssets";
import { aspectGiftOrLesson } from "../services/aspectGiftLesson";

export type ArticleAspectToneBucket = "gifts" | "lessons";

const aspectTypePattern = /\b(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\b/i;

export function normalizedArticleAspectToneBucket(aspectType?: string): ArticleAspectToneBucket {
  return aspectGiftOrLesson(normalizeAspectType(aspectType ?? ""));
}

export function articleAspectTypeFromText(value: string) {
  const match = value.match(aspectTypePattern)?.[1] ?? "";
  return normalizeAspectType(match);
}

function articleAspectGlyphTypeFromText(value: string) {
  const normalized = articleAspectTypeFromText(value);
  if (normalized === "conjunct") return "conjunction";
  if (normalized === "opposite") return "opposition";
  return normalized;
}

export function articleAspectGlyphPartsFromHeading(heading: string) {
  const match = heading.match(/^\s*(.+?)\s+(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\s+(.+?)\s*$/iu);
  if (!match) return null;
  return { from: match[1].trim(), aspect: articleAspectGlyphTypeFromText(match[2]), to: match[3].trim() };
}

export type SkyActiveChartAspect = { key: string; heading: string; body: string | null };
export type SkyActiveChartEvent = SkyActiveChartAspect & {
  type: "single" | "nodal-axis";
  dateLabel: string | null;
  memberKeys: string[];
};

type CompactActiveAspect = {
  body: string | null;
  dateLabel: string | null;
  transitHouse: string | null;
  natalLabel: string | null;
  natalHouse: string | null;
};

type NodeHeading = [string, string, "north" | "south"];
const nodePattern = /^(.+?)\s+(conjunction|conjunct|opposition|opposite|square|trine|sextile)\s+(?:your\s+)?(?:natal\s+)?(north|south)\s+node$/iu;
const activeDatePattern = /\b(?:until|through)\s+([A-Z][a-z]+\s+\d{1,2}(?:,\s+\d{4})?)/u;
const activeFramePattern = /^While\s+.+?\s+(?:is\s+in|moves\s+through)\s+your\s+(\d+(?:st|nd|rd|th)\s+house),\s+it\s+is\s+also\s+.*?\s+your\s+natal\s+(.+?)\s+in\s+your\s+(\d+(?:st|nd|rd|th)\s+house)(?:\s+(?:until|through)\s+[^.]+)?\.\s*/iu;
const transitSignLeadPattern = /^(?:The\s+)?[A-Za-z]+(?:\s+[A-Za-z]+){0,2}\s+in\s+[A-Z][a-z]+\b/u;
const houseFocus = [
  "",
  "identity, body, appearance, or how you take up space",
  "money, possessions, values, self-worth, or what you can rely on",
  "communication, learning, messages, short trips, or daily logistics",
  "home, family, your living situation, roots, or private life",
  "creativity, dating, children, hobbies, pleasure, or visibility",
  "daily work, health, routines, appointments, or your schedule",
  "partnerships, close relationships, agreements, conflict, or negotiation",
  "shared money, support, debts, obligations, trust, or intimacy",
  "travel, education, publishing, law, beliefs, or long-distance plans",
  "career, public role, responsibility, authority, reputation, or recognition",
  "friends, groups, community, collaboration, audience, networks, or future plans",
  "rest, privacy, endings, closure, retreat, or behind-the-scenes matters"
];

function parsedNodeHeading(heading: string): NodeHeading | null {
  const match = heading.trim().match(nodePattern);
  if (!match) return null;
  const raw = match[2].toLowerCase();
  return [match[1].trim().toLowerCase(), raw === "conjunct" ? "conjunction" : raw === "opposite" ? "opposition" : raw, match[3].toLowerCase() as "north" | "south"];
}

function mirroredNodeAspect(first: string, second: string) {
  return first === "square" && second === first
    || first === "conjunction" && second === "opposition"
    || first === "opposition" && second === "conjunction"
    || first === "trine" && second === "sextile"
    || first === "sextile" && second === "trine";
}

function sentence(value: string) {
  return value.match(/^.*?[.!?](?:\s|$)/u)?.[0]?.trim() ?? value;
}

function stripSharedTransitLead(value: string) {
  const semicolon = value.indexOf(";");
  if (semicolon < 0) return value;
  const lead = value.slice(0, semicolon).trim();
  const tail = value.slice(semicolon + 1).trim();
  if (lead.length > 180 || !transitSignLeadPattern.test(lead) || !/^(?:your|the)\b/iu.test(tail)) return value;
  return `${tail.charAt(0).toUpperCase()}${tail.slice(1)}`;
}

function compactActiveAspect(body: string | null): CompactActiveAspect {
  if (!body?.trim()) return { body: null, dateLabel: null, transitHouse: null, natalLabel: null, natalHouse: null };
  const source = body.trim();
  const date = source.match(activeDatePattern)?.[1] ?? null;
  const frame = source.match(activeFramePattern);
  const remainder = frame ? source.slice(frame[0].length).trim() : source;
  return {
    body: frame ? sentence(stripSharedTransitLead(remainder)) : source,
    dateLabel: date ? `Through ${date}` : null,
    transitHouse: frame?.[1] ?? null,
    natalLabel: frame?.[2] ?? null,
    natalHouse: frame?.[3] ?? null
  };
}

function houseNumber(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function capitalized(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function houseBridge(copy: CompactActiveAspect, heading: string) {
  if (!copy.body || !copy.natalLabel || !copy.natalHouse || !copy.transitHouse) return copy.body;
  const natalHouseNumber = houseNumber(copy.natalHouse);
  const transitHouseNumber = houseNumber(copy.transitHouse);
  const natal = houseFocus[natalHouseNumber];
  const transit = houseFocus[transitHouseNumber];
  if (!natal || !transit) return `Your natal ${copy.natalLabel} is in your ${copy.natalHouse}. ${copy.body}`;
  if (natalHouseNumber === transitHouseNumber) {
    return `Your natal ${copy.natalLabel} is also in your ${copy.natalHouse}, so the emphasis stays on ${natal}. ${copy.body}`;
  }
  const aspect = articleAspectGlyphPartsFromHeading(heading)?.aspect;
  const bridge = aspect === "trine"
    ? `${capitalized(natal)} may be easier to work with alongside ${transit}.`
    : aspect === "sextile"
      ? `A practical change involving ${natal} may make ${transit} easier to handle.`
      : aspect === "square"
        ? `${capitalized(natal)} may put more pressure on ${transit}.`
        : aspect === "opposition"
          ? `${capitalized(natal)} may compete with ${transit} for time, attention, or priority.`
          : `${capitalized(natal)} is tied directly into ${transit} right now.`;
  return `Your natal ${copy.natalLabel} is in your ${copy.natalHouse}. ${bridge} ${copy.body}`;
}

function nodeAxisBody(first: CompactActiveAspect, second: CompactActiveAspect, northAspect: string) {
  if (!first.natalHouse || !second.natalHouse) return [first.body, second.body].filter(Boolean).join(" ") || null;
  const north = houseFocus[houseNumber(first.natalHouse)];
  const south = houseFocus[houseNumber(second.natalHouse)];
  const intro = `Your natal ${first.natalLabel} is in your ${first.natalHouse}, while your ${second.natalLabel} is in your ${second.natalHouse}.`;
  if (!north || !south) return `${intro} ${[first.body, second.body].filter(Boolean).join(" ")}`.trim();
  if (northAspect === "square") {
    return `${intro} The current pressure lands on both ends of the axis: ${north} is what you are learning to develop, while ${south} is what you already know how to do. The decision may need a different balance than the one you usually choose.`;
  }
  if (northAspect === "trine" || northAspect === "sextile") {
    return `${intro} There is a workable opening between ${north} and ${south}. What you already know how to do can support the direction you are still developing instead of competing with it.`;
  }
  if (northAspect === "opposition") {
    return `${intro} ${capitalized(south)} may be especially easy to fall back into, while ${north} is the direction that needs more deliberate room. Familiarity is useful, but it should not make the whole decision for you.`;
  }
  return `${intro} What you are developing now runs through ${north}. ${capitalized(south)} is the side you may already know how to handle. You do not have to reject what you know, but it should not make the whole decision for you.`;
}

export function skyActiveChartEvents(aspects: SkyActiveChartAspect[]): SkyActiveChartEvent[] {
  const used = new Set<number>();
  const events: SkyActiveChartEvent[] = [];

  aspects.forEach((aspect, index) => {
    if (used.has(index)) return;
    const parsed = parsedNodeHeading(aspect.heading);
    const matchIndex = parsed ? aspects.findIndex((candidate, candidateIndex) => {
      if (candidateIndex === index || used.has(candidateIndex)) return false;
      const other = parsedNodeHeading(candidate.heading);
      return Boolean(other && parsed[0] === other[0] && parsed[2] !== other[2] && mirroredNodeAspect(parsed[1], other[1]));
    }) : -1;
    const copy = compactActiveAspect(aspect.body);

    if (matchIndex < 0 || !parsed) {
      events.push({ ...aspect, body: houseBridge(copy, aspect.heading), dateLabel: copy.dateLabel, type: "single", memberKeys: [aspect.key] });
      return;
    }

    used.add(matchIndex);
    const match = aspects[matchIndex];
    const ordered = parsed[2] === "north" ? [aspect, match] : [match, aspect];
    const first = parsed[2] === "north" ? copy : compactActiveAspect(match.body);
    const second = parsed[2] === "north" ? compactActiveAspect(match.body) : copy;
    const northAspect = parsed[2] === "north" ? parsed[1] : parsedNodeHeading(match.heading)?.[1] ?? "conjunction";
    events.push({
      key: `nodal-axis:${ordered.map((member) => member.key).join(":")}`,
      type: "nodal-axis",
      heading: ordered.map((member) => member.heading).join(" · "),
      body: nodeAxisBody(first, second, northAspect),
      dateLabel: first.dateLabel === second.dateLabel ? first.dateLabel : null,
      memberKeys: ordered.map((member) => member.key)
    });
  });

  return events;
}
