export const HOROSCOPE_SIGNS = Object.freeze(['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']);
export const HOROSCOPE_PERIODS = Object.freeze(['daily','weekly','monthly','seasonal']);
export function validateHoroscopeWindow(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !['period','audience','timeZone','startsAt','endsAt','seasonSign'].includes(key))
    || !HOROSCOPE_PERIODS.includes(value.period) || value.audience !== (value.period === 'monthly' ? 'collective' : 'rising') || typeof value.timeZone !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.startsAt ?? '')
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.endsAt ?? '')) throw new Error('Invalid horoscope dates or audience. Prepare the edition again.');
  new Intl.DateTimeFormat('en', {timeZone:value.timeZone});
  const hours = (Date.parse(value.endsAt) - Date.parse(value.startsAt)) / 3600000;
  const [min,max] = value.period === 'daily' ? [23,25] : value.period === 'weekly' ? [167,169] : value.period === 'monthly' ? [671,745] : [680,780];
  if (!Number.isFinite(hours) || hours < min || hours > max
    || new Date(value.startsAt).toISOString() !== value.startsAt || new Date(value.endsAt).toISOString() !== value.endsAt
    || (value.period === 'seasonal' ? !HOROSCOPE_SIGNS.includes(value.seasonSign) : value.seasonSign !== undefined)) throw new Error('Invalid horoscope period boundaries.');
  return {period:value.period, audience:value.audience, timeZone:value.timeZone, startsAt:value.startsAt, endsAt:value.endsAt, ...(value.period === 'seasonal' ? {seasonSign:value.seasonSign} : {})};
}
