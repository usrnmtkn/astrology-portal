import { projectReaderRow, READER_ROW_SCHEMA } from '../../apps/web/src/content/readerRowProjection.mjs';

/** Browser fixtures model the public response. Actual admission and storage
 * authorization are exercised against the handler in the API contract suite. */
export function readerResponse(rows: unknown[], publications: unknown[] = []) {
  return { schema: READER_ROW_SCHEMA, rows: rows.map(projectReaderRow).filter(Boolean), publications, nextCursor: null };
}
