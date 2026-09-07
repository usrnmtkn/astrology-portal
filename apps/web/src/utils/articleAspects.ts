import { normalizeAspectType } from "../components/charts/chartAssets";
import { aspectGiftOrLesson } from "../services/aspectGiftLesson";

export type ArticleAspectToneBucket = "gifts" | "lessons";

const aspectTypePattern = /\b(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\b/i;
const nodeAxisBodyPattern = /^(North|South) Node \((conjunction|sextile|square|trine|opposition)\):\s*([\s\S]+)$/u;

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

export function articleNodeAxisBodyParts(heading: string, paragraphs: string[]) {
  if (!/\bNorth Node\b/iu.test(heading) || paragraphs.length < 2) {
    return null;
  }

  const north = paragraphs[0]?.match(nodeAxisBodyPattern);
  const southIndex = paragraphs.findIndex((paragraph, index) => index > 0 && /^South Node \(/u.test(paragraph));
  const south = southIndex > 0 ? paragraphs[southIndex]?.match(nodeAxisBodyPattern) : null;

  if (!north || north[1] !== "North" || !south || south[1] !== "South") {
    return null;
  }

  const southAspect = south[2];
  const southAspectLabel = `${southAspect.charAt(0).toUpperCase()}${southAspect.slice(1)}`;
  const southHeading = heading
    .replace(aspectTypePattern, southAspectLabel)
    .replace(/\bNorth Node\b/iu, "South Node");

  return {
    primaryParagraphs: [north[3].trim(), ...paragraphs.slice(1, southIndex)].filter(Boolean),
    southHeading,
    southParagraphs: [south[3].trim(), ...paragraphs.slice(southIndex + 1)].filter(Boolean)
  };
}
