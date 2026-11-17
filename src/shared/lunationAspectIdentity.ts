const signs = new Set('aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces'.split(' '));
const planets = new Set('mercury venus mars jupiter saturn uranus neptune pluto chiron lilith nodes north-node south-node'.split(' '));
const aspects = new Set('conjunction sextile square trine opposition quincunx'.split(' '));

/** Phase-specific Moon aspects never identify an ordinary Moon transit. */
export function lunationAspectIdentity(key: string) {
  const parts = /^lunation\.(new|full)\.([a-z]+)\.([a-z]+)\.([a-z-]+)\.([a-z]+)$/u.exec(key);
  if (!parts || !signs.has(parts[2]) || !aspects.has(parts[3]) || !planets.has(parts[4]) || !signs.has(parts[5])) return null;
  return { phase: parts[1], moonSign: parts[2], aspect: parts[3], planet: parts[4], planetSign: parts[5] };
}
