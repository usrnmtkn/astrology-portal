import type { TransitItem } from "../App";
import type { SkySnapshot } from "../types";
import { wholeSignHouseForSign } from "./chartMath";
import { possessiveName } from "./personReferences";

type TransitIdentity = Pick<TransitItem,
  "transitPlanet" | "transitSign" | "natalPoint" | "natalSign" | "natalHouse"
>;

function housePhrase(house: number | null | undefined, owner: string) {
  if (!Number.isInteger(house) || !house || house < 1 || house > 12) return "";
  const suffix = house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th";
  return `in ${owner} ${house}${suffix} house`;
}

/** Calculated article context, kept separate from authored interpretation. */
export function transitArticleDescription(
  transit: TransitIdentity,
  natalSky: Pick<SkySnapshot, "ascendant" | "birthTimeKnown"> | null,
  aspectLabel: string,
  ownerName = "you"
) {
  const owner = possessiveName(ownerName);
  const housesKnown = natalSky?.birthTimeKnown === true;
  // Current-location houses belong to the sky chart, not this person's chart.
  const transitHouse = housesKnown && transit.transitSign
    ? wholeSignHouseForSign(transit.transitSign, natalSky.ascendant)
    : null;
  const transiting = [
    transit.transitPlanet,
    transit.transitSign ? `in ${transit.transitSign}` : "",
    housePhrase(transitHouse, owner)
  ].filter(Boolean).join(" ");
  const natal = [
    `${owner} natal ${transit.natalPoint}`,
    transit.natalSign ? `in ${transit.natalSign}` : "",
    housePhrase(housesKnown ? transit.natalHouse : null, owner)
  ].filter(Boolean).join(" ");
  return `${transiting} is ${aspectLabel} ${natal}.`;
}
