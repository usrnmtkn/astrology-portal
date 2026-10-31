/** Owner direction: exclude tarot from horoscope write-ups, 2026-10-31.
 * thread:01a189cd-3bdd-75f2-8843-02aafc84e64f
 * Existing complete passages remain editable; this checks new publication only.
 */
export function hasHoroscopeTarotReferences(value: string) {
  return /\b(?:tarot(?:scopes?)?|(?:major|minor)\s+arcana)\b/iu.test(value);
}

export function fallbackHoroscopeEditorialIssue(key: string, record: Record<string, unknown>) {
  if (!/^(?:house-horoscope-core\/|authored\/(?:book-ritual-and-the-moon\/lunation-horoscope\/|lunation-eclipse-))/u.test(key)) return null;
  const fields = ['body', 'body_you', 'body_they'].map(field => record[field]).filter((value): value is string => typeof value === 'string');
  return fields.some(hasHoroscopeTarotReferences)
    ? 'Tarot references are excluded from horoscope write-ups. Save this as a draft and remove those references in your rewrite before publishing.'
    : null;
}
