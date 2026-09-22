import type { PlanetPosition } from "../types";

const slug = (value: string) => value.toLowerCase().replace(/\s+/gu, "-");
export function skyPlacementSelection(positions: PlanetPosition[]) {
  return positions.map(p => `${slug(p.planet)}/${slug(p.sign)}`).sort().join(",");
}

/** Shared rows remain available. Per-sign sources belong to the selected
 * placements; house interpretations belong to the opened article. */
export function skyPlacementSourceInSelection(key: string, selection?: string) {
  if (!selection) return true;
  if (key.startsWith("house-horoscope-core/")) return false;
  const pair = key.match(/^(?:sky-placement\/(?:article|retrograde)|fallback-hook\/sky-(?:sign-copy|placement-(?:hook|lived|tagline|turn|confrontation|meaning|opening|sign)))\/([^/]+\/[^/]+)(?:\/|$)/u);
  if (pair?.[1].startsWith("nodes/")) {
    const signs = new Map(selection.split(",").map(pair => pair.split("/") as [string, string]));
    return pair[1] === `nodes/${signs.get("north-node")}-${signs.get("south-node")}`;
  }
  return !pair || selection.split(",").includes(pair[1]);
}
