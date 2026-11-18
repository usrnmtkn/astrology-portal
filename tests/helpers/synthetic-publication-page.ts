import assert from 'node:assert/strict';
import { canonicalPublicationLedger } from '../../apps/web/src/services/publicationLedgerTransport';

/** PostgREST's read-only ledger protocol over a fixture's actual stored rows. */
export function syntheticPublicationPage(rows: unknown[], params: URLSearchParams) {
  assert.equal(params.get('select'), 'content_key,state,revision,row_id,row_updated_at,updated_at');
  assert.equal(params.get('order'), 'content_key.asc');
  const limit = Number(params.get('limit'));
  assert.ok(Number.isInteger(limit) && limit > 0 && limit <= 1000);
  for (const [name, value] of params) {
    assert.ok(['select', 'order', 'limit', 'content_key'].includes(name));
    if (name === 'content_key') assert.match(value, /^(?:gte|lt|gt)\..+/u);
    else assert.equal(params.getAll(name).length, 1);
  }
  return canonicalPublicationLedger(rows).filter(row => params.getAll('content_key').every(filter => {
    if (filter.startsWith('gte.')) return row.content_key >= filter.slice(4);
    if (filter.startsWith('gt.')) return row.content_key > filter.slice(3);
    return row.content_key < filter.slice(3);
  })).slice(0, limit);
}
