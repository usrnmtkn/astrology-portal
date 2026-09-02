import { loadLiveGeneratedContentForKeys } from "./generatedContent";
import { firstReaderFacingCopy } from "../content/readerSafety";

export const natalCardTaglinePoints = [
  "Sun",
  "Moon",
  "Ascendant",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith"
] as const;

export const fallbackNatalCardTaglines: Record<string, string> = {
  Sun: "Your core self and vitality",
  Moon: "Your inner world and what you need to feel safe",
  Ascendant: "How you meet the world and enter the room",
  Mercury: "How you think and communicate",
  Venus: "What you value and who you're drawn to",
  Mars: "How you direct your energy and act",
  Jupiter: "Where you grow and reach for more",
  Saturn: "What you commit to and build",
  Uranus: "Where you break the pattern",
  Neptune: "Where you dream and idealize",
  Pluto: "Where you transform and reclaim power",
  Chiron: "Where old tenderness asks for care",
  Lilith: "Where the untamed part of you refuses to be managed"
};

type NatalCardTaglineRow = {
  content_key: string;
  body: string | null;
  sections: unknown;
};

let cachedTaglines: Map<string, string> | null = null;
let loadingTaglines: Promise<Map<string, string>> | null = null;

export function clearNatalCardTaglineCache() {
  cachedTaglines = null;
  loadingTaglines = null;
}

export function normalizedNatalCardTaglinePoint(point: string) {
  return point
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function natalCardTaglineContentKey(point: string) {
  return `vocab/natal-card-tagline/${normalizedNatalCardTaglinePoint(point)}`;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function taglineFromSections(sections: unknown) {
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return "";
  }

  const record = sections as Record<string, unknown>;
  const tagline = record.tagline;
  const taglineRecord = tagline && typeof tagline === "object" && !Array.isArray(tagline)
    ? tagline as Record<string, unknown>
    : record;

  return stringField(taglineRecord, "natal") || stringField(taglineRecord, "text");
}

function fallbackNatalCardTagline(point: string) {
  return fallbackNatalCardTaglines[point] ?? fallbackNatalCardTaglines[point.trim()] ?? "";
}

export function natalCardTaglinesFromRows(rows: NatalCardTaglineRow[]) {
  const taglines = new Map<string, string>();

  for (const row of rows) {
    if (!row.content_key.startsWith("vocab/natal-card-tagline/")) {
      continue;
    }

    const point = row.content_key.replace(/^vocab\/natal-card-tagline\//, "");
    const value = firstReaderFacingCopy([
      taglineFromSections(row.sections),
      row.body
    ]) || "";

    if (point && value) {
      taglines.set(point, value);
    }
  }

  return taglines;
}

export function natalCardTagline(point: string) {
  const pointId = normalizedNatalCardTaglinePoint(point);

  return cachedTaglines?.get(pointId) || fallbackNatalCardTagline(point);
}

export async function loadNatalCardTaglines() {
  if (loadingTaglines) return loadingTaglines;
  loadingTaglines = (async () => {
    const content = await loadLiveGeneratedContentForKeys(natalCardTaglinePoints.map(natalCardTaglineContentKey));
    cachedTaglines = natalCardTaglinesFromRows([...content.values()].map((row) => ({
      content_key: row.contentKey, body: row.body, sections: row.sections
    })));
    return cachedTaglines;
  })();
  try {
    return await loadingTaglines;
  } finally {
    loadingTaglines = null;
  }
}
