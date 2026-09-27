import { moonContinuationSummaries, moonContinuationSummaryKey } from '../../apps/web/src/features/calendar/moonContinuationSummaries.js';
import { createHash } from 'node:crypto';
import { calendarMoonContextKey, calendarMoonContextTemplates, calendarMoonWritingVariables, type CalendarMoonContextKind } from '../../apps/web/src/features/calendar/calendarMoonContext.js';
import { calendarMoonCopyRevision } from '../../apps/web/src/features/calendar/calendarMoonCopyRevisions.js';
import { calendarMoonPhaseDefaults } from '../../apps/web/src/features/calendar/calendarMoonPhaseCopy.js';

const templates = [
  ...Object.entries(calendarMoonContextTemplates).map(([kind, body]) => ({
    contentKey: calendarMoonContextKey(kind as CalendarMoonContextKind), body,
    headline: kind.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`).replace(/^./, letter => letter.toUpperCase())
  })),
  ...Object.entries(moonContinuationSummaries).map(([sign, body]) => ({
    contentKey: moonContinuationSummaryKey(sign), body,
    headline: `Moon in ${sign[0].toUpperCase()}${sign.slice(1)} · Continuation`
  })),
  ...['disseminating', 'last-quarter'].map(phase => ({ contentKey: `fallback-hook/moon-phase/${phase}`,
    body: calendarMoonPhaseDefaults[phase], headline: phase === 'disseminating' ? 'Waning Gibbous Moon' : 'Last Quarter Moon' }))
];
export const calendarMoonContextRecords = templates.map(({ contentKey, headline, body }) => {
  const revision = calendarMoonCopyRevision(contentKey);
  return { contentKey, headline, body, surface: 'sky', content_role: 'full_copy', review_status: 'needs_review',
    owner_approved: false, serving_enabled: false, source_package: 'tldrastro-calendar-moon-context',
    source_keys: [contentKey], optionalSlots: [...calendarMoonWritingVariables],
    ...(revision ? { editorialRevision: revision } : {}),
    calendarWritingSource: { contentKey, title: headline, originalBody: body,
      bodySha256: createHash('sha256').update(body).digest('hex'), wordCount: body.trim().split(/\s+/u).length } };
});

export const calendarMoonContextRecordForKey = (key: string) => calendarMoonContextRecords.find(record => record.contentKey === key) ?? null;

export function calendarMoonWritingVariableNames(key: string): readonly string[] {
  if (calendarMoonContextRecordForKey(key)) return calendarMoonWritingVariables;
  return /^fallback-hook\/moon-phase\/(?:new-moon|waxing-crescent|first-quarter|waxing-gibbous|full-moon|disseminating|last-quarter|balsamic)(?:\/(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces))?$/u.test(key)
    ? [...calendarMoonWritingVariables, 'signTitle'] : [];
}

export function calendarMoonContextRow(record: typeof calendarMoonContextRecords[number], inventory = false) {
  return { id: `package:${record.contentKey}`, content_key: record.contentKey, surface: record.surface,
    mode: 'in_depth', status: 'DRAFT', lane: 'reference', review_state: 'needs-review',
    provider: 'tldrastro-fallback-architecture-v3', headline: record.headline,
    block_type: 'fallback_hook', event_type: 'fallback-hook', updated_at: null, package_starter: true,
    inventory_only: inventory, body: inventory ? null : record.body, summary: inventory ? null : '',
    sections: inventory ? null : { packageRecord: record }, facts: inventory ? null : { fallbackArchitectureV3: true },
    source_snapshot: inventory ? null : { sourcePackage: record.source_package, content_role: record.content_role, review_status: record.review_status },
    listing_facts: inventory ? { packageRecord: { contentKey: record.contentKey, content_role: record.content_role,
      review_status: record.review_status, owner_approved: false, serving_enabled: false } } : undefined };
}
