import type { GeneratedContentRow } from './generatedContent';
import { READER_ROW_SCHEMA } from '../content/readerRowSchema.mjs';
import { installContentPublications, validContentPublication } from '../content/contentPublicationState';

type ReaderQuery = { provider?: string; keys?: string[]; ids?: string[]; prefix?: string; surfaces?: string[]; targetDate?: string; scope?: "sky" | "sky-list"; vocabularyOnly?: boolean; latestVersion?: boolean };
/** Only this transport may fetch shared Studio rows in a reader. It deliberately
 * has no table name, arbitrary select, or authoring-field escape hatch. */
export async function loadReaderRows(query: ReaderQuery, signal = AbortSignal.timeout(20_000)) {
  try {
    const rows: GeneratedContentRow[] = [];
    let afterId: string | undefined;
    for (let page = 0; page < 200; page += 1) {
      const response = await fetch('/api/content-reader', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...query, ...(afterId ? { afterId } : {}) }), signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Published content request failed (${response.status}).`);
      const value = await response.json() as { schema?: string; rows?: GeneratedContentRow[]; publications?: unknown[]; nextCursor?: string | null };
      if (value.schema !== READER_ROW_SCHEMA || !Array.isArray(value.rows) || !(value.nextCursor === null || typeof value.nextCursor === 'string')) throw new Error('Invalid published content response.');
      if (!query.latestVersion) {
        if (!Array.isArray(value.publications) || !value.publications.every(validContentPublication)) throw new Error('Invalid publication state.');
        installContentPublications(value.publications);
      }
      rows.push(...value.rows);
      if (!value.nextCursor) return { data: rows, error: null };
      if (afterId && value.nextCursor <= afterId) throw new Error('Published content pagination did not advance.');
      afterId = value.nextCursor;
    }
    throw new Error('Published content inventory exceeded its limit.');
  } catch (error) { return { data: null, error }; }
}
