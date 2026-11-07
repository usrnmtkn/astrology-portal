import { writeupHoroscopes } from '../../src/shared/skyWriteupHoroscopes';
import { createHash } from 'node:crypto';

/** Existing compiler hashes include JSON property order. JSONB changes that
 * order, so restore only the finite construction orders shipped by Studio:
 * - GeneratedContentAdminDashboard generic houses/aspects;
 * - skyArticleHoroscopes extraction, then compiler's imported spread;
 * - the same imported spread after its source template's JSONB hydration;
 * - stored order for revisions opened from JSONB and ingress empty arrays.
 * Every candidate retains all properties, values and original array order. */
const houseOrders = [null, ['house', 'risingSign', 'contentKey', 'body'],
  ['risingSign', 'house', 'heading', 'body', 'contentKey'], ['body', 'house', 'heading', 'risingSign', 'contentKey']];
const aspectOrders = [null, ['contentKey', 'natalPoint', 'aspect', 'body']];

function orderedPassages(passages: Record<string, unknown>[], order: string[] | null) {
  return order === null ? passages : passages.map(passage => Object.fromEntries([
    ...order.filter(key => Object.hasOwn(passage, key)).map(key => [key, passage[key]]),
    ...Object.entries(passage).filter(([key]) => !order.includes(key))
  ]));
}

/** Verify stored bytes before public projection, never changing the saved hash. */
export function skyArticleCompiledHashMatches(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const edition = value as Record<string, unknown>;
  if (typeof edition.compiledHash !== 'string' || !/^[a-f0-9]{64}$/u.test(edition.compiledHash)
    || typeof edition.tldr !== 'string' || typeof edition.compiledMarkdown !== 'string'
    || !Array.isArray(edition.housePassages) || !Array.isArray(edition.aspectPassages)
    || [...edition.housePassages, ...edition.aspectPassages].some(passage => !passage || typeof passage !== 'object' || Array.isArray(passage))) return false;
  let manual;
  try { manual = writeupHoroscopes(edition.writeupHoroscopes); } catch { return false; }
  for (const houses of houseOrders) for (const aspects of aspectOrders) {
    const payload = { tldr: edition.tldr, compiledMarkdown: edition.compiledMarkdown,
      housePassages: orderedPassages(edition.housePassages, houses), aspectPassages: orderedPassages(edition.aspectPassages, aspects), ...(manual ? { writeupHoroscopes: manual } : {}) };
    if (createHash('sha256').update(JSON.stringify(payload)).digest('hex') === edition.compiledHash) return true;
  }
  return false;
}
