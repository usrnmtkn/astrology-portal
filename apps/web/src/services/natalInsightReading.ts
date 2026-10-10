import type { SkySnapshot } from "../types";
import { natalInsightTopics, type NatalInsightId } from "../content/natalInsightCatalog";
import { natalInsightPlacements } from "./natalInsightTopics";
import { traditionalSignRulers } from "../content/skySunSeason";
import { zodiacSigns } from "./chartMath";

// The same immutable fact packet identifies a private reading and its writing
// input. Changing the calculated chart cannot select prose for the old chart.
export function natalInsightFacts(topicId: NatalInsightId, sky: SkySnapshot, birthTimeKnown: boolean) {
  const topic = natalInsightTopics.find(item => item.id === topicId)!;
  const known = birthTimeKnown && sky.birthTimeKnown !== false && zodiacSigns.includes(sky.ascendant);
  const angles = new Set(["ascendant", "descendant", "midheaven", "mc", "imum coeli", "ic"]);
  const positions = sky.positions.filter(p => zodiacSigns.includes(p.sign) && (known || !angles.has(p.planet.toLowerCase()))).map(p => ({ planet: p.planet, sign: p.sign, degree: p.degree,
    longitude: p.longitude ?? null, house: known ? p.house : null, motion: p.motion }));
  if (known) {
    for (const [planet, longitude] of [["Ascendant", sky.ascendantLongitude], ["Midheaven", sky.midheavenLongitude], ["Imum Coeli", typeof sky.midheavenLongitude === "number" ? sky.midheavenLongitude + 180 : undefined]] as const) {
      if (typeof longitude !== "number" || !Number.isFinite(longitude) || positions.some(p => p.planet === planet)) continue;
      const value = ((longitude % 360) + 360) % 360;
      positions.push({ planet, sign: zodiacSigns[Math.floor(value / 30)], degree: value % 30,
        longitude: value, house: ((Math.floor(value / 30) - zodiacSigns.indexOf(sky.ascendant) + 12) % 12) + 1, motion: "direct" });
    }
  }
  const relevant = natalInsightPlacements(topic, positions, sky.ascendant, known);
  const planets = new Set(relevant.map(p => p.planet));
  const available = new Set(positions.map(p => p.planet));
  const aspects = sky.aspects.filter(a => available.has(a.from) && available.has(a.to) && (planets.has(a.from) || planets.has(a.to)))
    .map(a => ({ from: a.from, to: a.to, type: a.type, orb: a.orb }))
    .sort((a, b) => `${a.from}/${a.type}/${a.to}`.localeCompare(`${b.from}/${b.type}/${b.to}`));
  const partners = new Set(aspects.flatMap(a => [a.from, a.to]));
  return {
    version: 1, topic: topicId, birthTimeKnown: known,
    placements: relevant,
    aspectPartners: positions.filter(p => partners.has(p.planet) && !planets.has(p.planet)).sort((a, b) => a.planet.localeCompare(b.planet)),
    houses: known ? topic.houses.map(house => {
      const sign = zodiacSigns[(zodiacSigns.indexOf(sky.ascendant) + house - 1) % 12];
      return { house, sign, ruler: traditionalSignRulers[sign.toLowerCase()] };
    }) : [],
    aspects,
    calculationVersion: sky.calculationProvenance?.calculationVersion ?? null
  };
}

export async function natalInsightReadingKey(topic: NatalInsightId, sky: SkySnapshot, birthTimeKnown: boolean, audience: "you" | "friend") {
  const facts = natalInsightFacts(topic, sky, birthTimeKnown);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(facts)));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `natal-insight/${audience === "friend" ? "they" : "you"}/${topic}/${fingerprint}`;
}

export function natalInsightFromHash(hash: string): NatalInsightId | null {
  const id = hash.match(/^#you\/insight\/([^/?]+)$/u)?.[1];
  return natalInsightTopics.find(topic => topic.id === id)?.id ?? null;
}
