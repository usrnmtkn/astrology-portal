export const lunationKey = 'authored/sky-lunation-macro/new-moon/aquarius';
export const lunationOriginal = 'Synthetic saved lunar opening.\n\nSynthetic saved lunar ending.';
export const lunationRevision = 'Synthetic revised lunar opening preserved in full.\n\nA separate middle paragraph remains exactly as entered.\n\nSynthetic revised lunar final sentence.';

export function lunationPublicationDraft() {
  const record = { contentKey: lunationKey, content_role: 'authored_card', review_status: 'needs_review', headline: 'Aquarius New Moon', body: lunationOriginal, source_keys: [], notes: '' };
  return {
    id: 'lunation-publication-fixture', content_key: lunationKey, provider: 'tldrastro-fallback-architecture-v3',
    surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference', review_state: 'needs-review',
    event_type: 'fallback-hook', block_type: null, knowledge_ids: [], prompt_version: 'manual-admin', model: 'manual', headline: record.headline, summary: '', body: record.body,
    sections: { packageRecord: record, packageOriginalRecord: structuredClone(record), packageDraft: structuredClone(record) },
    source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', contentType: 'authored-content', content_role: 'authored_card', review_status: 'needs_review' },
    facts: { fallbackArchitectureV3: true, content_role: 'authored_card', review_status: 'needs_review' },
    updated_at: '2026-09-23T04:00:00.000Z', created_at: '2026-09-23T04:00:00.000Z', flags: []
  };
}
