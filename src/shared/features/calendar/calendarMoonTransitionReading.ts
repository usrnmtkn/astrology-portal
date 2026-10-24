import type { LunarCalendarEvent } from '../../../../apps/web/src/services/ephemeris';
import type { LiveGeneratedContent } from '../../../../apps/web/src/services/generatedContent';
import { publicationAllowsContent } from '../../../../apps/web/src/content/contentPublicationState';
import { isReaderFacingCopy } from '../../../../apps/web/src/content/readerSafety';
import { moonSignTransitionForPair, moonSignTransitionKey, nextZodiacSignName } from './moonSignTransitions';

/** The complete Moon event passage, independent of any dated daily overview. */
export function calendarMoonTransitionReading(event: LunarCalendarEvent, content?: ReadonlyMap<string, LiveGeneratedContent> | null,
  allows = publicationAllowsContent, fallback?: LiveGeneratedContent | null) {
  const from = event.fromSign ?? '';
  const to = event.toSign ?? event.sign ?? '';
  if (event.type !== 'ingress' || event.planet !== 'Moon' || !to || nextZodiacSignName(from) !== to.toLowerCase().trim()) return null;
  const key = moonSignTransitionKey(from, to);
  const live = content?.get(key) ?? (fallback?.contentKey === key ? fallback : null);
  const body = live && (!live.status || live.status === 'LIVE') && allows(key, live.id, live.updatedAt)
    ? live.body : allows(key) ? moonSignTransitionForPair(from, to) : '';
  return isReaderFacingCopy(body) ? { key, body } : null;
}
