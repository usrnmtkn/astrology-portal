export function normalizeAspectType(type: string) {
  return type.toLowerCase().replace(/[\s_-]+/g, "");
}

export function aspectGlyph(type: string) {
  const glyphs: Record<string, string> = {
    conjunction: "☌",
    opposition: "☍",
    square: "□",
    trine: "△",
    sextile: "✶"
  };

  return glyphs[type] ?? "·";
}

export function pointGlyph(point: string) {
  const glyphs: Record<string, string> = {
    Sun: "☉",
    Moon: "☽",
    Mercury: "☿",
    Venus: "♀",
    Mars: "♂",
    Jupiter: "♃",
    Saturn: "♄",
    Uranus: "♅",
    Neptune: "♆",
    Pluto: "♇",
    "True Node": "☊",
    "North Node": "☊",
    "South Node": "☋",
    Ascendant: "↑",
    Midheaven: "MC"
  };

  return glyphs[point] ?? point.slice(0, 1);
}

export const zodiacSignIconFiles: Record<string, string> = {
  Aries: "aries.svg",
  Taurus: "taurus.svg",
  Gemini: "gemini.svg",
  Cancer: "cancer.svg",
  Leo: "leo.svg",
  Virgo: "virgo.svg",
  Libra: "libra.svg",
  Scorpio: "scorpio.svg",
  Sagittarius: "sagittarius.svg",
  Capricorn: "capricorn.svg",
  Aquarius: "aquarius.svg",
  Pisces: "pisces.svg"
};

export const wheelPlanetIconFiles: Record<string, string> = {
  Sun: "sun-wheel-glyph.svg",
  Moon: "moon.svg",
  Mercury: "mercury.svg",
  Venus: "venus.svg",
  Mars: "mars.svg",
  Jupiter: "jupiter.svg",
  Saturn: "saturn.svg",
  Uranus: "uranus.svg",
  Neptune: "neptune.svg",
  Pluto: "pluto.svg",
  Chiron: "chiron.svg",
  Lilith: "lilith.svg",
  Ceres: "ceres.svg",
  "True Node": "true-node.svg",
  "North Node": "north-node.svg"
};

export const wheelPlanetRetrogradeIconFiles: Record<string, string> = {
  Mercury: "mercury_rx.svg",
  Venus: "venus_rx.svg",
  Mars: "mars_rx.svg",
  Jupiter: "jupiter_rx.svg",
  Saturn: "saturn_rx.svg",
  Uranus: "uranus_rx.svg",
  Neptune: "neptune_rx.svg",
  Pluto: "pluto_rx.svg",
  Chiron: "chiron_rx.svg",
  Lilith: "lilith_rx.svg",
  Ceres: "ceres_rx.svg",
  "True Node": "true_node_rx.svg",
  "North Node": "true_node_rx.svg"
};

export const wheelAngleIconFiles: Record<string, string> = {
  ASC: "ascendant.svg",
  DSC: "descendant.svg",
  MC: "mc.svg",
  IC: "ic.svg"
};

export const aspectIconFiles: Record<string, string> = {
  conjunction: "conjunction.svg",
  square: "square.svg",
  trine: "trine.svg",
  sextile: "sextile.svg"
};

export const pointIconFiles: Record<string, string> = {
  Sun: "sun.svg",
  Moon: "moon.svg",
  Mercury: "mercury.svg",
  Venus: "venus.svg",
  Mars: "mars.svg",
  Jupiter: "jupiter.svg",
  Saturn: "saturn.svg",
  Uranus: "uranus.svg",
  Neptune: "neptune.svg",
  Pluto: "pluto.svg",
  Chiron: "chiron.svg",
  Lilith: "lilith.svg",
  Ceres: "ceres.svg",
  Pallas: "pallas.svg",
  Juno: "juno.svg",
  Vesta: "vesta.svg",
  "True Node": "true-node.svg",
  "North Node": "north-node.svg",
  Ascendant: "ascendant.svg",
  Descendant: "descendant.svg",
  Midheaven: "mc.svg",
  "Imum Coeli": "ic.svg"
};

export const pointRetrogradeIconFiles: Record<string, string> = {
  Mercury: "mercury_rx.svg",
  Venus: "venus_rx.svg",
  Mars: "mars_rx.svg",
  Jupiter: "jupiter_rx.svg",
  Saturn: "saturn_rx.svg",
  Uranus: "uranus_rx.svg",
  Neptune: "neptune_rx.svg",
  Pluto: "pluto_rx.svg",
  Chiron: "chiron_rx.svg",
  Lilith: "lilith_rx.svg",
  Ceres: "ceres_rx.svg",
  "True Node": "true_node_rx.svg",
  "North Node": "true_node_rx.svg"
};

const zodiacAssetPath = "/zodiac/";

export function zodiacAssetHref(fileName?: string) {
  return fileName ? `${zodiacAssetPath}${fileName}` : null;
}
