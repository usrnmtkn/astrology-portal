import { readFileSync } from 'node:fs';
import { retainPersonalTransitAlternate } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/personalTransitCopyVersions.mjs';

// Synthetic text keeps the complete published-source contract in browser tests.
export const moonRoutingIdentities = JSON.parse(readFileSync('tests/fixtures/moon-transit-legacy-identities.json', 'utf8')) as { contentKey: string; natal: string }[];
export const moonRoutingRecords = moonRoutingIdentities.map(({ contentKey }, index) => {
  const row = { contentKey, content_role: 'full_copy', surface: 'transit-aspect', review_status: 'approved',
    approval: { approvalLevel: 'exact_owner_approved', recordPath: 'qa://moon-routing', payloadSha256: 'a'.repeat(64), approvedAt: '2026-10-15T22:00:00.000Z' },
    headline: 'Moon transit', body_you: `Retained You source ${index + 1}.\n\nRetained You final sentence ${index + 1}.`,
    body_they: `Retained Friend source ${index + 1}.\n\nRetained Friend final sentence ${index + 1}.` };
  return { ...row, ...retainPersonalTransitAlternate(row, 'qa-original-version'),
    body_you: `Primary You source ${index + 1}.\n\nPrimary You final sentence ${index + 1}.`,
    body_they: `Primary Friend source ${index + 1}.\n\nPrimary Friend final sentence ${index + 1}.` };
});
export const moonRoutingRows = moonRoutingRecords.map((record, index) => ({
  id: `aaaaaaaa-aaaa-aaaa-aaaa-${String(index + 1).padStart(12, '0')}`, content_key: record.contentKey,
  surface: 'you', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null,
  provider: 'tldrastro-fallback-architecture-v3', updated_at: '2026-10-15T22:00:00.000Z',
  headline: record.headline, body: record.body_you, facts: { content_role: 'full_copy', review_status: 'approved' },
  source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'approved' },
  sections: { packageRecord: record }
}));
export const moonRoutingPublications = moonRoutingRows.map(row => ({ content_key: row.content_key, state: 'live' as const,
  revision: 100_000, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at }));
