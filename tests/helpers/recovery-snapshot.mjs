// A positive fixture for the complete, versioned public recovery contract.
// Preserve supplied lifecycle/receipt values so invalid cases still fail closed.
export function recoverySnapshot(inputRows, inputPublications = []) {
  const timestamp = '2026-09-07T15:00:00.000Z';
  const rows = inputRows.map((row, index) => ({
    id: `synthetic-recovery-row-${index}`, status: 'LIVE', lane: 'serving',
    review_state: null, updated_at: timestamp, ...row
  }));
  const publications = [...inputPublications];
  const rowKeys = new Set(rows.map(row => row.content_key));
  const publicationKeys = new Set(publications.map(row => row.content_key));
  for (let index = 0; rows.length < 100; index++) {
    const contentKey = `cms/synthetic-recovery-inventory/${index}`;
    if (rowKeys.has(contentKey)) continue;
    rowKeys.add(contentKey);
    rows.push({ id: `synthetic-recovery-inventory-${index}`, content_key: contentKey,
      status: 'LIVE', lane: 'serving', review_state: null, updated_at: timestamp,
      body: `Complete synthetic inventory passage ${index}.` });
  }
  if (!publicationKeys.has('__content-publication-ledger/v1')) {
    publications.push({ content_key: '__content-publication-ledger/v1', state: 'live',
      revision: 1, row_id: null, row_updated_at: null, updated_at: timestamp });
  }
  for (const row of rows) if (!publicationKeys.has(row.content_key)) {
    publications.push({ content_key: row.content_key, state: 'live', revision: 1,
      row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at });
  }
  return { schema: 'content-studio-last-known-good-v2', sourceRevision: 'synthetic-complete-published-inventory',
    rowCount: rows.length, rows, publications };
}
