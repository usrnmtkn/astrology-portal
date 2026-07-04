import { getSupabaseClient } from "./auth";

export type PlanetTopicVariant = "natal" | "sky";

type PlanetTopicPhrases = {
  natal: string;
  sky?: string;
};

type PlanetTopicVocabularyRow = {
  content_key: string;
  sections: unknown;
};

export type PlanetTopicVocabulary = Map<string, PlanetTopicPhrases>;

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

let cachedVocabulary: PlanetTopicVocabulary | null = null;
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

function warnFallback(planet: string, variant: PlanetTopicVariant, reason: string) {
  const warningKey = `${variant}:${normalizedPlanetId(planet)}:${reason}`;

  if (!warnedFallbacks.has(warningKey)) {
    warnedFallbacks.add(warningKey);
    console.warn(
      `Planet topic vocabulary missing ${reason} for "${planet}" (${variant}); using code fallback.`
    );
  }
}

function fallbackPlanetTopicPhrase(planet: string, variant: PlanetTopicVariant) {
  const planetId = normalizedPlanetId(planet);

  return variant === "sky"
    ? fallbackSkyTopics[planetId] ?? fallbackNatalTopics[planetId] ?? "how this part of the moment becomes active"
    : fallbackNatalTopics[planetId] ?? "how this part of you becomes active";
}

export function planetTopicContentKey(planet: string) {
  return `vocab/planet-topic/${normalizedPlanetId(planet)}`;
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
      return cachedVocabulary;
    }

    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("content_key, sections")
      .eq("status", "LIVE")
      .eq("prompt_version", "vocab-v1")
      .like("content_key", "vocab/planet-topic/%")
      .returns<PlanetTopicVocabularyRow[]>();

    if (error) {
      console.warn("Planet topic vocabulary failed to load; code fallbacks will be used.", error);
      cachedVocabulary = new Map();
      return cachedVocabulary;
    }

    cachedVocabulary = planetTopicVocabularyFromRows(data ?? []);
    return cachedVocabulary;
  })();

  return loadingVocabulary;
}
