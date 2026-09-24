export const HOROSCOPE_EDITION_PREFIX = 'horoscope/';
export const HOROSCOPE_EDITION_SCHEMA = 'horoscope-edition/v1';
export const HOROSCOPE_SIGNS = Object.freeze(['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']);
export const HOROSCOPE_PERIODS = Object.freeze(['daily','weekly','seasonal']);
/** Stable across PostgreSQL jsonb and browser transport; never alters saved strings. */
export function horoscopeCanonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(horoscopeCanonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + horoscopeCanonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export const horoscopeSignLabel = sign => sign[0].toUpperCase() + sign.slice(1);
export function horoscopeEditionKey(window) {
  return `${HOROSCOPE_EDITION_PREFIX}${window.period}/${window.startsAt.replace(/[^0-9]/gu, '')}`;
}
export function validateHoroscopeWindow(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !['period','audience','timeZone','startsAt','endsAt','seasonSign'].includes(key))
    || !HOROSCOPE_PERIODS.includes(value.period) || value.audience !== 'rising' || typeof value.timeZone !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.startsAt ?? '')
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.endsAt ?? '')) throw new Error('Invalid horoscope dates or audience. Prepare the edition again.');
  new Intl.DateTimeFormat('en', {timeZone:value.timeZone});
  const hours = (Date.parse(value.endsAt) - Date.parse(value.startsAt)) / 3600000;
  const [min,max] = value.period === 'daily' ? [23,25] : value.period === 'weekly' ? [167,169] : [680,780];
  if (!Number.isFinite(hours) || hours < min || hours > max
    || new Date(value.startsAt).toISOString() !== value.startsAt || new Date(value.endsAt).toISOString() !== value.endsAt
    || (value.period === 'seasonal' ? !HOROSCOPE_SIGNS.includes(value.seasonSign) : value.seasonSign !== undefined)) throw new Error('Invalid horoscope period boundaries.');
  return {period:value.period, audience:'rising', timeZone:value.timeZone, startsAt:value.startsAt, endsAt:value.endsAt, ...(value.period === 'seasonal' ? {seasonSign:value.seasonSign} : {})};
}
export function validateHoroscopeEdition(value, complete = false) {
  if (!value || value.schema !== HOROSCOPE_EDITION_SCHEMA || !Array.isArray(value.passages) || value.passages.length !== 12) throw new Error('An edition needs all twelve zodiac signs.');
  const window = validateHoroscopeWindow(value.window);
  const seen = new Set();
  for (const passage of value.passages) {
    if (!passage || !HOROSCOPE_SIGNS.includes(passage.sign) || seen.has(passage.sign)
      || typeof passage.headline !== 'string' || typeof passage.body !== 'string' || passage.headline.length > 200 || passage.body.length > 20000
      || Object.keys(passage).some(key => !['sign','headline','body'].includes(key))) throw new Error('Keep one headline and complete passage for each sign.');
    if (complete && (!passage.headline.trim() || !passage.body.trim() || /\{\{|\}\}/u.test(passage.headline + passage.body))) throw new Error('Finish all twelve readings and resolve prompt variables before publishing.');
    seen.add(passage.sign);
  }
  if (Object.keys(value).some(key => !['schema','window','passages'].includes(key))) throw new Error('Keep drafting instructions outside the reader edition.');
  return {schema:HOROSCOPE_EDITION_SCHEMA, window, passages:HOROSCOPE_SIGNS.map(sign => {
    const passage = value.passages.find(p => p.sign === sign);
    return {sign, headline:passage.headline, body:passage.body};
  })};
}
export function emptyHoroscopeEdition(window) {
  return validateHoroscopeEdition({schema:HOROSCOPE_EDITION_SCHEMA, window, passages:HOROSCOPE_SIGNS.map(sign => ({sign,headline:'',body:''}))});
}
export function horoscopeEditionBody(edition) {
  return edition.passages.map(p => `## ${horoscopeSignLabel(p.sign)}\n\n${p.headline}\n\n${p.body}`).join('\n\n');
}
export function horoscopeEditionFromRow(row) {
  try {
    const edition = validateHoroscopeEdition(row?.sections?.horoscopeEdition, true);
    if (row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state != null || row.surface !== 'sky' || row.mode !== 'article'
      || row.content_key !== horoscopeEditionKey(edition.window) || row.body !== horoscopeEditionBody(edition)) return null;
    return edition;
  } catch { return null; }
}
export function horoscopeEditionAt(rows, period, at) {
  const time = Date.parse(at);
  const values = rows.map(row => ({row, edition:horoscopeEditionFromRow(row)})).filter(({edition}) => edition
    && edition.window.period === period && Date.parse(edition.window.startsAt) <= time && time < Date.parse(edition.window.endsAt));
  // Overlapping editions need editorial resolution, never an arbitrary winner.
  if (values.length > 1) throw new Error('More than one horoscope edition covers this period. Please try again later.');
  return values[0]?.edition ?? null;
}
export function horoscopeWindowLabel(window) {
  const format = new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:window.timeZone});
  const first = format.format(new Date(window.startsAt));
  const last = format.format(new Date(Date.parse(window.endsAt) - 1));
  return first === last ? first : `${first} – ${last}`;
}
