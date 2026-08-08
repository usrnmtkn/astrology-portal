import { aspectGlyph, houseGlyph, pointGlyph } from "../charts/chartAssets";
import { isReaderFacingCopy } from "../../content/readerSafety";

export type AttributionAspect =
  | "conjunct"
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposite"
  | "opposition";

export type TransitToNatalAttributionFacts = {
  kind: "transit_to_natal";
  transitingBody: string;
  natalBody: string;
  aspect?: AttributionAspect;
  timeframe?: "season" | "time";
  exactDate?: string;
  passIndex?: number;
  passCount?: number;
};

export type SolarReturnToNatalAttributionFacts = {
  kind: "solar_return_to_natal";
  solarReturnBody: string;
  natalHouse: number;
};

export type AttributionFacts = TransitToNatalAttributionFacts | SolarReturnToNatalAttributionFacts;

export type AttributionGlyph = {
  label: string;
  value: string;
};

const aspectVerbs: Record<"conjunct" | "sextile" | "square" | "trine" | "opposite", string> = {
  conjunct: "is conjunct",
  sextile: "sextiles",
  square: "squares",
  trine: "trines",
  opposite: "is opposite"
};

const ordinalHouseNames = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th"
] as const;

const ordinalPassNames = ["first", "second", "third", "fourth", "fifth", "sixth"] as const;
const cardinalPassNames = ["one", "two", "three", "four", "five", "six"] as const;
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

function normalizedAspect(aspect: AttributionAspect) {
  if (aspect === "conjunction") return "conjunct";
  if (aspect === "opposition") return "opposite";
  return aspect;
}

function aspectGlyphType(aspect: AttributionAspect) {
  const normalized = normalizedAspect(aspect);
  if (normalized === "conjunct") return "conjunction";
  if (normalized === "opposite") return "opposition";
  return normalized;
}

function bodyName(value: string) {
  return value
    .trim()
    .split(/[\s_-]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function ordinalHouse(house: number) {
  if (!Number.isInteger(house) || house < 1 || house > 12) {
    throw new RangeError(`House must be an integer from 1 through 12; received ${house}.`);
  }

  return ordinalHouseNames[house - 1];
}

function exactDateLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);

  if (!match) {
    throw new TypeError(`Exact date must use YYYY-MM-DD; received ${value}.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    month < 1
    || month > 12
    || day < 1
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new RangeError(`Exact date is not a calendar date: ${value}.`);
  }

  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function passSeriesSuffix(passIndex?: number, passCount?: number) {
  if (passIndex === undefined && passCount === undefined) return "";

  if (
    !Number.isInteger(passIndex)
    || !Number.isInteger(passCount)
    || !passIndex
    || !passCount
    || passIndex < 1
    || passCount < 1
    || passIndex > passCount
  ) {
    throw new RangeError("Pass index and count must be positive integers with index no greater than count.");
  }

  const ordinal = ordinalPassNames[passIndex - 1] ?? `${passIndex}th`;
  const cardinal = cardinalPassNames[passCount - 1] ?? String(passCount);
  return `, the ${ordinal} of ${cardinal} passes`;
}

function assertSafeAttribution(value: string) {
  if (value.includes("—") || !isReaderFacingCopy(value)) {
    throw new Error(`Attribution output failed reader-safety validation: ${value}`);
  }

  return value;
}

export function formatAttribution(facts: AttributionFacts) {
  if (facts.kind === "solar_return_to_natal") {
    return assertSafeAttribution(
      `Your Solar Return ${bodyName(facts.solarReturnBody)} falls in your natal ${ordinalHouse(facts.natalHouse)} house.`
    );
  }

  const transitingBody = bodyName(facts.transitingBody);
  const natalBody = bodyName(facts.natalBody);

  if (facts.exactDate) {
    const suffix = passSeriesSuffix(facts.passIndex, facts.passCount);
    return assertSafeAttribution(
      `${transitingBody} is exact on your natal ${natalBody} on ${exactDateLabel(facts.exactDate)}${suffix}.`
    );
  }

  if (!facts.aspect) {
    throw new TypeError("Transit attribution requires either an aspect or an exact date.");
  }

  const lead = facts.timeframe === "season" ? "During this season" : "At this time";
  const verb = aspectVerbs[normalizedAspect(facts.aspect)];
  return assertSafeAttribution(`${lead}, ${transitingBody} ${verb} your natal ${natalBody}.`);
}

export function attributionGlyphs(facts: AttributionFacts): AttributionGlyph[] {
  if (facts.kind === "solar_return_to_natal") {
    return [
      { label: `Solar Return ${bodyName(facts.solarReturnBody)}`, value: pointGlyph(facts.solarReturnBody) },
      { label: `${ordinalHouse(facts.natalHouse)} house`, value: houseGlyph(facts.natalHouse) }
    ];
  }

  const glyphs: AttributionGlyph[] = [
    { label: `Transiting ${bodyName(facts.transitingBody)}`, value: pointGlyph(facts.transitingBody) }
  ];

  if (facts.aspect) {
    glyphs.push({ label: normalizedAspect(facts.aspect), value: aspectGlyph(aspectGlyphType(facts.aspect)) });
  } else {
    glyphs.push({ label: "exact", value: "=" });
  }

  glyphs.push({ label: `Natal ${bodyName(facts.natalBody)}`, value: pointGlyph(facts.natalBody) });
  return glyphs;
}
