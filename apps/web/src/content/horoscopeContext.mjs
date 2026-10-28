import {HOROSCOPE_SIGNS, horoscopeCanonicalJson, horoscopeEditionFromRow} from './horoscopeEditions.mjs';

const planets = new Set(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','North Node','South Node']);

/** Public calculation facts only. Never transport the authoring brief or notes. */
export function projectHoroscopeContext(row) {
  const edition = horoscopeEditionFromRow(row), brief = row?.facts?.horoscopeBrief?.brief;
  if (!edition || brief?.schema !== 'horoscope-brief/v1' || brief.provenance?.actualEphemeris !== 'swiss'
    || horoscopeCanonicalJson(brief.window) !== horoscopeCanonicalJson(edition.window)
    || !Number.isFinite(Date.parse(brief.calculatedAt)) || Date.parse(brief.calculatedAt) < Date.parse(edition.window.startsAt)
    || Date.parse(brief.calculatedAt) >= Date.parse(edition.window.endsAt) || !Array.isArray(brief.positions)) return null;
  const positions = brief.positions.filter(p => p && planets.has(p.planet) && typeof p.sign === 'string' && HOROSCOPE_SIGNS.includes(p.sign.toLowerCase())
    && Number.isFinite(p.degree) && p.degree >= 0 && p.degree < 30 && ['direct','retrograde'].includes(p.motion))
    .map(p => ({planet:p.planet,sign:p.sign,degree:p.degree,motion:p.motion,houses:HOROSCOPE_SIGNS.map(sign => {
      const houses = Array.isArray(brief.signs) ? brief.signs.find(s => s?.sign === sign)?.houses : null;
      const house = Array.isArray(houses) ? houses.find(h => h?.planet === p.planet)?.house : null;
      return Number.isInteger(house) && house >= 1 && house <= 12 ? house : null;
    })}));
  return positions.length && new Set(positions.map(p => p.planet)).size === positions.length ? {calculatedAt:brief.calculatedAt,positions} : null;
}
