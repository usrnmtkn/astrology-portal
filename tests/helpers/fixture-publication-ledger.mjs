// A protocol double for unit fixtures. Declared initial publications are seeded
// once; later publication state comes only from observed storage mutations.
// Database acceptance lives in calendar-aspect-publication-store.mjs.
import { publicationLedgerKey } from '../../apps/web/src/content/contentPublicationState.ts';

export function createFixturePublicationLedger(initial = []) {
  let revision = 1;
  const records = new Map([[publicationLedgerKey, { content_key: publicationLedgerKey, state: 'live', revision,
    row_id: null, row_updated_at: null, updated_at: new Date().toISOString() }]]);
  const eligible = row => row?.status === 'LIVE' && row.lane === 'serving' && !row.review_state && !row.target_date;
  const write = (key, state, row) => records.set(key, { content_key: key, state, revision: ++revision,
    row_id: row.id, row_updated_at: row.updated_at, updated_at: new Date().toISOString() });
  for (const row of [...initial].sort((a,b) => (a.updated_at ?? '').localeCompare(b.updated_at ?? ''))) {
    if (eligible(row)) write(row.content_key, 'live', row);
  }
  return {
    records: () => [...records.values()],
    observe(before, after, headers) {
      if (before && before.content_key !== after?.content_key && records.get(before.content_key)?.row_id === before.id)
        write(before.content_key, 'retired', before);
      const key = after?.content_key ?? before.content_key;
      const current = records.get(key);
      if (eligible(after)) {
        const explicit = new Headers(headers).get('x-content-publication-action') === 'publish';
        if ((!current || current.state === 'retired' || current.row_id !== after.id) && !explicit) return;
        write(key, 'live', after);
      } else if (before && current?.row_id === before.id) write(key, 'retired', before);
    }
  };
}
