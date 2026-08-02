import { pointGlyph, signGlyph } from "../../components/charts/chartAssets";
import type { SocialPlacementRow } from "../../components/charts/PlacementRows";
import type { PlanetPosition, SkySnapshot } from "../../types";

const socialBigThreeLabels = new Set(["Sun", "Moon", "Ascendant"]);

export function isSocialBigThreeRow(row: SocialPlacementRow) {
  return socialBigThreeLabels.has(row.label);
}

export function planetPositionFromSocialRow(
  row: SocialPlacementRow,
  sky: SkySnapshot
): PlanetPosition | null {
  const existingPosition = sky.positions.find((position) => position.planet === row.label);

  if (existingPosition) {
    return existingPosition;
  }

  if (row.label !== "Ascendant") {
    return null;
  }

  const glyph = signGlyph(row.sign);

  return {
    planet: "Ascendant",
    glyph: row.glyph || pointGlyph("Ascendant"),
    sign: row.sign,
    signGlyph: glyph ? `${glyph}\uFE0E` : "",
    degree: row.degree,
    house: row.house ?? 0,
    motion: "direct"
  };
}
