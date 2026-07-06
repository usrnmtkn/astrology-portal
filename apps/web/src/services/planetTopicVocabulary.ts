import { getSupabaseClient } from "./auth";

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
  headline: string | null;
  body: string | null;
  sections: unknown;
};

export type PlanetTopicVocabulary = Map<string, PlanetTopicPhrases>;
export type SignStyleVocabulary = Map<string, SignStylePhrases>;
export type SignNeedVocabulary = Map<string, SignNeedPhrases>;

const fallbackSignStyles: Record<string, SignStylePhrases> = {
  aries: { phrase: "direct and initiating", short: "direct initiation" },
  taurus: { phrase: "steady and embodied", short: "steady embodiment" },
  gemini: { phrase: "curious and responsive", short: "curious responsiveness" },
  cancer: { phrase: "protective and intuitive", short: "protective intuition" },
  leo: { phrase: "expressive and visible", short: "expressive visibility" },
  virgo: { phrase: "practical and observant", short: "practical observation" },
  libra: { phrase: "relational and balancing", short: "relational balance" },
  scorpio: { phrase: "private and intense", short: "private intensity" },
  sagittarius: { phrase: "expansive and searching", short: "expansive searching" },
  capricorn: { phrase: "disciplined and consequential", short: "disciplined consequence" },
  aquarius: { phrase: "unconventional and future-minded", short: "future-minded change" },
  pisces: { phrase: "sensitive and imaginative", short: "sensitive imagination" }
};

let cachedVocabulary: PlanetTopicVocabulary | null = null;
let cachedSignStyles: SignStyleVocabulary | null = null;
let cachedSignNeeds: SignNeedVocabulary | null = null;
let loadingVocabulary: Promise<PlanetTopicVocabulary> | null = null;
const warnedFallbacks = new Set<string>();

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
  return typeof value === "string" ? value.trim() : "";
}

function topicFromRow(row: PlanetTopicVocabularyRow): PlanetTopicPhrases | null {
  const sections = row.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    const body = row.body?.trim() ?? "";
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
  const body = row.body?.trim() ?? "";

  if (!you && !friend && !sky && !natal && !body) {
    return null;
  }

  return { you, friend, sky, natal, body };
}

function signStyleFromRow(row: PlanetTopicVocabularyRow): SignStylePhrases | null {
  const sections = row.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    const body = row.body?.trim() ?? "";
    return body ? { phrase: body } : null;
  }

  const record = sections as Record<string, unknown>;
  const style = record.style && typeof record.style === "object" && !Array.isArray(record.style)
    ? record.style as Record<string, unknown>
    : record;
  const phrase = stringField(style, "phrase") || stringField(style, "style") || row.body?.trim() || "";
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
  const phrase = stringField(need, "phrase") || row.body?.trim() || "";
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
      `Sign style vocabulary missing ${reason} for "${sign}"; using code fallback.`
    );
  }
}

function fallbackSignStyle(sign: string) {
  return fallbackSignStyles[normalizedSignId(sign)] ?? { phrase: "the sign's current style", short: "the sign's style" };
}

export function planetTopicContentKey(planet: string) {
  return `vocab/planet-topic/${normalizedPlanetId(planet)}`;
}

export function signStyleContentKey(sign: string) {
  return `vocab/sign-style/${normalizedSignId(sign)}`;
}

export function planetTopicVocabularyFromRows(rows: PlanetTopicVocabularyRow[]) {
  const vocabulary: PlanetTopicVocabulary = new Map();

  for (const row of rows) {
    const planet = row.content_key.replace(/^vocab\/planet-topic\//, "");
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
    if (!row.content_key.startsWith("vocab/sign-style/")) {
      continue;
    }

    const sign = row.content_key.replace(/^vocab\/sign-style\//, "");
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
    if (!row.content_key.startsWith("vocab/sign-need/")) {
      continue;
    }

    const sign = row.content_key.replace(/^vocab\/sign-need\//, "");
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
    ? need?.sky || need?.natal
    : need?.natal;

  if (rowValue) {
    return rowValue;
  }

  warnSignFallback(sign, need ? "field" : "row");

  return "";
}

export function planetTopicPhrase(planet: string, variant: PlanetTopicVariant = "natal") {
  if (!cachedVocabulary) {
    warnTopicMissing(planet, variant, "cache");
    return "";
  }

  return planetTopicPhraseFromVocabulary(cachedVocabulary, planet, variant);
}

export async function loadPlanetTopicVocabulary() {
  if (cachedVocabulary) {
    return cachedVocabulary;
  }

  if (loadingVocabulary) {
    return loadingVocabulary;
  }

  loadingVocabulary = (async () => {
    const supabase = await getSupabaseClient();

    if (!supabase) {
      cachedVocabulary = new Map();
      cachedSignStyles = new Map();
      cachedSignNeeds = new Map();
      return cachedVocabulary;
    }

    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("content_key, headline, body, sections")
      .eq("status", "LIVE")
      .eq("prompt_version", "vocab-v1")
      .like("content_key", "vocab/%")
      .returns<PlanetTopicVocabularyRow[]>();

    if (error) {
      console.warn("Planet topic vocabulary failed to load; topic slots will be blank.", error);
      cachedVocabulary = new Map();
      cachedSignStyles = new Map();
      cachedSignNeeds = new Map();
      return cachedVocabulary;
    }

    cachedVocabulary = planetTopicVocabularyFromRows(data ?? []);
    cachedSignStyles = signStyleVocabularyFromRows(data ?? []);
    cachedSignNeeds = signNeedVocabularyFromRows(data ?? []);
    return cachedVocabulary;
  })();

  return loadingVocabulary;
}
