export const LUNATION_TIMING_VARIABLES = ['startDate', 'startTime'] as const;

export function isReusableLunationKey(key: string) {
  return /^authored\/sky-lunation-macro\/(?:new-moon|full-moon)\/(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/u.test(key);
}

/** Both fields describe the exact calculated lunation, in the selected zone. */
export function lunationTimingValues(startsAt: string, timeZone?: string): Record<string, string> {
  const instant = new Date(startsAt);
  if (!Number.isFinite(+instant) || !timeZone) return {};
  try {
    return {
      startDate: new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', timeZone}).format(instant),
      startTime: new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone}).format(instant)
    };
  } catch {
    return {};
  }
}

/** Return no reader copy when a requested fact cannot be resolved. */
export function renderLunationTiming(body: string, values: Record<string, string>) {
  const rendered = body.replace(/\{\{\s*(startDate|startTime)\s*\}\}/gu, (token, name) => values[name] ?? token);
  return /\{\{\s*(?:startDate|startTime)\s*\}\}/u.test(rendered) ? '' : rendered;
}
