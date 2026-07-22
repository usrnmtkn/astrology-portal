import fallbackSourceRowsV3 from "./source-rows/fallback-source-rows-v3.json";

type FallbackV3VocabularyRow = {
  body?: string | null;
  contentKey?: string;
  content_key?: string;
  content_role?: string | null;
  review_status?: string | null;
};

const READER_ELIGIBLE_STATUSES = new Set(["approved", "approved_reuse", "reviewed"]);

const SIGN_RULERS: Record<string, string> = {
  aries: "Mars",
  taurus: "Venus",
  gemini: "Mercury",
  cancer: "Moon",
  leo: "Sun",
  virgo: "Mercury",
  libra: "Venus",
  scorpio: "Mars",
  sagittarius: "Jupiter",
  capricorn: "Saturn",
  aquarius: "Saturn",
  pisces: "Jupiter"
};

function normalizeVocabularyId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized === "true-node") return "north-node";
  if (normalized === "conjunct") return "conjunction";

  return normalized;
}

function vocabularyRows(): FallbackV3VocabularyRow[] {
  const rows = fallbackSourceRowsV3 as { vocabularyRows?: FallbackV3VocabularyRow[] };
  return rows.vocabularyRows ?? [];
}

function packageVocabularyBody(prefix: string, rawId: string) {
  const id = normalizeVocabularyId(rawId);
  const contentKey = `${prefix}/${id}`;
  const row = vocabularyRows().find((candidate) => {
    const key = candidate.contentKey ?? candidate.content_key;
    return key === contentKey
      && candidate.content_role === "vocabulary"
      && READER_ELIGIBLE_STATUSES.has(candidate.review_status ?? "");
  });
  const body = row?.body?.trim();

  return body ?? "";
}

export function fallbackV3PlanetTopic(point: string) {
  return packageVocabularyBody("fallback-vocab/planet-topic", point)
    || packageVocabularyBody("fallback-vocab/angle-function", point);
}

export function fallbackV3SignStyle(sign: string) {
  return packageVocabularyBody("fallback-vocab/sign-style", sign);
}

export function fallbackV3HouseTopic(house?: number | string | null) {
  const raw = String(house ?? "").trim();
  const match = raw.match(/\d+/);

  return match ? packageVocabularyBody("fallback-vocab/house-topic", match[0]) : "";
}

export function fallbackV3AspectFeel(aspect: string) {
  return packageVocabularyBody("fallback-vocab/aspect-feel", aspect)
    || packageVocabularyBody("fallback-vocab/aspect-adj", aspect);
}

export function fallbackV3SignRuler(sign: string) {
  return SIGN_RULERS[normalizeVocabularyId(sign)] ?? "";
}
