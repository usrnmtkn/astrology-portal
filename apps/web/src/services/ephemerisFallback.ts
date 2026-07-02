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
  ["Pluto", "♇", "depth"],
  ["Chiron", "⚷", "repair"],
  ["Lilith", "⚸", "shadow"],
  ["North Node", "☊", "direction"]
] as const;

export const defaultLocation: LocationInput = {
  label: "New York City, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

function signIndexFor(sign: string) {
  return signs.findIndex(([name]) => name === sign);
}

function wholeSignHouse(sign: string, ascendant: string) {
  const signIndex = signIndexFor(sign);
  const ascendantIndex = signIndexFor(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return 1;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

function elementForSign(sign: string): SkySnapshot["dominantElement"] {
  if (["Aries", "Leo", "Sagittarius"].includes(sign)) return "Fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(sign)) return "Earth";
  if (["Gemini", "Libra", "Aquarius"].includes(sign)) return "Air";
  return "Water";
}

export function getCurrentSky(location: LocationInput = defaultLocation, date: Date = new Date()): SkySnapshot {
  const daySeed = Math.floor(date.getTime() / 86_400_000);
  const locationSeed = Math.round((location.latitude + 90) * 10 + (location.longitude + 180) * 10);

  const basePositions: PlanetPosition[] = planets.map(([planet, glyph, theme], index) => {
    const raw = daySeed * (index + 3) + locationSeed + index * 47;
    const signIndex = Math.abs(raw) % signs.length;
    const [sign, signGlyph] = signs[signIndex];
    const motion: PlanetPosition["motion"] = index > 1 && raw % 5 === 0 ? "retrograde" : "direct";

    return {
      planet,
      glyph,
      sign,
      signGlyph,
      degree: Math.abs(raw * 7) % 30,
      house: 1,
      motion,
      theme
    };
  });
  const ascendant = basePositions[7].sign;
  const positions: PlanetPosition[] = basePositions.map((position) => ({
    ...position,
    house: wholeSignHouse(position.sign, ascendant)
  }));

  return {
    location,
    generatedAt: date.toISOString(),
    ascendant,
    ascendantLongitude: signs.findIndex(([name]) => name === ascendant) * 30,
    midheaven: positions[4].sign,
    midheavenLongitude: signs.findIndex(([name]) => name === positions[4].sign) * 30,
    moonPhase: "Waxing Crescent",
    moonStatus: {
      kind: "sign",
      label: positions[1]?.sign ?? "Moon",
      sign: positions[1]?.sign ?? "Moon"
    },
    moonSignTransition: null,
    dominantElement: elementForSign(positions[0]?.sign ?? "Aries"),
    positions,
    aspects: [
      {
        from: "Moon",
        to: "Venus",
        type: "trine",
        orb: 2.1
      },
      {
        from: "Mercury",
        to: "Saturn",
        type: "square",
        orb: 3.4
      },
      {
        from: "Mars",
        to: "Jupiter",
        type: "sextile",
        orb: 1.8
      }
    ]
  };
}
