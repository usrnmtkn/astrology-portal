import { getSupabaseClient } from "./auth";

export type PlanetTopicVariant = "natal" | "sky";

type PlanetTopicPhrases = {
  natal: string;
  sky?: string;
};

type SignStylePhrases = {
  phrase: string;
  short?: string;
};

type PlanetTopicVocabularyRow = {
  content_key: string;
  headline: string | null;
  body: string | null;
  sections: unknown;
};

export type PlanetTopicVocabulary = Map<string, PlanetTopicPhrases>;
export type SignStyleVocabulary = Map<string, SignStylePhrases>;

const fallbackNatalTopics: Record<string, string> = {
  ascendant: "how you meet the world and come across",
  chiron: "where old tenderness, repair, and integration become active",
  jupiter: "where you look for growth, meaning, faith, and a wider view of life",
  mars: "how you act, pursue, defend, and move toward what you want",
  mercury: "how your mind notices, learns, translates, and puts experience into words",
  midheaven: "public role, visibility, direction, and what you are building toward",
  moon: "how your emotional body responds before you have had time to explain yourself",
  neptune: "where you are sensitive, imaginative, porous, and moved by longing",
  pluto: "where you meet intensity, control, honesty, pressure, and deep change",
  saturn: "where you build maturity, boundaries, responsibility, and earned confidence",
  sun: "how you build identity, confidence, vitality, and a sense of direction",
  "true-node": "the developmental direction that keeps asking for growth",
  uranus: "where you need freedom, honesty, disruption, and room to break old patterns",
  venus: "what you value, what you are drawn to, and what helps connection feel real"
};

const fallbackSkyTopics: Record<string, string> = {
  ascendant: "how the moment meets the world and becomes visible",
  chiron: "tenderness, repair, and old patterns asking for care",
  jupiter: "growth, opportunity, and perspective",
  mars: "energy, conflict, and momentum",
  mercury: "thinking, communication, and decisions",
  midheaven: "visibility, direction, and public momentum",
  moon: "the emotional tone",
  neptune: "imagination, longing, and uncertainty",
  pluto: "power, pressure, and deep change",
  saturn: "limits, responsibility, and structure",
  sun: "attention, vitality, and the tone of the season",
  "true-node": "the directional pull of the moment",
  uranus: "change, disruption, and new patterns",
  venus: "connection, pleasure, money, and desire"
};

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

function topicFromSections(sections: unknown): PlanetTopicPhrases | null {
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return null;
  }

  const record = sections as Record<string, unknown>;
  const topic = record.topic;
  const topicRecord = topic && typeof topic === "object" && !Array.isArray(topic)
    ? topic as Record<string, unknown>
    : record;
  const natal = stringField(topicRecord, "natal");
  const sky = stringField(topicRecord, "sky");

  if (!natal) {
    return null;
  }

  return sky && sky !== natal ? { natal, sky } : { natal };
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

function warnFallback(planet: string, variant: PlanetTopicVariant, reason: string) {
  const warningKey = `${variant}:${normalizedPlanetId(planet)}:${reason}`;

  if (!warnedFallbacks.has(warningKey)) {
    warnedFallbacks.add(warningKey);
    console.warn(
      `Planet topic vocabulary missing ${reason} for "${planet}" (${variant}); using code fallback.`
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

function fallbackPlanetTopicPhrase(planet: string, variant: PlanetTopicVariant) {
  const planetId = normalizedPlanetId(planet);

  return variant === "sky"
    ? fallbackSkyTopics[planetId] ?? fallbackNatalTopics[planetId] ?? ""
    : fallbackNatalTopics[planetId] ?? "";
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
    const topic = topicFromSections(row.sections);

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

export function planetTopicPhraseFromVocabulary(
  vocabulary: PlanetTopicVocabulary | null,
  planet: string,
  variant: PlanetTopicVariant = "natal"
) {
  const planetId = normalizedPlanetId(planet);
  const topic = vocabulary?.get(planetId);
  const rowValue = variant === "sky"
    ? topic?.sky || topic?.natal
    : topic?.natal;

  if (rowValue) {
    return rowValue;
  }

  warnFallback(planet, variant, topic ? "field" : "row");

  return fallbackPlanetTopicPhrase(planet, variant);
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

export function planetTopicPhrase(planet: string, variant: PlanetTopicVariant = "natal") {
  if (!cachedVocabulary) {
    return fallbackPlanetTopicPhrase(planet, variant);
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
      console.warn("Planet topic vocabulary failed to load; code fallbacks will be used.", error);
      cachedVocabulary = new Map();
      cachedSignStyles = new Map();
      return cachedVocabulary;
    }

    cachedVocabulary = planetTopicVocabularyFromRows(data ?? []);
    cachedSignStyles = signStyleVocabularyFromRows(data ?? []);
    return cachedVocabulary;
  })();

  return loadingVocabulary;
}
