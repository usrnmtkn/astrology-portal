import type { PlanetPosition, SkySnapshot } from "../types";
import placementScaffoldData from "./placementScaffoldData.json";

export type PlacementScaffoldSection = {
  kind: "sign" | "house" | "ruler_bridge" | "retrograde";
  heading: string;
  body: string;
};

type PlacementScaffoldData = {
  signStories: Record<string, string>;
  houseStories: Record<string, string>;
  retrograde: Record<string, string>;
};

const data = placementScaffoldData as PlacementScaffoldData;

const anglePoints = new Set(["ascendant", "descendant", "midheaven", "imum-coeli", "ic", "mc"]);
const traditionalSignRulers: Record<string, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
};

function keyPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function normalizePlanet(planet: string) {
  return keyPart(planet);
}

function titleCase(value: string) {
  return value
    .split(/[\s-]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function ordinalHouse(house: number) {
  const rem100 = house % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${house}th`;
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${house}${suffixes[house % 10] ?? "th"}`;
}

function textFor(record: Record<string, string>, key: string) {
  return record[key]?.trim() || "";
}

function sentenceCase(value: string) {
  const trimmed = value.trim();

  return trimmed ? `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}` : "";
}

function section(kind: PlacementScaffoldSection["kind"], heading: string, body: string): PlacementScaffoldSection | null {
  const cleaned = body.trim();
  return cleaned ? { kind, heading, body: cleaned } : null;
}

function rulerBridgeSection({
  natalSky,
  sign
}: {
  natalSky?: SkySnapshot | null;
  sign: string;
}) {
  const ruler = traditionalSignRulers[sign];
  const rulerPosition = ruler
    ? natalSky?.positions.find((candidate) => normalizePlanet(candidate.planet) === ruler) ?? null
    : null;

  if (!ruler || !rulerPosition?.sign || !rulerPosition.house) {
    return null;
  }

  const subject = sentenceCase(textFor(data.houseStories, `${ruler}.${Number(rulerPosition.house)}`));

  if (!subject) {
    return null;
  }

  const signTitle = titleCase(sign);
  const rulerTitle = titleCase(ruler);
  const rulerSignTitle = titleCase(rulerPosition.sign);
  const rulerHouse = ordinalHouse(Number(rulerPosition.house));

  return section(
    "ruler_bridge",
    `${signTitle} answers to ${rulerTitle}`,
    `${signTitle} answers to ${rulerTitle} here. With ${rulerTitle} in ${rulerSignTitle} in the ${rulerHouse} house, ${subject}`
  );
}

export function placementScaffoldSections({
  natalSky,
  position
}: {
  natalSky?: SkySnapshot | null;
  position: PlanetPosition;
}) {
  const planet = normalizePlanet(position.planet);
  const sign = keyPart(position.sign);
  const house = Number(position.house);

  if (!planet || !sign || !house || anglePoints.has(planet)) {
    return [];
  }

  const planetTitle = titleCase(position.planet);
  const signTitle = titleCase(position.sign);

  return [
    section("sign", `${planetTitle} in ${signTitle}`, textFor(data.signStories, `${planet}.${sign}`)),
    section("house", `${planetTitle} in the ${ordinalHouse(house)} house`, textFor(data.houseStories, `${planet}.${house}`)),
    rulerBridgeSection({
      natalSky,
      sign
    }),
    position.motion === "retrograde"
      ? section("retrograde", "Natal retrograde", textFor(data.retrograde, planet))
      : null
  ].filter((item): item is PlacementScaffoldSection => Boolean(item));
}

export function placementScaffoldHasMinimumCoverage(position: PlanetPosition) {
  const planet = normalizePlanet(position.planet);
  const sign = keyPart(position.sign);
  const house = Number(position.house);

  return Boolean(
    textFor(data.signStories, `${planet}.${sign}`)
    && textFor(data.houseStories, `${planet}.${house}`)
  );
}
