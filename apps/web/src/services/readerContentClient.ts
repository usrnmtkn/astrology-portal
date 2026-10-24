import type { GeneratedContentRow } from './generatedContent';
import { READER_ROW_SCHEMA } from '../content/readerRowSchema.mjs';
import { installContentPublications, publicationAllowsContent, validContentPublication, type ContentPublication } from '../content/contentPublicationState';
import { initialSkyReaderRows } from './initialSkyReader';

type ReaderQuery = { provider?: string; keys?: string[]; ids?: string[]; prefix?: string; surfaces?: string[]; targetDate?: string; scope?: "sky" | "sky-list" | "sky-article"; vocabularyOnly?: boolean; latestVersion?: boolean; horoscope?: {period:string;at:string;timeZone?:string} };
type ReaderAdmission = { ready: Promise<boolean>; validate?: (rows: readonly GeneratedContentRow[], publications: readonly ContentPublication[]) => boolean };
export class ReaderAdmissionError extends Error {}

async function waitForAdmission(admission: Promise<boolean>, signal?: AbortSignal) {
  if (!signal) return admission;
  let abort: () => void = () => {};
  try {
    return await Promise.race([admission, new Promise<never>((_, reject) => {
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    })]);
  } finally { signal.removeEventListener('abort', abort); }
}

async function readPage(body: string, signal: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch('/api/content-reader', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body, signal, cache: 'no-store' });
      // A successful header does not establish that the whole page arrived.
      // Keep body transport failures inside the same attempt/deadline budget.
      if (response.ok) return await response.json();
      if (![502, 503, 504].includes(response.status) || attempt === 2) {
        throw new Error(`Published content request failed (${response.status}).`);
      }
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
export async function loadReaderRows(query: ReaderQuery, signal?: AbortSignal, admission?: ReaderAdmission) {
  try {
    const prepared = !admission && initialSkyReaderRows(query);
    if (prepared) { signal?.throwIfAborted(); return { data: prepared, error: null }; }
    const rows: GeneratedContentRow[] = [];
    const bufferedPublications: ContentPublication[] = [];
    let afterId: string | undefined;
    for (let page = 0; page < 200; page += 1) {
      // A full published library spans many pages. Each page, including its
      // retries, gets one window; a caller deadline still bounds the whole read.
      const value = await readPage(JSON.stringify({ ...query, ...(afterId ? { afterId } : {}) }),
        signal ?? AbortSignal.timeout(20_000)) as { schema?: string; rows?: GeneratedContentRow[]; publications?: unknown[]; nextCursor?: string | null };
      if (value.schema !== READER_ROW_SCHEMA || !Array.isArray(value.rows) || !(value.nextCursor === null || typeof value.nextCursor === 'string')) throw new Error('Invalid published content response.');
      if (!query.latestVersion) {
        if (!Array.isArray(value.publications) || !value.publications.every(validContentPublication)) throw new Error('Invalid publication state.');
        if (admission) bufferedPublications.push(...value.publications);
        else installContentPublications(value.publications);
      }
      rows.push(...value.rows);
      // Another request may have installed a newer publication while this
      // response (or an earlier inventory page) was in flight.
      if (!value.nextCursor) {
        // Early transport is private until every page and the complete live
        // ledger resolve. Validate against that ledger before installing any
        // response state, including keys newly published during transport.
        if (admission) {
          if (!await waitForAdmission(admission.ready, signal) || admission.validate && !admission.validate(rows, bufferedPublications)) {
            throw new ReaderAdmissionError('Published content preparation was discarded.');
          }
          signal?.throwIfAborted();
          installContentPublications(bufferedPublications);
        }
        return { data: query.latestVersion ? rows : rows.filter(row =>
          publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date)), error: null };
      }
      if (afterId && value.nextCursor <= afterId) throw new Error('Published content pagination did not advance.');
      afterId = value.nextCursor;
    }
    throw new Error('Published content inventory exceeded its limit.');
  } catch (error) { return { data: null, error }; }
}
