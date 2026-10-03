import type { GeneratedContentRow } from './generatedContent';
import { READER_ROW_SCHEMA } from '../content/readerRowSchema.mjs';
import { installContentPublications, validContentPublication } from '../content/contentPublicationState';

type ReaderQuery = { provider?: string; keys?: string[]; ids?: string[]; prefix?: string; surfaces?: string[]; targetDate?: string; scope?: "sky" | "sky-list"; vocabularyOnly?: boolean; latestVersion?: boolean; horoscope?: {period:string;at:string;timeZone?:string} };

async function readPage(body: string, signal: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch('/api/content-reader', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body, signal, cache: 'no-store' });
      if (![502, 503, 504].includes(response.status) || attempt === 2) return response;
      await response.body?.cancel();
    } catch (error) {
      if (signal.aborted || attempt === 2 || !(error instanceof TypeError)) throw error;
    }
    // Retry only transient transport failures. The same page/caller deadline
    // bounds every attempt; content validation and access errors are not retried.
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
}
/** Only this transport may fetch shared Studio rows in a reader. It deliberately
 * has no table name, arbitrary select, or authoring-field escape hatch. */
export async function loadReaderRows(query: ReaderQuery, signal?: AbortSignal) {
  try {
    const rows: GeneratedContentRow[] = [];
    let afterId: string | undefined;
    for (let page = 0; page < 200; page += 1) {
      // A full published library spans many pages. Each page, including its
      // retries, gets one window; a caller deadline still bounds the whole read.
      const response = await readPage(JSON.stringify({ ...query, ...(afterId ? { afterId } : {}) }),
        signal ?? AbortSignal.timeout(20_000));
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
