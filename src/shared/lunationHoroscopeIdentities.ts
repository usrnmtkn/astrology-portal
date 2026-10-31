import { lunationRisingSigns } from './lunationHoroscopeIdentity';

/** The twelve passage identities load with the article or Studio source panel. */
export function lunationHoroscopeIdentities(kind: string, sign: string) {
  const signIndex = lunationRisingSigns.indexOf(sign.toLowerCase() as typeof lunationRisingSigns[number]);
  if (!["new-moon", "full-moon"].includes(kind) || signIndex < 0) return [];
  return lunationRisingSigns.map((risingSign, risingIndex) => {
    const house = ((signIndex - risingIndex + 12) % 12) + 1;
    return {
      risingSign, house,
      contentKey: `authored/book-ritual-and-the-moon/lunation-horoscope/${kind}/${lunationRisingSigns[signIndex]}/rising-${risingSign}/house-${house}`
    };
  });
}
