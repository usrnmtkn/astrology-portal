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

  // Ownership belongs in the displayed title, not in the point glyph lookup.
  const point = (label: string) => label.trim().replace(/^(?:your|their)\s+|^.+?['’]s\s+/iu, "");
  return {
    from: point(match[1]),
    aspect: articleAspectGlyphTypeFromText(match[2]),
    to: point(match[3])
  };
}

export type SkyActiveChartAspect = { key: string; heading: string; body: string | null };
export type SkyActiveChartEvent = { key: string; heading: string; members: SkyActiveChartAspect[] };

// Group only mirrored contacts to the same natal node axis. Original passages,
// keys and order are retained; grouping never composes or shortens reader copy.
export function skyActiveChartEvents(aspects: SkyActiveChartAspect[]): SkyActiveChartEvent[] {
  const node = (heading: string) => heading.trim().match(/^(.+?)\s+(conjunction|conjunct|opposition|opposite|square|trine|sextile)\s+(?:your\s+)?(?:natal\s+)?(north|south)\s+node$/iu);
  const normalize = (value: string) => value.toLowerCase().replace(/^conjunct$/, "conjunction").replace(/^opposite$/, "opposition");
  const mirror: Record<string, string> = { conjunction: "opposition", opposition: "conjunction", square: "square", trine: "sextile", sextile: "trine" };
  const used = new Set<number>();
  return aspects.flatMap((aspect, index) => {
    if (used.has(index)) return [];
    const first = node(aspect.heading);
    const match = first ? aspects.findIndex((candidate, otherIndex) => {
      if (otherIndex <= index || used.has(otherIndex)) return false;
      const second = node(candidate.heading);
      return second && first[1].toLowerCase() === second[1].toLowerCase()
        && first[3].toLowerCase() !== second[3].toLowerCase()
        && mirror[normalize(first[2])] === normalize(second[2]);
    }) : -1;
    if (match < 0) return [{ key: aspect.key, heading: aspect.heading, members: [aspect] }];
    used.add(match);
    const second = aspects[match];
    return [{ key: `${aspect.key}:${second.key}`, heading: `${aspect.heading} · ${second.heading}`, members: [aspect, second] }];
  });
}
