export type SkyWriteupRelationRow = {
  id: string;
  content_key: string;
  headline?: string | null;
  block_type?: string | null;
  mode?: string | null;
  facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
};

export type SkyWriteupContext = {
  planet: string;
  sign: string | null;
};

export type RelatedHousePassage<Row extends SkyWriteupRelationRow = SkyWriteupRelationRow> = {
  house: number;
  kind: "Sky house horoscope" | "House and sign passage" | "House passage" | "House introduction";
  row: Row;
};

const planets = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north-node",
  "south-node",
  "lilith"
] as const;

const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
] as const;

const planetSet = new Set<string>(planets);
const signSet = new Set<string>(signs);

function normalizedToken(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[_\s]+/g, "-")
    : "";
}

function nestedString(record: Record<string, unknown> | null | undefined, paths: string[][]) {
  for (const path of paths) {
    let value: unknown = record;
    for (const key of path) {
      value = value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)[key]
        : undefined;
    }
    const normalized = normalizedToken(value);
    if (normalized) return normalized;
  }
  return "";
}

function keyPlacementParts(contentKey: string) {
  const normalizedKey = contentKey.toLowerCase();
  const matches = [
    normalizedKey.match(/^sky\.placement\.(?:base|topper)\.([a-z_-]+)\.([a-z_-]+)/u),
    normalizedKey.match(/^sky[./-]placement[./-](?:base[./-]|topper[./-])?([a-z_-]+)[./-]([a-z_-]+)/u),
    normalizedKey.match(/^fallback-hook\/sky-sign-copy\/([a-z_-]+)\/([a-z_-]+)/u)
  ];
  const match = matches.find(Boolean);
  return match ? { planet: match[1], sign: match[2] } : null;
}

function planetFromHeadline(headline: string) {
  const normalized = headline.toLowerCase().replace(/\bthe\s+/gu, "");
  return planets.find((planet) => normalized.includes(planet.replace(/-/g, " "))) ?? "";
}

function signFromHeadline(headline: string) {
  const normalized = headline.toLowerCase();
  return signs.find((sign) => (
    new RegExp(`\\b(?:in|into|enters|entering)\\s+${sign}\\b`, "u").test(normalized)
    || new RegExp(`\\b${sign}\\s+(?:new|full)\\s+moon\\b`, "u").test(normalized)
  )) ?? "";
}

export function skyWriteupContextForRow(row: SkyWriteupRelationRow): SkyWriteupContext | null {
  const keyParts = keyPlacementParts(row.content_key);
  const keyPlanetOnly = row.content_key.toLowerCase().match(/^fallback-hook\/sky-placement\/([a-z_-]+)$/u)?.[1] ?? "";
  const planet = normalizedToken(
    keyParts?.planet
      || nestedString(row.facts, [["planet"], ["body"], ["derivedFrom", "planet"], ["placementDerivation", "planet"]])
      || nestedString(row.source_snapshot, [["planet"], ["body"], ["derivedFrom", "planet"], ["placementDerivation", "planet"]])
      || keyPlanetOnly
      || planetFromHeadline(row.headline ?? "")
  );
  const sign = normalizedToken(
    keyParts?.sign
      || nestedString(row.facts, [["sign"], ["derivedFrom", "sign"], ["placementDerivation", "sign"]])
      || nestedString(row.source_snapshot, [["sign"], ["derivedFrom", "sign"], ["placementDerivation", "sign"]])
      || signFromHeadline(row.headline ?? "")
  );
  const isSkyWriteup = row.block_type === "sky_placement"
    || row.block_type === "sky_article"
    || row.mode === "article"
    || /^sky\.placement\./iu.test(row.content_key)
    || /^sky[./-](?:placement|article)[./-]/iu.test(row.content_key)
    || /^fallback-hook\/sky-(?:placement|sign-copy)\//iu.test(row.content_key);

  if (!isSkyWriteup || !planetSet.has(planet)) return null;
  return { planet, sign: signSet.has(sign) ? sign : null };
}

function housePassageMatch(row: SkyWriteupRelationRow, context: SkyWriteupContext): Omit<RelatedHousePassage, "row"> | null {
  const key = row.content_key.toLowerCase();
  const exactCore = context.sign
    ? key.match(new RegExp(`^house-horoscope-core/${context.planet}/${context.sign}/house-(\\d+)$`, "u"))
    : null;
  if (exactCore) return { house: Number(exactCore[1]), kind: "Sky house horoscope" };

  const exactSign = context.sign
    ? key.match(new RegExp(`^authored/transit-house-sign/${context.planet}/(\\d+)/${context.sign}(?:/variant-[^/]+)?$`, "u"))
    : null;
  if (exactSign) return { house: Number(exactSign[1]), kind: "House and sign passage" };

  const exactHouse = key.match(new RegExp(`^authored/transit-house/${context.planet}/(\\d+)(?:/variant-[^/]+)?$`, "u"));
  if (exactHouse) return { house: Number(exactHouse[1]), kind: "House passage" };

  const intro = key.match(new RegExp(`^authored/transit-house-intro/${context.planet}/(\\d+)(?:/variant-[^/]+)?$`, "u"));
  if (intro) return { house: Number(intro[1]), kind: "House introduction" };

  return null;
}

const houseKindPriority: Record<RelatedHousePassage["kind"], number> = {
  "Sky house horoscope": 0,
  "House and sign passage": 1,
  "House passage": 2,
  "House introduction": 3
};

export function relatedHousePassages<Row extends SkyWriteupRelationRow>(rows: Row[], context: SkyWriteupContext): RelatedHousePassage<Row>[] {
  return rows.flatMap((row) => {
    const match = housePassageMatch(row, context);
    return match && match.house >= 1 && match.house <= 12 ? [{ ...match, row }] : [];
  }).sort((left, right) => (
    left.house - right.house
    || houseKindPriority[left.kind] - houseKindPriority[right.kind]
    || left.row.content_key.localeCompare(right.row.content_key)
  ));
}

export function relatedAspectPassages<Row extends SkyWriteupRelationRow>(rows: Row[], context: SkyWriteupContext): Row[] {
  const prefix = `authored/transit-aspect/${context.planet}/`;
  return rows
    .filter((row) => row.content_key.toLowerCase().startsWith(prefix))
    .sort((left, right) => left.content_key.localeCompare(right.content_key));
}
