import { SourceGapError } from "../content/fallbackArchitectureV3Runtime";
import type { SkySnapshot } from "../types";

const signRulers: Record<string, string> = {
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
const signs = Object.keys(signRulers);
const skyBodyClaimPattern = new RegExp(
  `\\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node)\\s+(?:(?:is\\s+)?(?:currently\\s+)?(?:retrograde|direct|Rx)\\s+|is\\s+)?in\\s+(${signs.join("|")})\\b`,
  "giu"
);

function normalizeId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function wholeSignHouse(sign: string, risingSign: string) {
  const signIndex = signs.indexOf(normalizeId(sign));
  const risingIndex = signs.indexOf(normalizeId(risingSign));
  return signIndex < 0 || risingIndex < 0 ? null : ((signIndex - risingIndex + 12) % 12) + 1;
}

export function assertLunationBodyMatchesEventSky(body: string, snapshot: SkySnapshot) {
  const eventPositions = new Map(
    snapshot.positions.map((position) => [normalizeId(position.planet), position])
  );

  for (const match of body.matchAll(skyBodyClaimPattern)) {
    const planet = normalizeId(match[1] ?? "");
    const claimedSign = normalizeId(match[2] ?? "");
    const eventPosition = eventPositions.get(planet);
    if (!eventPosition) {
      throw new SourceGapError(`SOURCE_GAP: event-time position missing for ${planet}`);
    }
    const eventSign = normalizeId(eventPosition.sign);
    if (claimedSign !== eventSign) {
      throw new SourceGapError(
        `SOURCE_GAP: stale-sky lunation claim says ${planet} in ${claimedSign}; event-time ephemeris says ${eventSign}`
      );
    }
  }
}

export function lunationBlendFacts(
  snapshot: SkySnapshot,
  lunationSign: string,
  risingSign: string,
  kind: string
) {
  const normalizedSign = normalizeId(lunationSign);
  const ruler = signRulers[normalizedSign] ?? null;
  const moonHouse = wholeSignHouse(normalizedSign, risingSign);
  const isFullMoon = kind === "full-moon" || kind === "eclipse-lunar";
  const sun = isFullMoon
    ? snapshot.positions.find((position) => normalizeId(position.planet) === "sun")
    : null;
  const sunHouse = sun ? wholeSignHouse(sun.sign, risingSign) : null;
  const rulerPosition = ruler && ruler !== "sun" && ruler !== "moon"
    ? snapshot.positions.find((position) => normalizeId(position.planet) === ruler)
    : null;
  const rulerHouse = rulerPosition ? wholeSignHouse(rulerPosition.sign, risingSign) : null;
  const uranus = snapshot.positions.find((position) => normalizeId(position.planet) === "uranus");
  const uranusHouse = uranus ? wholeSignHouse(uranus.sign, risingSign) : null;

  return {
    moonHouse,
    sunHouse,
    ruler,
    rulerHouse,
    rulerRetrograde: rulerPosition?.motion === "retrograde",
    uranusHouse,
    // Intentionally non-serving; see the 2026-08-23 Uranus lunation decision.
    uranusLayerActive: false
  };
}
