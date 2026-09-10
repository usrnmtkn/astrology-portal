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
