export type SkyWriteupRelationRow = {
  id: string;
  content_key: string;
  headline?: string | null;
  body?: string | null;
  block_type?: string | null;
  mode?: string | null;
  facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
};

export type SkyWriteupContext = {
  planet: string;
  sign: string | null;
};

export type SkyLunationContext = {
  kind: "new-moon" | "full-moon";
  eclipse: "solar" | "lunar" | "none";
  sign: string;
};

export type RelatedHousePassage<Row extends SkyWriteupRelationRow = SkyWriteupRelationRow> = {
  house: number;
  kind: "Sky house horoscope" | "House and sign passage" | "House passage" | "House introduction";
  availability: "Reader-ready" | "Source candidate";
  row: Row;
};

export type RelatedLunationHoroscope<Row extends SkyWriteupRelationRow = SkyWriteupRelationRow> = {
  risingSign: string;
  house: number;
  preview: string;
  sourceReady: boolean;
  sources: Array<{
    role: "Horoscope frame" | "House opening" | "House jurisdiction" | "Sign focus";
    row: Row;
  }>;
};

export type PersonalTransitAspectCmsStarter = {
  contentKey: string;
  headline: string;
  sourceContentKey: string;
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
const signOrder = [...signs];

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
    || new RegExp(`\\b${sign}\\s+(?:solar|lunar)\\s+eclipse\\b`, "u").test(normalized)
  )) ?? "";
}

export function skyWriteupContextForRow(row: SkyWriteupRelationRow): SkyWriteupContext | null {
  const keyParts = keyPlacementParts(row.content_key);
  const lunationKeyParts = row.content_key.toLowerCase().match(/^authored\/sky-lunation-macro\/(?:new-moon|full-moon)\/([^/]+)$/u);
  const isLunationLike = /(?:^|[./-])lunation(?:[./-]|$)/iu.test(row.content_key)
    || /\b(?:new|full) moon\b|\b(?:solar|lunar) eclipse\b/iu.test(row.headline ?? "");
  const keyPlanetOnly = row.content_key.toLowerCase().match(/^fallback-hook\/sky-placement\/([a-z_-]+)$/u)?.[1] ?? "";
  const planet = normalizedToken(
    keyParts?.planet
      || (lunationKeyParts ? "moon" : "")
      || nestedString(row.facts, [["planet"], ["body"], ["derivedFrom", "planet"], ["placementDerivation", "planet"]])
      || nestedString(row.source_snapshot, [["planet"], ["body"], ["derivedFrom", "planet"], ["placementDerivation", "planet"]])
      || keyPlanetOnly
      || (isLunationLike ? "moon" : "")
      || planetFromHeadline(row.headline ?? "")
  );
  const sign = normalizedToken(
    keyParts?.sign
      || lunationKeyParts?.[1]
      || nestedString(row.facts, [["sign"], ["derivedFrom", "sign"], ["placementDerivation", "sign"]])
      || nestedString(row.source_snapshot, [["sign"], ["derivedFrom", "sign"], ["placementDerivation", "sign"]])
      || signFromHeadline(row.headline ?? "")
  );
  const isSkyWriteup = row.block_type === "sky_placement"
    || row.block_type === "sky_article"
    || row.mode === "article"
    || /^sky\.placement\./iu.test(row.content_key)
    || /^sky[./-](?:placement|article)[./-]/iu.test(row.content_key)
    || /^authored\/sky-lunation-macro\//iu.test(row.content_key)
    || /^fallback-hook\/sky-(?:placement|sign-copy)\//iu.test(row.content_key);

  if (!isSkyWriteup || !planetSet.has(planet)) return null;
  return { planet, sign: signSet.has(sign) ? sign : null };
}

export function skyLunationContextForRow(row: SkyWriteupRelationRow): SkyLunationContext | null {
  const key = row.content_key.toLowerCase();
  const keyMatch = key.match(/^authored\/sky-lunation-macro\/(new-moon|full-moon)\/([^/]+)$/u);

  const eventType = normalizedToken(nestedString(row.facts, [
    ["lunationKind"],
    ["kind"],
    ["moonEvent", "kind"],
    ["moonEvent", "name"]
  ]) || nestedString(row.source_snapshot, [
    ["lunationKind"],
    ["kind"],
    ["moonEvent", "kind"],
    ["moonEvent", "name"]
  ]));
  const headline = (row.headline ?? "").toLowerCase();
  const keyKind = keyMatch?.[1] as SkyLunationContext["kind"] | undefined;
  const kind = keyKind
    ?? (eventType.includes("new") || eventType.includes("solar") || /\bnew moon\b|\bsolar eclipse\b/u.test(headline)
      ? "new-moon"
      : eventType.includes("full") || eventType.includes("lunar") || /\bfull moon\b|\blunar eclipse\b/u.test(headline)
        ? "full-moon"
        : null);
  const eclipseType = normalizedToken(nestedString(row.facts, [
    ["eclipseType"],
    ["eclipse_type"],
    ["moonEvent", "eclipseType"],
    ["moonEvent", "eclipse_type"]
  ]) || nestedString(row.source_snapshot, [
    ["eclipseType"],
    ["eclipse_type"],
    ["moonEvent", "eclipseType"],
    ["moonEvent", "eclipse_type"]
  ]));
  const eclipse = eclipseType.includes("solar") || eventType.includes("solar") || /\bsolar eclipse\b/u.test(headline)
    ? "solar"
    : eclipseType.includes("lunar") || eventType.includes("lunar") || /\blunar eclipse\b/u.test(headline)
      ? "lunar"
      : eventType.includes("eclipse") || /\beclipse\b/u.test(headline)
        ? kind === "new-moon" ? "solar" : "lunar"
        : "none";
  const context = skyWriteupContextForRow(row);
  const sign = normalizedToken(keyMatch?.[2]) || context?.sign || "";
  const isLunationRow = /(?:^|[./-])lunation(?:[./-]|$)/u.test(key)
    || /\b(?:new|full) moon\b|\b(?:solar|lunar) eclipse\b/u.test(headline);

  return isLunationRow && kind && signSet.has(sign)
    ? { kind, eclipse, sign }
    : null;
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function relationBody(row: SkyWriteupRelationRow | undefined) {
  return typeof row?.body === "string" ? row.body.trim() : "";
}

function fillLunationFrame(frame: string, house: number, jurisdiction: string) {
  return frame
    .replace(/\{\{houseOrdinal\}\}/gu, ordinal(house))
    .replace(/\{\{jurisdiction\}\}/gu, jurisdiction)
    .trim();
}

export function relatedLunationHoroscopes<Row extends SkyWriteupRelationRow>(
  rows: Row[],
  context: SkyLunationContext
): RelatedLunationHoroscope<Row>[] {
  const rowsByKey = new Map(rows.map((row) => [row.content_key.toLowerCase(), row]));
  const frameKey = `fallback-hook/lunation-horoscope/${context.kind === "new-moon" ? "new" : "full"}`;
  const frameRow = rowsByKey.get(frameKey);
  const signFocusKey = `fallback-hook/lunation-sign-compact/${context.kind}/${context.sign}`;
  const legacyFullSignFocusKey = `fallback-hook/lunation-sign-compact/${context.sign}`;
  const signFocusRow = rowsByKey.get(signFocusKey)
    ?? (context.kind === "full-moon" ? rowsByKey.get(legacyFullSignFocusKey) : undefined);
  const lunationSignIndex = signOrder.indexOf(context.sign as typeof signs[number]);

  if (lunationSignIndex < 0) return [];

  return signOrder.map((risingSign, risingIndex) => {
    const house = ((lunationSignIndex - risingIndex + 12) % 12) + 1;
    const openingRow = rowsByKey.get(`fallback-hook/lunation-opening-situation/${house}`);
    const jurisdictionRow = rowsByKey.get(`fallback-vocab/house-jurisdiction/${house}`);
    const jurisdiction = relationBody(jurisdictionRow);
    const frame = relationBody(frameRow);
    const opening = relationBody(openingRow);
    const signFocus = relationBody(signFocusRow);
    const openingAndFrame = [opening, frame && jurisdiction ? fillLunationFrame(frame, house, jurisdiction) : ""]
      .filter(Boolean)
      .join(" ");
    const preview = [openingAndFrame, signFocus].filter(Boolean).join("\n\n");
    const sources: RelatedLunationHoroscope<Row>["sources"] = [];
    if (frameRow) sources.push({ role: "Horoscope frame", row: frameRow });
    if (openingRow) sources.push({ role: "House opening", row: openingRow });
    if (jurisdictionRow) sources.push({ role: "House jurisdiction", row: jurisdictionRow });
    if (signFocusRow) sources.push({ role: "Sign focus", row: signFocusRow });

    return {
      risingSign,
      house,
      preview,
      sourceReady: Boolean(frame && jurisdiction),
      sources
    };
  });
}

function housePassageMatch(row: SkyWriteupRelationRow, context: SkyWriteupContext): Omit<RelatedHousePassage, "row"> | null {
  const key = row.content_key.toLowerCase();
  const exactCore = context.sign
    ? key.match(new RegExp(`^house-horoscope-core/${context.planet}/${context.sign}/house-(\\d+)$`, "u"))
    : null;
  if (exactCore) return { house: Number(exactCore[1]), kind: "Sky house horoscope", availability: "Reader-ready" };

  const exactSign = context.sign
    ? key.match(new RegExp(`^authored/transit-house-sign/${context.planet}/(\\d+)/${context.sign}(?:/variant-[^/]+)?$`, "u"))
    : null;
  if (exactSign) return { house: Number(exactSign[1]), kind: "House and sign passage", availability: "Source candidate" };

  const exactHouse = key.match(new RegExp(`^authored/transit-house/${context.planet}/(\\d+)(?:/variant-[^/]+)?$`, "u"));
  if (exactHouse) return { house: Number(exactHouse[1]), kind: "House passage", availability: "Source candidate" };

  const intro = key.match(new RegExp(`^authored/transit-house-intro/${context.planet}/(\\d+)(?:/variant-[^/]+)?$`, "u"));
  if (intro) return { house: Number(intro[1]), kind: "House introduction", availability: "Source candidate" };

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

export function personalTransitAspectCmsStarter(
  row: SkyWriteupRelationRow,
  context: SkyWriteupContext
): PersonalTransitAspectCmsStarter | null {
  const planet = normalizedToken(context.planet);
  const sign = normalizedToken(context.sign);
  const match = row.content_key.toLowerCase().match(
    new RegExp(`^authored/transit-aspect/${planet}/([^/]+)/([^/]+)(?:/variant-[^/]+)?$`, "u")
  );

  if (!match) return null;

  const [, natalPoint, aspect] = match;
  const signPath = sign ? `/${sign}` : "";

  return {
    contentKey: `cms/personal-transit-aspect/you/${planet}${signPath}/${natalPoint}/${aspect}`,
    headline: "{{transitPlanet}} {{aspect}} your {{natalPoint}}",
    sourceContentKey: row.content_key
  };
}
