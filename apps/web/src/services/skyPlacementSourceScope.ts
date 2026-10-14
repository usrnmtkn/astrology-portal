import type { PlanetPosition } from "../types";

const slug = (value: string) => value.toLowerCase().replace(/\s+/gu, "-");
export function skyPlacementSelection(positions: PlanetPosition[]) {
  return positions.map(p => `${slug(p.planet)}/${slug(p.sign)}`).sort().join(",");
}

export function skyPlacementArticleSelection(route: string, positions: PlanetPosition[]) {
  const [, kind, planet, routeSign] = route.split('/');
  if (!['placement', 'retrograde'].includes(kind)) return '';
  const position = positions.find(p => slug(p.planet) === planet);
  const sign = kind === 'retrograde' || !routeSign ? position && slug(position.sign) : routeSign;
  if (!planet || !sign) return 'pending';
  const pairs = planet === 'north-node' || planet === 'south-node'
    ? skyPlacementSelection(positions.filter(p => ['north-node', 'south-node'].includes(slug(p.planet))))
    : `${planet}/${sign}`;
  if (!pairs) return 'pending';
  return `article:${pairs}`;
}

/** Shared rows remain available. Per-sign sources belong to the selected
 * placements; house interpretations belong to the opened article. */
export function skyPlacementSourceInSelection(key: string, selection?: string) {
  if (!selection) return true;
  const article = selection.startsWith('article:');
  const pairs = article ? selection.slice('article:'.length) : selection;
  if (key.startsWith("house-horoscope-core/")) {
    return article && pairs.split(',').some(pair => key.startsWith(`house-horoscope-core/${pair}/`));
  }
  const pair = key.match(/^(?:sky-placement\/(?:article|retrograde)|fallback-hook\/sky-(?:sign-copy|placement-(?:hook|lived|tagline|turn|confrontation|meaning|opening|sign)))\/([^/]+\/[^/]+)(?:\/|$)/u);
  if (pair?.[1].startsWith("nodes/")) {
    if (pairs.split(',').includes(pair[1])) return true;
    const signs = new Map(pairs.split(",").map(pair => pair.split("/") as [string, string]));
    return pair[1] === `nodes/${signs.get("north-node")}-${signs.get("south-node")}`;
  }
  return !pair || pairs.split(",").includes(pair[1]);
}
