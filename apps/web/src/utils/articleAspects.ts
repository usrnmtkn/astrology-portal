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

  if (normalized === "conjunct") {
    return "conjunction";
  }

  if (normalized === "opposite") {
    return "opposition";
  }

  return normalized;
}

export function articleAspectGlyphPartsFromHeading(heading: string) {
  const match = heading.match(/^\s*(.+?)\s+(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\s+(.+?)\s*$/iu);

  if (!match) {
    return null;
  }

  return {
    from: match[1].trim(),
    aspect: articleAspectGlyphTypeFromText(match[2]),
    to: match[3].trim()
  };
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
  natalLabel: string | null;
  natalHouse: string | null;
};

type NodeHeading = [string, string, "north" | "south"];
const nodePattern = /^(.+?)\s+(conjunction|conjunct|opposition|opposite|square|trine|sextile)\s+(?:your\s+)?(?:natal\s+)?(north|south)\s+node$/iu;
const activeDatePattern = /\b(?:until|through)\s+([A-Z][a-z]+\s+\d{1,2}(?:,\s+\d{4})?)/u;
const activeFramePattern = /^While\s+.+?\s+your\s+natal\s+(.+?)\s+in\s+your\s+(\d+(?:st|nd|rd|th)\s+house)(?:\s+(?:until|through)\s+[^.]+)?\.\s*/iu;
const transitSignLeadPattern = /^(?:The\s+)?[A-Za-z]+(?:\s+[A-Za-z]+){0,2}\s+in\s+[A-Z][a-z]+\b/u;

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

function stripSharedTransitLead(value: string) {
  const semicolon = value.indexOf(";");
  if (semicolon < 0) return value;

  const lead = value.slice(0, semicolon).trim();
  const tail = value.slice(semicolon + 1).trim();
  if (
    lead.length > 180
    || !transitSignLeadPattern.test(lead)
    || !/^(?:your|the)\b/iu.test(tail)
  ) {
    return value;
  }

  return `${tail.charAt(0).toUpperCase()}${tail.slice(1)}`;
}

function compactActiveAspect(body: string | null): CompactActiveAspect {
  if (!body?.trim()) {
    return { body: null, dateLabel: null, natalLabel: null, natalHouse: null };
  }

  const source = body.trim();
  const date = source.match(activeDatePattern)?.[1] ?? null;
  const frame = source.match(activeFramePattern);
  const remainder = frame ? source.slice(frame[0].length).trim() : source;

  return {
    body: frame ? stripSharedTransitLead(remainder) : source,
    dateLabel: date ? `Through ${date}` : null,
    natalLabel: frame?.[1] ?? null,
    natalHouse: frame?.[2] ?? null
  };
}

function withNatalHouse(copy: CompactActiveAspect) {
  if (!copy.body) return null;
  return copy.natalLabel && copy.natalHouse
    ? `Your natal ${copy.natalLabel} is in your ${copy.natalHouse}. ${copy.body}`
    : copy.body;
}

function combineActiveNodeBodies(first: CompactActiveAspect, second: CompactActiveAspect) {
  const intro = first.natalLabel && first.natalHouse && second.natalLabel && second.natalHouse
    ? `Your natal ${first.natalLabel} is in your ${first.natalHouse}, while your ${second.natalLabel} is in your ${second.natalHouse}.`
    : null;
  const secondBody = second.body && second.body !== first.body ? second.body : null;
  return [intro, first.body, secondBody].filter(Boolean).join(" ") || null;
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
      events.push({
        ...aspect,
        body: withNatalHouse(copy),
        dateLabel: copy.dateLabel,
        type: "single",
        memberKeys: [aspect.key]
      });
      return;
    }

    used.add(matchIndex);
    const match = aspects[matchIndex];
    const ordered = parsed[2] === "north" ? [aspect, match] : [match, aspect];
    const first = parsed[2] === "north" ? copy : compactActiveAspect(match.body);
    const second = parsed[2] === "north" ? compactActiveAspect(match.body) : copy;
    events.push({
      key: `nodal-axis:${ordered.map((member) => member.key).join(":")}`,
      type: "nodal-axis",
      heading: ordered.map((member) => member.heading).join(" · "),
      body: combineActiveNodeBodies(first, second),
      dateLabel: first.dateLabel === second.dateLabel ? first.dateLabel : null,
      memberKeys: ordered.map((member) => member.key)
    });
  });

  return events;
}
