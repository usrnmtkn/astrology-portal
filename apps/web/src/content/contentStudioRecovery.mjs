import { projectReaderRow } from './readerRowProjection.mjs';

export const recoveryBranch = 'data/content-studio-recovery';
export const recoverySnapshotPath = 'apps/web/public/content-studio-last-known-good.json';
export const recoverySnapshotUrl = `https://raw.githubusercontent.com/usrnmtkn/astrology-portal/refs/heads/${recoveryBranch}/${recoverySnapshotPath}`;
export const recoveryDeploymentConfig = '{"git":{"deploymentEnabled":false}}\n';

const timestamp = value => `${Date.parse(value)}:${(value?.match(/\.(\d+)/u)?.[1] ?? '').padEnd(6, '0').slice(3, 6)}`;
const same = (a, b) => a === b || Boolean(a && b && typeof a === 'object' && typeof b === 'object'
  && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && same(a[key], b[key])));

// A recovery copy may contain public reader fields and publication identities only.
export function validateRecoverySnapshot(snapshot) {
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
      || !Number.isFinite(Date.parse(row.updated_at)) || keys.has(row.content_key) || !same(row, projectReaderRow(row))
      || record?.state !== 'live' || record.row_id !== row.id || timestamp(record.row_updated_at) !== timestamp(row.updated_at)) fail();
    keys.add(row.content_key);
    if (row.updated_at > latest) latest = row.updated_at;
  }
  if (snapshot.sourceRevision !== latest) fail();
  return snapshot;
}
