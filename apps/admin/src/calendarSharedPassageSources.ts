import type { CalendarOverviewValue } from '../../../src/shared/features/calendar/calendarOverviewResolve';
import type { LiveGeneratedContent } from '../../web/src/services/generatedContent';
import type { CalendarPreviewRow, CalendarPreviewValue } from './calendarPreviewModel';
import { skyDailySummaryFields } from '../../web/src/content/skyDailySummaryCatalog';

/** Only expose sources that actually contribute to the reader's selected value.
 * Composite Moon passages have several sources; their synthetic assembly key is
 * not an editable content row. Always open the complete source, never an excerpt.
 */
export function calendarSharedPassageSources(value: CalendarOverviewValue, provenance: CalendarPreviewValue | undefined,
  content: Map<string, LiveGeneratedContent>, rows: CalendarPreviewRow[]) {
  const keys = new Set<string>();
  if (value.kind !== 'copy') return [];
  const originals = new Map<string, CalendarPreviewRow>();
  const readerBodies = new Map<string, string>();
  for (const row of rows) {
    if (row.inventory_only) continue;
    const record = (row.sections as { packageRecord?: Record<string, unknown> } | undefined)?.packageRecord;
    const published = content.get(row.content_key);
    const original = record?.body_you ?? record?.body ?? record?.text;
    if (row.id === published?.id || !published && record?.contentKey === row.content_key && typeof original === 'string' && original.trim()) {
      originals.set(row.content_key, row);
      readerBodies.set(row.content_key, published?.body ?? original as string);
    }
  }
  // The reader can use its shipped Sun clause before a Studio row exists. Open
  // that clause through the existing Sun editor, which creates a draft normally.
  if (value.sourceKey && !originals.has(value.sourceKey) && !content.has(value.sourceKey)) {
    const field = skyDailySummaryFields.find(field => field.key === value.sourceKey && field.body);
    if (field) {
      originals.set(field.key, { id: `builtin:${field.key}`, content_key: field.key, headline: field.label, body: field.body, status: 'DRAFT' });
      readerBodies.set(field.key, field.body);
    }
  }
  if (value.sourceKey && originals.has(value.sourceKey)) keys.add(value.sourceKey);
  for (const part of provenance?.parts ?? []) {
    if (part.sourceKey && part.text && value.text.includes(part.text)) keys.add(part.sourceKey);
  }
  // Complete literal source units can also occur in composites (including
  // sources appended after a lunation). Ambiguous identical bodies are left to
  // the explicit provenance above rather than guessing which row owns them.
  const bodies = new Map<string, string[]>();
  for (const [key, source] of readerBodies) {
    if (key.startsWith('calendar-passage/')) continue;
    const body = source.trim();
    if (body && value.text.includes(body)) bodies.set(body, [...(bodies.get(body) ?? []), key]);
  }
  for (const matches of bodies.values()) if (matches.length === 1) keys.add(matches[0]);
  return [...keys].flatMap(key => {
    const original = originals.get(key);
    const drafts = rows.filter(row => row.content_key === key && row.status === 'DRAFT' && !row.id.startsWith('package:') && !row.inventory_only);
    const row = original && (drafts.find(row => 'mode' in row && row.mode === 'studio-draft') ?? drafts[0] ?? original);
    return row ? [row] : [];
  });
}
