import { isSkyReaderPreviewDate } from '../../../src/shared/skyReaderPreview';
import type { StudioPassageEdit } from '../../../src/shared/studioPassageEdit';
import { calendarPlanetaryIdentity } from './calendarPlanetarySources';

/** Reader event links open an existing full source, never a new blank draft. */
export function calendarPlanetaryReaderEntry(hash: string): StudioPassageEdit | null {
  const [route, query] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query), sourceKey = params.get('editEvent') ?? '';
  const date = params.get('date') ?? '', timeZone = params.get('timeZone') ?? '';
  const identity = calendarPlanetaryIdentity(sourceKey);
  if (route !== 'calendar-writeups' || !identity?.sign || !isSkyReaderPreviewDate(date)
    || identity.date && identity.date !== date
    || !timeZone || timeZone.length > 100 || sourceKey.length > 400
    || params.get('view') !== `planetary-${identity.kind === 'ingress' ? 'ingresses' : 'stations'}`) return null;
  try { new Intl.DateTimeFormat('en', {timeZone}).format(0); } catch { return null; }
  return {surface:'calendar', sourceKey, date, timeZone};
}
