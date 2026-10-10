import { publishedSkySummaryContent } from './skySummaryComposition';
import type { CalendarPreviewRow } from './calendarPreviewModel';
import type { LiveGeneratedContent } from '../../web/src/services/generatedContent';
import { createCalendarMoonSources } from '../../../src/shared/features/calendar/calendarMoonSourcesCore';
import { lunationReaderContentKeys } from '../../web/src/content/lunationArticleIdentity';
import { isGovernedReaderEligible } from '../../web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser';
import { contentPublication, publicationAllowsContent } from '../../web/src/content/contentPublicationState';

/** Package sources come from the authenticated source API, never the full reader bundle. */
export function publishedPassageSources(rows: CalendarPreviewRow[]) {
  return publishedSkySummaryContent(rows.flatMap(row => {
    const record = (row.sections as { packageRecord?: Record<string, any> } | undefined)?.packageRecord;
    if (row.id === `package:${row.content_key}`) {
      const original = record?.body_you ?? record?.body ?? record?.text;
      if (!record || record.contentKey !== row.content_key || row.body !== original
        || !isGovernedReaderEligible({ ...record, contentKey: row.content_key }) || contentPublication(row.content_key)) return [];
      return [{ ...row, status: 'LIVE', lane: 'serving', review_state: null }];
    }
    return publicationAllowsContent(row.content_key, row.id, row.updated_at, (row as CalendarPreviewRow & { target_date?: string }).target_date) ? [row] : [];
  }));
}
export function calendarStudioMoonSources(content: Map<string, LiveGeneratedContent>) {
  return createCalendarMoonSources({
    hookBody: key => content.get(key)?.body ?? '',
    weeklyMoon: () => null, // Eligible packaged passages are already in the same source map.
    lunation: event => {
      for (const key of lunationReaderContentKeys(event)) {
        const body = content.get(key)?.body?.trim();
        if (body) return { contentKey: key, body };
        if (contentPublication(key)) return { contentKey: key, body: '' };
      }
      return null;
    }
  });
}
