const fields = ['content_key', 'state', 'revision', 'row_id', 'row_updated_at', 'updated_at'];
export const publishedSnapshotPath = 'content-studio-published.json';
export const publishedSnapshotSchema = 'content-studio-published-v1';

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

export function snapshotRowIsPublished(row, publications) {
  const record = publications.get(row?.content_key);
  // Match contentPublicationState.publicationAllowsContent: dated instances
  // have their own row versions, not the reusable key's ledger row identity.
  if (row?.target_date != null) return !record || (record.state === 'live'
    && !(record.row_id == null && record.row_updated_at == null));
  return record?.state === 'live' && record.row_id === row?.id
    && timestamp(record.row_updated_at) === timestamp(row?.updated_at);
}

// A recovery copy may contain public reader fields and publication identities only.
function validateSnapshot(snapshot, projectRow, published) {
  const fail = () => { throw new Error('Invalid public recovery snapshot.'); };
  if (!snapshot || snapshot.schema !== (published ? publishedSnapshotSchema : 'content-studio-last-known-good-v2') || !Array.isArray(snapshot.rows)
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
  const keys = new Set(), ids = new Set();
  let latest = '';
  for (const row of snapshot.rows) {
    const identity = published ? JSON.stringify([row?.content_key, row?.target_date ?? null, row?.mode ?? null]) : row?.content_key;
    if (!row || row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state != null || (!published && row.target_date != null)
      || (row.target_date != null && (typeof row.target_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(row.target_date)
        || new Date(row.target_date).toJSON()?.slice(0, 10) !== row.target_date))
      || !Number.isFinite(Date.parse(row.updated_at)) || keys.has(identity) || ids.has(row.id) || (projectRow && !same(row, projectRow(row)))
      || !snapshotRowIsPublished(row, publications)) fail();
    keys.add(identity); ids.add(row.id);
    if (row.updated_at > latest) latest = row.updated_at;
  }
  if (snapshot.sourceRevision !== latest) fail();
  return snapshot;
}

export function validateRecoverySnapshot(snapshot, projectRow = null) {
  return validateSnapshot(snapshot, projectRow, false);
}

// Complete public-reader inventory, including dated editions. This is a GitHub
// archive, never an input to the app's undated runtime recovery loader.
export function validatePublishedSnapshot(snapshot, projectRow = null) {
  return validateSnapshot(snapshot, projectRow, true);
}

export function validateSnapshotPair(recovery, published, projectRow = null) {
  validateRecoverySnapshot(recovery, projectRow);
  validatePublishedSnapshot(published, projectRow);
  assertStablePublicationSnapshot(recovery.publications, published.publications);
  const byKey = new Map(published.rows.filter(row => row.target_date == null).map(row => [row.content_key, row]));
  for (const row of recovery.rows) {
    const archived = byKey.get(row.content_key);
    if (!archived || archived.id !== row.id || timestamp(archived.updated_at) !== timestamp(row.updated_at)) {
      throw new Error('Recovery and published archive do not describe the same publications.');
    }
  }
}
