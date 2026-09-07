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

export type SkyActiveChartAspect = {
  key: string;
  heading: string;
  body: string | null;
};

export type SkyActiveChartEvent = {
  key: string;
  type: "single" | "nodal-axis";
  heading: string;
  body: string | null;
  dateLabel: string | null;
  memberKeys: string[];
};

type NodeHeading = [transit: string, aspect: string, node: "north" | "south"];
const nodePattern = /^(.+?)\s+(conjunction|conjunct|opposition|opposite|square|trine|sextile)\s+(?:your\s+)?(?:natal\s+)?(north|south)\s+node$/iu;
const activeDatePattern = /\b(?:until|through)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?)/iu;
const activeFramePattern = /^While\s+.+?\s+(?:is\s+in|moves\s+through)\s+your\s+\d+(?:st|nd|rd|th)\s+house,\s+it\s+is\s+also\s+.*?[.!?]\s*/iu;

function parsedNodeHeading(heading: string): NodeHeading | null {
  const match = heading.trim().match(nodePattern);
  if (!match) return null;
  const raw = match[2].toLowerCase();
  return [
    match[1].trim().toLowerCase(),
    raw === "conjunct" ? "conjunction" : raw === "opposite" ? "opposition" : raw,
    match[3].toLowerCase() as "north" | "south"
  ];
}

function mirroredNodeAspect(first: string, second: string) {
  return first === second && first === "square"
    || first === "conjunction" && second === "opposition"
    || first === "opposition" && second === "conjunction"
    || first === "trine" && second === "sextile"
    || first === "sextile" && second === "trine";
}

function compactActiveAspect(body: string | null) {
  if (!body?.trim()) return { body: null, dateLabel: null };
  const source = body.trim();
  const date = source.match(activeDatePattern)?.[1] ?? null;
  const shortened = source.replace(activeFramePattern, "").trim();
  return { body: shortened || source, dateLabel: date ? `Through ${date}` : null };
}

function combineActiveNodeBodies(first: string | null, second: string | null) {
  if (!first) return second;
  if (!second || first === second) return first;
  const firstBreak = first.indexOf(";");
  const secondBreak = second.indexOf(";");
  if (firstBreak > 0 && secondBreak > 0 && first.slice(0, firstBreak) === second.slice(0, secondBreak)) {
    return `${first.slice(0, firstBreak)}. ${first.slice(firstBreak + 1).trim()}\n\n${second.slice(secondBreak + 1).trim()}`;
  }
  return `${first}\n\n${second}`;
}

function singleActiveChartEvent(aspect: SkyActiveChartAspect): SkyActiveChartEvent {
  const copy = compactActiveAspect(aspect.body);
  return { key: aspect.key, type: "single", heading: aspect.heading, ...copy, memberKeys: [aspect.key] };
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

    if (matchIndex < 0 || !parsed) {
      events.push(singleActiveChartEvent(aspect));
      return;
    }

    used.add(matchIndex);
    const match = aspects[matchIndex];
    const ordered = parsed[2] === "north" ? [aspect, match] : [match, aspect];
    const first = compactActiveAspect(ordered[0].body);
    const second = compactActiveAspect(ordered[1].body);
    events.push({
      key: `nodal-axis:${ordered.map((member) => member.key).join(":")}`,
      type: "nodal-axis",
      heading: ordered.map((member) => member.heading).join(" · "),
      body: combineActiveNodeBodies(first.body, second.body),
      dateLabel: first.dateLabel === second.dateLabel ? first.dateLabel : null,
      memberKeys: ordered.map((member) => member.key)
    });
  });

  return events;
}
