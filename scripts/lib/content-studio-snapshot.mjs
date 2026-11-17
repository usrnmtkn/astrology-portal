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
