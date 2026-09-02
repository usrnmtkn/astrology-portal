import { loadLiveGeneratedContentForSurfaces } from "./generatedContent";
import { fallbackV3PlanetTopic, fallbackV3SignStyle } from "../content/fallbackArchitectureV3Runtime";
import { firstReaderFacingCopy } from "../content/readerSafety";

export type PlanetTopicVariant = "you" | "friend" | "sky" | "natal";

type PlanetTopicPhrases = {
  you?: string;
  friend?: string;
  natal?: string;
  sky?: string;
  body?: string;
};

type SignStylePhrases = {
  phrase: string;
  short?: string;
};

type SignNeedPhrases = {
  natal: string;
  sky?: string;
};

type PlanetTopicVocabularyRow = {
  content_key: string;
  body: string | null;
  sections: unknown;
};

export type PlanetTopicVocabulary = Map<string, PlanetTopicPhrases>;
export type SignStyleVocabulary = Map<string, SignStylePhrases>;
export type SignNeedVocabulary = Map<string, SignNeedPhrases>;

const natalLanguagePattern = /\b(you|your|yours|yourself|a person|someone|birth chart|natal|meant to|grow through|growth edge)\b/i;
const fallbackVocabPrefix = "fallback-vocab";

let cachedVocabulary: PlanetTopicVocabulary | null = null;
let cachedSignStyles: SignStyleVocabulary | null = null;
let cachedSignNeeds: SignNeedVocabulary | null = null;
let loadingVocabulary: Promise<PlanetTopicVocabulary> | null = null;
const warnedFallbacks = new Set<string>();

export function clearPlanetTopicVocabularyCache() {
  cachedVocabulary = null;
  cachedSignStyles = null;
  cachedSignNeeds = null;
  loadingVocabulary = null;
}

function normalizedPlanetId(planet: string) {
  const normalized = planet
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized === "north-node") {
    return "true-node";
  }

  return normalized;
}

function normalizedSignId(sign: string) {
  return sign
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return firstReaderFacingCopy([typeof value === "string" ? value : null]) ?? "";
}

function topicFromRow(row: PlanetTopicVocabularyRow): PlanetTopicPhrases | null {
  const sections = row.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    const body = firstReaderFacingCopy([row.body]) ?? "";
    return body ? { body } : null;
  }

  const record = sections as Record<string, unknown>;
  const topic = record.topic;
  const topicRecord = topic && typeof topic === "object" && !Array.isArray(topic)
    ? topic as Record<string, unknown>
    : record;
  const you = stringField(topicRecord, "you");
  const friend = stringField(topicRecord, "friend");
  const natal = stringField(topicRecord, "natal");
  const sky = stringField(topicRecord, "sky");
  const body = firstReaderFacingCopy([row.body]) ?? "";

  if (!you && !friend && !sky && !natal && !body) {
    return null;
  }

  return { you, friend, sky, natal, body };
}

function signStyleFromRow(row: PlanetTopicVocabularyRow): SignStylePhrases | null {
  const sections = row.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    const body = firstReaderFacingCopy([row.body]) ?? "";
    return body ? { phrase: body } : null;
  }

  const record = sections as Record<string, unknown>;
  const style = record.style && typeof record.style === "object" && !Array.isArray(record.style)
    ? record.style as Record<string, unknown>
    : record;
  const phrase = stringField(style, "phrase") || stringField(style, "style") || firstReaderFacingCopy([row.body]) || "";
  const short = stringField(style, "short") || stringField(style, "summary");

  if (!phrase) {
    return null;
  }

  return short && short !== phrase ? { phrase, short } : { phrase };
}

function signNeedFromRow(row: PlanetTopicVocabularyRow): SignNeedPhrases | null {
  const sections = row.sections && typeof row.sections === "object" && !Array.isArray(row.sections)
    ? row.sections as Record<string, unknown>
    : {};
  const need = sections.need && typeof sections.need === "object" && !Array.isArray(sections.need)
    ? sections.need as Record<string, unknown>
    : {};
  const phrase = stringField(need, "phrase") || firstReaderFacingCopy([row.body]) || "";
  const natal = stringField(need, "natal") || phrase;
  const sky = stringField(need, "sky") || natal;

  if (!natal) {
    return null;
  }

  return sky && sky !== natal ? { natal, sky } : { natal };
}

function warnTopicMissing(planet: string, variant: PlanetTopicVariant, reason: string) {
  const warningKey = `topic:${variant}:${normalizedPlanetId(planet)}:${reason}`;

  if (!warnedFallbacks.has(warningKey)) {
    warnedFallbacks.add(warningKey);
    console.warn(
      `Planet topic vocabulary missing ${reason} for "${planet}" (${variant}); leaving topic slot blank.`
    );
  }
}

function warnSignFallback(sign: string, reason: string) {
  const warningKey = `sign:${normalizedSignId(sign)}:${reason}`;

  if (!warnedFallbacks.has(warningKey)) {
    warnedFallbacks.add(warningKey);
    console.warn(
      `Sign style vocabulary missing ${reason} for "${sign}"; using package source vocabulary.`
    );
  }
}

function fallbackSignStyle(sign: string): SignStylePhrases {
  return { phrase: fallbackV3SignStyle(sign) };
}

function fallbackSkyPlanetTopic(planet: string) {
  return fallbackV3PlanetTopic(planet);
}

function skyTopicValue(topic: PlanetTopicPhrases | undefined, planet: string) {
  const sky = topic?.sky?.trim() ?? "";
  const body = topic?.body?.trim() ?? "";

  if (sky && !natalLanguagePattern.test(sky)) {
    return sky;
  }

  if (!sky && body && !natalLanguagePattern.test(body)) {
    return body;
  }

  if (sky) {
    warnTopicMissing(planet, "sky", "sky field contains natal language");
  } else {
    warnTopicMissing(planet, "sky", topic ? "field" : "row");
  }

  return fallbackSkyPlanetTopic(planet);
}

export function planetTopicContentKey(planet: string) {
  return `${fallbackVocabPrefix}/planet-topic/${normalizedPlanetId(planet)}`;
}

export function signStyleContentKey(sign: string) {
  return `${fallbackVocabPrefix}/sign-style/${normalizedSignId(sign)}`;
}

export function planetTopicVocabularyFromRows(rows: PlanetTopicVocabularyRow[]) {
  const vocabulary: PlanetTopicVocabulary = new Map();

  for (const row of rows) {
    const match = row.content_key.match(/^fallback-vocab\/planet-topic\/(.+)$/)
      ?? row.content_key.match(/^cc\/planet\/(.+)\/function$/);

    if (!match) {
      continue;
    }

    const [, planet] = match;
    const topic = topicFromRow(row);

    if (planet && topic) {
      vocabulary.set(planet, topic);
    }
  }

  return vocabulary;
}

export function signStyleVocabularyFromRows(rows: PlanetTopicVocabularyRow[]) {
  const vocabulary: SignStyleVocabulary = new Map();

  for (const row of rows) {
    const match = row.content_key.match(/^fallback-vocab\/sign-style\/(.+)$/)
      ?? row.content_key.match(/^cc\/sign\/(.+)\/lived-behaviors$/);

    if (!match) {
      continue;
    }

    const [, sign] = match;
    const style = signStyleFromRow(row);

    if (sign && style) {
      vocabulary.set(sign, style);
    }
  }

  return vocabulary;
}

export function signNeedVocabularyFromRows(rows: PlanetTopicVocabularyRow[]) {
  const vocabulary: SignNeedVocabulary = new Map();

  for (const row of rows) {
    const match = row.content_key.match(/^fallback-vocab\/sign-need\/(.+)$/)
      ?? row.content_key.match(/^cc\/sign\/(.+)\/actions$/);

    if (!match) {
      continue;
    }

    const [, sign] = match;
    const need = signNeedFromRow(row);

    if (sign && need) {
      vocabulary.set(sign, need);
    }
  }

  return vocabulary;
}

export function planetTopicPhraseFromVocabulary(
  vocabulary: PlanetTopicVocabulary | null,
  planet: string,
  variant: PlanetTopicVariant = "natal"
) {
  const planetId = normalizedPlanetId(planet);
  const topic = vocabulary?.get(planetId);

  if (variant === "sky") {
    return skyTopicValue(topic, planet);
  }

  const rowValue = topic?.[variant] || topic?.natal || topic?.body || "";

  if (rowValue) {
    return rowValue;
  }

  warnTopicMissing(planet, variant, topic ? "field" : "row");
  return "";
}

export function signStylePhrase(sign: string) {
  const signId = normalizedSignId(sign);
  const style = cachedSignStyles?.get(signId);

  if (style?.phrase) {
    return style.phrase;
  }

  warnSignFallback(sign, style ? "field" : "row");

  return fallbackSignStyle(sign).phrase;
}

export function signStyleShortPhrase(sign: string) {
  const signId = normalizedSignId(sign);
  const style = cachedSignStyles?.get(signId);

  if (style?.short || style?.phrase) {
    return style.short || style.phrase;
  }

  warnSignFallback(sign, "row");

  const fallback = fallbackSignStyle(sign);
  return fallback.short || fallback.phrase;
}

export function signNeedPhrase(sign: string, variant: PlanetTopicVariant = "natal") {
  const signId = normalizedSignId(sign);
  const need = cachedSignNeeds?.get(signId);
  const rowValue = variant === "sky"
    ? need?.sky
    : need?.natal;

  if (rowValue) {
    return rowValue;
  }

  warnSignFallback(sign, need ? "field" : "row");

  return "";
}

export function planetTopicPhrase(planet: string, variant: PlanetTopicVariant = "natal") {
  if (!cachedVocabulary) {
    if (variant === "sky") {
      return fallbackSkyPlanetTopic(planet);
    }

    warnTopicMissing(planet, variant, "cache");
    return "";
  }

  return planetTopicPhraseFromVocabulary(cachedVocabulary, planet, variant);
}

function hydratePlanetTopicVocabularyRows(rows: PlanetTopicVocabularyRow[]) {
  cachedVocabulary = planetTopicVocabularyFromRows(rows);
  cachedSignStyles = signStyleVocabularyFromRows(rows);
  cachedSignNeeds = signNeedVocabularyFromRows(rows);
  return cachedVocabulary;
}

export async function loadPlanetTopicVocabulary() {
  if (loadingVocabulary) return loadingVocabulary;
  loadingVocabulary = (async () => {
    const rows = [...(await loadLiveGeneratedContentForSurfaces(["modifier"])).values()]
      .filter((row) => row.contentKey.startsWith("fallback-vocab/")
        || row.contentKey.startsWith("cc/planet/")
        || row.contentKey.startsWith("cc/sign/"))
      .map((row) => ({ content_key: row.contentKey, body: row.body, sections: row.sections }));
    return hydratePlanetTopicVocabularyRows(rows);
  })();
  try {
    return await loadingVocabulary;
  } finally {
    loadingVocabulary = null;
  }
}
