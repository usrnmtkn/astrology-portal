import { Readable } from 'node:stream';
import handler from '../../api/content-reader.ts';

// Route the actual browser request through the actual server boundary in
// isolated storage tests. A canned reader success would hide privacy regressions.
export async function readerRouteResponse(input, init = {}) {
  if (String(input) !== '/api/content-reader') return null;
  const req = Readable.from([String(init.body ?? '')]);
  Object.assign(req, { method: init.method, headers: {}, url: String(input) });
  const headers = {};
  let response;
  const res = { statusCode: 200, setHeader(key, value) { headers[key] = value; }, end(body) { response = new Response(body, { status: this.statusCode, headers }); } };
  await handler(req, res);
  return response;
}

const observedPublications = new Map();
let nextPublicationRevision = Date.now() * 1000;
export function fixturePublications(rows) {
  const updated_at = '2026-09-21T00:00:00Z';
  return [{ content_key: '__content-publication-ledger/v1', state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at },
    ...rows.filter(row => row.status === 'LIVE' && row.lane === 'serving' && !row.review_state && !row.target_date)
      .map(row => {
        const identity = JSON.stringify([row.id, row.updated_at]);
        let observed = observedPublications.get(row.content_key);
        if (!observed || observed.identity !== identity) { observed = { identity, revision: ++nextPublicationRevision }; observedPublications.set(row.content_key, observed); }
        return { content_key: row.content_key, state: 'live', revision: observed.revision, row_id: row.id, row_updated_at: row.updated_at, updated_at };
      })];
}
