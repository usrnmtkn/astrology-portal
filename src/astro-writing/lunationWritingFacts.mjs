import { createHash } from 'node:crypto';

const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const lunationDigest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex');

/** A packet must contain actual calculated events, never dates from an owner example. */
export function assertLunationWritingFacts(facts, { plan, target } = {}) {
  if (target?.surface !== 'calendar-lunation' || target.contentKeyFamily !== 'authored/sky-lunation-macro') {
    throw new Error('LUNATION_WRITER_TARGET_MISMATCH');
  }
  if (facts?.source !== 'swiss-ephemeris' || !facts.calculationSource || !facts.timeZone) {
    throw new Error('LUNATION_CALCULATED_FACTS_REQUIRED');
  }
  new Intl.DateTimeFormat('en', { timeZone: facts.timeZone });
  const event = facts.event;
  if (!event?.id || !['new-moon','full-moon'].includes(event.kind) || !signs.includes(event.sign)
    || !Number.isFinite(Date.parse(event.startsAt))) throw new Error('LUNATION_EVENT_INVALID');
  const key = `authored/sky-lunation-macro/${event.kind}/${event.sign}`;
  if (facts.contentKey !== key || plan?.object !== 'moon' || plan.sign !== event.sign || plan.eventType !== event.kind
    || plan.house != null) throw new Error('LUNATION_EVENT_MEANING_MISMATCH');
  if (plan.calculatedFactsHash !== lunationDigest(facts)) throw new Error('LUNATION_CALCULATED_FACTS_DRIFT');
  for (const related of facts.relatedEvents ?? []) {
    if (!related.id || !['new-moon','full-moon','eclipse-solar','eclipse-lunar'].includes(related.kind)
      || !signs.includes(related.sign) || !Number.isFinite(Date.parse(related.startsAt))) {
      throw new Error('LUNATION_RELATED_EVENT_INVALID');
    }
    if (related.relationship === 'previous-same-sign-new-moon') {
      if (event.kind !== 'full-moon' || !['new-moon','eclipse-solar'].includes(related.kind)
        || related.sign !== event.sign || Date.parse(related.startsAt) >= Date.parse(event.startsAt)) {
        throw new Error('LUNATION_CYCLE_ANCHOR_MISMATCH');
      }
    } else if (related.relationship === 'next-full-moon') {
      if (event.kind !== 'new-moon' || !['full-moon','eclipse-lunar'].includes(related.kind)
        || Date.parse(related.startsAt) <= Date.parse(event.startsAt)) throw new Error('LUNATION_CYCLE_ANCHOR_MISMATCH');
    } else throw new Error('LUNATION_CYCLE_RELATIONSHIP_UNSUPPORTED');
  }
  return facts;
}

/** Mechanical fact-boundary checks only. Editorial judgment stays with the owner. */
export function lunationDraftFactFindings(draft, facts) {
  const text = [draft.body, draft.journalPrompt].filter(v => typeof v === 'string').join('\n');
  const findings = [];
  const fail = detail => findings.push({ category: 'astrology_integrity', detail });
  if (/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/iu.test(text)) {
    fail('Exact dates and clock times belong to calculated event fields, not reusable lunation prose.');
  }
  if (/\b\d+(?:st|nd|rd|th)\s+house\b|\b\d+(?:\.\d+)?\s*(?:°|degrees?\b)/iu.test(text)) {
    fail('The lunation writer has no calculated house or degree permission.');
  }
  const allowed = [facts.event, ...(facts.relatedEvents ?? [])];
  for (const match of text.matchAll(/\b(New|Full) Moon in (Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/giu)) {
    const kind = `${match[1].toLowerCase()}-moon`, sign = match[2].toLowerCase();
    if (!allowed.some(e => e.kind === kind && e.sign === sign)) fail(`Uncalculated lunar event: ${match[0]}`);
  }
  return findings;
}
