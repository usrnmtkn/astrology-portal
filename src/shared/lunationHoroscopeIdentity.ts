export const lunationRisingSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
] as const;

export function isLunationHoroscopeKey(key: string) {
  const match = key.match(/^authored\/book-ritual-and-the-moon\/lunation-horoscope\/(?:new-moon|full-moon)\/([a-z]+)\/rising-([a-z]+)\/house-([1-9]|1[0-2])$/u);
  if (!match) return false;
  const sign = lunationRisingSigns.indexOf(match[1] as typeof lunationRisingSigns[number]);
  const rising = lunationRisingSigns.indexOf(match[2] as typeof lunationRisingSigns[number]);
  return sign >= 0 && rising >= 0 && Number(match[3]) === ((sign - rising + 12) % 12) + 1;
}
