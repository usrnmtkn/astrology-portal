import { MOON_HOROSCOPE_SIGNS, moonHoroscopeKey, moonHoroscopeHouse, type MoonEvent, type MoonHoroscopeSection } from '../../../src/shared/datedLunationHoroscopes.mjs';

export const moonDraftPrefix = (event: MoonEvent) => `source/moon-horoscope-draft/${moonHoroscopeKey(event).replace('cms/lunation-horoscopes/', '')}/`;
export function emptyMoonHoroscopes(event: MoonEvent): MoonHoroscopeSection {
  return { schema: 'sky-article-horoscopes-v1', heading: '## Horoscopes', introduction: '', passages: MOON_HOROSCOPE_SIGNS.map(risingSign => ({
    risingSign, house: moonHoroscopeHouse(event.sign, risingSign), heading: `${risingSign[0].toUpperCase() + risingSign.slice(1)} / ${risingSign[0].toUpperCase() + risingSign.slice(1)} Rising`, body: ''
  })) };
}
type Draft = { schema: 'moon-horoscope-writing-draft-v1'; event: MoonEvent; section: MoonHoroscopeSection; originalSource: string | null;
  target?: { id: string; updatedAt: string }; compiledDraft?: { id: string; updatedAt: string } };
export function moonWritingDraft(row: any): Draft | null {
  const draft = row?.sections?.moonWritingDraft as Draft | undefined;
  if (row?.status !== 'DRAFT' || row?.lane !== 'reference' || draft?.schema !== 'moon-horoscope-writing-draft-v1'
    || !moonHoroscopeKey(draft.event) || !row.content_key?.startsWith(moonDraftPrefix(draft.event))
    || draft.originalSource !== null && typeof draft.originalSource !== 'string') return null;
  const passages = draft.section?.passages;
  if (draft.section?.schema !== 'sky-article-horoscopes-v1' || !Array.isArray(passages) || passages.length !== 12
    || typeof draft.section.heading !== 'string' || typeof draft.section.introduction !== 'string'
    || MOON_HOROSCOPE_SIGNS.some(sign => passages.filter(p => p?.risingSign === sign).length !== 1)
    || passages.some(p => !p || p.house !== moonHoroscopeHouse(draft.event.sign, p.risingSign) || typeof p.heading !== 'string' || typeof p.body !== 'string')
    || draft.target && (typeof draft.target.id !== 'string' || typeof draft.target.updatedAt !== 'string')) return null;
  try{if(!draft.event.timeZone)return null;new Intl.DateTimeFormat('en',{timeZone:draft.event.timeZone});}catch{return null;}
  return draft;
}
export function moonWritingDraftPayload(event: MoonEvent, section: MoonHoroscopeSection, originalSource: string | null, target: any, working: any) {
  if (!moonHoroscopeKey(event)) throw new Error('Choose a Moon event before saving.');
  if (target && !target.updated_at) throw new Error('Reload the saved version before saving. Your writing is still here.');
  const draft: Draft = { schema: 'moon-horoscope-writing-draft-v1', event, section, originalSource,
    ...(target ? { target: { id: target.id, updatedAt: target.updated_at } } : {}) };
  return { contentKey: working?.content_key ?? moonDraftPrefix(event) + crypto.randomUUID(), surface: 'sky', mode: 'article',
    eventType: 'moon-horoscope-writing-draft', status: 'DRAFT', lane: 'reference', reviewState: 'owner-review-required',
    headline: `${event.title} horoscopes`, summary: '', body: '', sections: { moonWritingDraft: draft },
    sourceSnapshot: { content_role: 'source_material', contentType: 'moon-horoscope-writing-draft', review_status: 'needs_review' }, provider: 'manual-admin' };
}
