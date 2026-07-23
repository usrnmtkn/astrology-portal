import type { PlanetPosition, SkySnapshot } from "../types";
import { fallbackV3HookBody, fallbackV3VocabularyBody } from "../content/fallbackArchitectureV3Runtime";

export type CareerVocabularyRow = {
  contentKey: string;
  headline: string;
  body: string;
};

export type CareerProseLayer = "authored" | "fallback";

export type CareerArchetypeSection = {
  key: string;
  label: string;
  contentKey: string;
  headline: string;
  body: string;
  meta: string;
  layer: CareerProseLayer;
  tier: string;
  sourceKeys: string[];
};

export type CareerArchetypeProfile = {
  title: string;
  summary: string;
  tldr: string;
  factors: Array<{ label: string; value: string }>;
  sections: CareerArchetypeSection[];
};

type CareerArchetypeOptions = {
  ownerName?: string;
  pronouns?: {
    subject?: string;
    object?: string;
    possessive?: string;
    reflexive?: string;
  };
};

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const cardinalSigns = new Set(["Aries", "Cancer", "Libra", "Capricorn"]);
const fixedSigns = new Set(["Taurus", "Leo", "Scorpio", "Aquarius"]);

function slug(value: string | number) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function signAtWholeSignHouse(ascendant: string, house: number) {
  const index = signs.indexOf(ascendant);
  return index < 0 ? "" : signs[(index + house - 1) % signs.length] ?? "";
}

function modeForSign(sign: string) {
  return cardinalSigns.has(sign) ? "cardinal" : fixedSigns.has(sign) ? "fixed" : signs.includes(sign) ? "mutable" : "";
}

function strongestHemisphere(positions: PlanetPosition[]) {
  const visible = positions.filter((position) => typeof position.house === "number" && position.house >= 1 && position.house <= 12);
  const scores = [
    { key: "north", score: visible.filter((position) => position.house! <= 6).length },
    { key: "south", score: visible.filter((position) => position.house! >= 7).length },
    { key: "east", score: visible.filter((position) => position.house! >= 10 || position.house! <= 3).length },
    { key: "west", score: visible.filter((position) => position.house! >= 4 && position.house! <= 9).length }
  ].sort((a, b) => b.score - a.score);
  return scores[0]?.score > (scores[1]?.score ?? 0) ? scores[0].key : "";
}

function packageRow(contentKey: string, kind: "hook" | "vocab"): CareerVocabularyRow | null {
  const body = kind === "hook" ? fallbackV3HookBody(contentKey) : fallbackV3VocabularyBody(contentKey);
  return body ? { contentKey, headline: contentKey.split("/").at(-1) ?? contentKey, body } : null;
}

function packageCareerRows() {
  const rows: CareerVocabularyRow[] = [];
  for (const sign of signs) {
    const key = slug(sign);
    for (const [prefix, kind] of [["career-sign-tone", "vocab"], ["career-sign-essence", "hook"]] as const) {
      const row = packageRow(`fallback-${kind}/${prefix}/${key}`, kind);
      if (row) rows.push(row);
    }
  }
  for (let house = 1; house <= 12; house += 1) {
    const row = packageRow(`fallback-vocab/career-house-theme/${house}`, "vocab");
    if (row) rows.push(row);
  }
  for (const planet of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]) {
    for (const [prefix, kind] of [["career-planet-tenth", "hook"], ["career-planet-tenth-tldr", "vocab"]] as const) {
      const row = packageRow(`fallback-${kind}/${prefix}/${planet}`, kind);
      if (row) rows.push(row);
    }
  }
  for (const mode of ["cardinal", "fixed", "mutable"]) {
    const row = packageRow(`fallback-hook/career-node-mode/${mode}`, "hook");
    if (row) rows.push(row);
  }
  for (const hemisphere of ["north", "south", "east", "west"]) {
    const row = packageRow(`fallback-hook/career-hemisphere/${hemisphere}`, "hook");
    if (row) rows.push(row);
  }
  return rows;
}

const packageVocabulary = new Map(packageCareerRows().map((row) => [row.contentKey, row]));

export async function loadCareerVocabulary() {
  return packageVocabulary;
}

function row(key: string) {
  return packageVocabulary.get(key) ?? null;
}

export function resolveCareerArchetypeProfile(
  sky: SkySnapshot | null | undefined,
  _vocabulary: Map<string, CareerVocabularyRow> | null = packageVocabulary,
  options: CareerArchetypeOptions = {}
): CareerArchetypeProfile | null {
  if (!sky?.ascendant || !sky.positions.length) return null;

  const tenthHouseSign = signAtWholeSignHouse(sky.ascendant, 10);
  const tenthHousePlanets = sky.positions.filter((position) =>
    position.house === 10 && ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(position.planet)
  );
  const northNode = sky.positions.find((position) => /north node|true node/i.test(position.planet));
  const nodeMode = northNode ? modeForSign(northNode.sign) : "";
  const hemisphere = strongestHemisphere(sky.positions);
  const selected = [
    row(`fallback-vocab/career-sign-tone/${slug(tenthHouseSign)}`),
    ...tenthHousePlanets.map((position) => row(`fallback-hook/career-planet-tenth/${slug(position.planet)}`)),
    nodeMode ? row(`fallback-hook/career-node-mode/${nodeMode}`) : null,
    hemisphere ? row(`fallback-hook/career-hemisphere/${hemisphere}`) : null
  ].filter((value): value is CareerVocabularyRow => Boolean(value));

  if (!selected.length) return null;

  const body = selected.map((value) => value.body).join(" ");
  const owner = options.ownerName?.trim();
  const title = owner ? `${owner}'s career pattern` : "Your career pattern";

  return {
    title,
    summary: body,
    tldr: body,
    factors: [
      { label: "10th house", value: tenthHouseSign || "Pending" },
      { label: "Midheaven", value: sky.midheaven || "Pending" },
      { label: "Visible planet", value: tenthHousePlanets.map((position) => position.planet).join(", ") || "None" },
      { label: "North Node", value: northNode ? `${northNode.sign} (${nodeMode})` : "Pending" }
    ],
    sections: [{
      key: "career-pattern",
      label: "Career pattern",
      contentKey: selected[0].contentKey,
      headline: title,
      body,
      meta: "Package-authored career vocabulary.",
      layer: "authored",
      tier: "fallback-architecture-v3",
      sourceKeys: selected.map((value) => value.contentKey)
    }]
  };
}
