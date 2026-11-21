const fields = ['content_key', 'state', 'revision', 'row_id', 'row_updated_at', 'updated_at'];

export function publicationSnapshotIdentity(records) {
  const keys = new Set();
  for (const record of records) {
    if (typeof record.content_key !== 'string' || !record.content_key || keys.has(record.content_key)
      || !['live', 'retired'].includes(record.state) || !Number.isSafeInteger(record.revision) || record.revision <= 0
      || !Number.isFinite(Date.parse(record.updated_at))) throw new Error('Invalid publication snapshot.');
    keys.add(record.content_key);
  }
  if (!keys.has('__content-publication-ledger/v1')) throw new Error('Publication ledger is unavailable.');
  return JSON.stringify([...records].sort((a, b) => a.content_key.localeCompare(b.content_key))
    .map(record => fields.map(field => record[field] ?? null)));
}

export async function readPublicationSnapshot({ supabaseUrl, publishableKey, fetchImpl = fetch }) {
  const records = [];
  let cursor = null;
  for (let page = 0; page < 200; page += 1) {
    const url = new URL(`${supabaseUrl}/rest/v1/content_publications`);
    url.searchParams.set('select', fields.join(','));
    url.searchParams.set('order', 'content_key.asc');
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('content_key', `gt.${cursor}`);
    const response = await fetchImpl(url, {
      headers: { apikey: publishableKey, authorization: `Bearer ${publishableKey}` },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Publication snapshot query failed (${response.status}).`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Invalid publication snapshot.');
    if (batch.length && cursor !== null && batch[0].content_key <= cursor) throw new Error('Publication pagination did not advance.');
    records.push(...batch);
    if (batch.length < 1000) {
      publicationSnapshotIdentity(records);
      return records;
    }
    cursor = batch.at(-1).content_key;
  }
  throw new Error('Publication pagination hit its safety limit; refusing a partial snapshot.');
}

export function assertStablePublicationSnapshot(before, after) {
  if (publicationSnapshotIdentity(before) !== publicationSnapshotIdentity(after)) {
    throw new Error('Publications changed during export; the previous snapshot is unchanged. Retry the export.');
  }
}

const timestamp = value => `${Date.parse(value)}:${(value?.match(/\.(\d+)/u)?.[1] ?? '').padEnd(6, '0').slice(3, 6)}`;
const same = (a, b) => a === b || Boolean(a && b && typeof a === 'object' && typeof b === 'object'
  && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && same(a[key], b[key])));

// A recovery copy may contain public reader fields and publication identities only.
export function validateRecoverySnapshot(snapshot, projectRow = null) {
  const fail = () => { throw new Error('Invalid public recovery snapshot.'); };
  if (!snapshot || snapshot.schema !== 'content-studio-last-known-good-v2' || !Array.isArray(snapshot.rows)
    || snapshot.rowCount !== snapshot.rows.length || snapshot.rowCount < 100 || !Array.isArray(snapshot.publications)
    || Object.keys(snapshot).some(key => !['schema', 'sourceRevision', 'publications', 'rowCount', 'rows'].includes(key))) fail();
  const publications = new Map();
  for (const record of snapshot.publications) {
    if (!record || typeof record.content_key !== 'string' || !record.content_key || publications.has(record.content_key)
      || !['live', 'retired'].includes(record.state) || !Number.isSafeInteger(record.revision) || record.revision < 1
      || !Number.isFinite(Date.parse(record.updated_at))
      || Object.keys(record).some(key => !['content_key', 'state', 'revision', 'row_id', 'row_updated_at', 'updated_at'].includes(key))) fail();
    publications.set(record.content_key, record);
  }
  if (!publications.has('__content-publication-ledger/v1')) fail();
  const keys = new Set();
  let latest = '';
  for (const row of snapshot.rows) {
    const record = publications.get(row?.content_key);
    if (!row || row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state != null || row.target_date != null
      || !Number.isFinite(Date.parse(row.updated_at)) || keys.has(row.content_key) || (projectRow && !same(row, projectRow(row)))
      || record?.state !== 'live' || record.row_id !== row.id || timestamp(record.row_updated_at) !== timestamp(row.updated_at)) fail();
    keys.add(row.content_key);
    if (row.updated_at > latest) latest = row.updated_at;
  }
  if (snapshot.sourceRevision !== latest) fail();
  return snapshot;
}
