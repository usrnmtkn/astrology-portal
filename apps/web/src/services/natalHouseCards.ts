import type { SkySnapshot } from "../types";
import { emptyHouseRulerName } from "../content/emptyHouseRulership";
import { zodiacSigns } from "./chartMath";

const houseOccupants = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);

export function emptyNatalHouseNumbers(positions: ReadonlyArray<{ planet: string; house?: number | null }>) {
  const occupied = new Set(positions.filter(position => houseOccupants.has(position.planet)).map(position => position.house));
  return Array.from({ length: 12 }, (_, index) => index + 1).filter(house => !occupied.has(house));
}

export function natalHouseCardRuler(snapshot: SkySnapshot | null | undefined, house: number) {
  const ascendant = snapshot ? zodiacSigns.indexOf(snapshot.ascendant) : -1;
  if (!snapshot || ascendant < 0 || !Number.isInteger(house) || house < 1 || house > 12) return null;
  const name = emptyHouseRulerName(zodiacSigns[(ascendant + house - 1) % 12]);
  const position = snapshot.positions.find(position => position.planet === name);
  return { name, metadata: position?.sign ? `Ruled by ${name} in ${position.sign}` : `Ruled by ${name}` };
}
