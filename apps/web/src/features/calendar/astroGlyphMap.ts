/** Glyph mapping spec from the Calendar design handoff (`astro-glyph.js`). */

export const ASTRO_GLYPH_FILES = {
  "☉": "sun",
  "☽": "moon",
  "☾": "moon",
  "☿": "mercury",
  "♀": "venus",
  "♂": "mars",
  "♃": "jupiter",
  "♄": "saturn",
  "♅": "uranus",
  "♆": "neptune",
  "♇": "pluto",
  "⚷": "chiron",
  "⚸": "lilith",
  "☊": "north-node",
  "☋": "south-node",
  "⚳": "ceres",
  "⚴": "pallas",
  "⚵": "juno",
  "⚶": "vesta",
  "♈": "aries",
  "♉": "taurus",
  "♊": "gemini",
  "♋": "cancer",
  "♌": "leo",
  "♍": "virgo",
  "♎": "libra",
  "♏": "scorpio",
  "♐": "sagittarius",
  "♑": "capricorn",
  "♒": "aquarius",
  "♓": "pisces",
  "☌": "conjunction",
  "☍": "opposition",
  "✱": "sextile",
  "⚹": "sextile",
  "✶": "sextile",
  "□": "square",
  "△": "trine"
} as const;

export type AstroGlyphChar = keyof typeof ASTRO_GLYPH_FILES;

export function astroGlyphFile(char: string) {
  return ASTRO_GLYPH_FILES[char as AstroGlyphChar] ?? null;
}

export function astroGlyphHref(fileStem: string) {
  return `/zodiac/${fileStem}.svg`;
}
