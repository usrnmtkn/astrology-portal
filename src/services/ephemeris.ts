import type { LocationInput, PlanetPosition, SkySnapshot } from "../types";

const signs = [
  ["Aries", "♈"],
  ["Taurus", "♉"],
  ["Gemini", "♊"],
  ["Cancer", "♋"],
  ["Leo", "♌"],
  ["Virgo", "♍"],
  ["Libra", "♎"],
  ["Scorpio", "♏"],
  ["Sagittarius", "♐"],
  ["Capricorn", "♑"],
  ["Aquarius", "♒"],
  ["Pisces", "♓"]
] as const;

const planets = [
  ["Sun", "☉", "identity"],
  ["Moon", "☽", "mood"],
  ["Mercury", "☿", "language"],
  ["Venus", "♀", "desire"],
  ["Mars", "♂", "momentum"],
  ["Jupiter", "♃", "growth"],
  ["Saturn", "♄", "structure"],
  ["Uranus", "♅", "change"],
  ["Neptune", "♆", "imagination"],
  ["Pluto", "♇", "depth"]
] as const;

export const defaultLocation: LocationInput = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006
};

export function getCurrentSky(location: LocationInput = defaultLocation): SkySnapshot {
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / 86_400_000);
  const locationSeed = Math.round((location.latitude + 90) * 10 + (location.longitude + 180) * 10);

  const positions: PlanetPosition[] = planets.map(([planet, glyph, theme], index) => {
    const raw = daySeed * (index + 3) + locationSeed + index * 47;
    const signIndex = Math.abs(raw) % signs.length;
    const [sign, signGlyph] = signs[signIndex];

    return {
      planet,
      glyph,
      sign,
      signGlyph,
      degree: Math.abs(raw * 7) % 30,
      house: (Math.abs(raw + index) % 12) + 1,
      motion: index > 1 && raw % 5 === 0 ? "retrograde" : "direct",
      theme
    };
  });

  return {
    location,
    generatedAt: now.toISOString(),
    ascendant: positions[7].sign,
    midheaven: positions[4].sign,
    moonPhase: "Waxing Crescent",
    dominantElement: ["Fire", "Earth", "Air", "Water"][Math.abs(locationSeed + daySeed) % 4] as SkySnapshot["dominantElement"],
    positions,
    aspects: [
      {
        from: "Moon",
        to: "Venus",
        type: "trine",
        orb: 2.1,
        meaning: "Emotional tone and appetite for ease are cooperating."
      },
      {
        from: "Mercury",
        to: "Saturn",
        type: "square",
        orb: 3.4,
        meaning: "Plans may need cleaner commitments before they move."
      },
      {
        from: "Mars",
        to: "Jupiter",
        type: "sextile",
        orb: 1.8,
        meaning: "Effort can grow quickly when it has a specific target."
      }
    ]
  };
}
