import { placementVisitDraft, type PlacementVisitFacts } from '../../apps/admin/src/skyPlacementWorkspaceModel';

/** Synthetic text and explicit expected calculation responses. Never imported by runtime code. */
export function workspaceVisitFacts(planet = 'sun', sign = 'scorpio', start = '2026-10-23', end = '2026-11-22'): PlacementVisitFacts {
  return { planet, sign, entryYear: Number(start.slice(0, 4)), validFrom: start, validTo: end,
    transitStartInstant: `${start}T09:37:56.999Z`, transitEndInstant: `${end}T07:23:20.999Z`,
    referenceTimeZone: 'America/New_York', calculationSource: 'isolated synthetic fixture', generatedAt: `${start}T12:00:00Z`,
    slotValues: { sign, articleTitle: `Synthetic ${planet} in ${sign}`, when: `${start} at 5:37 AM EDT to ${end} at 2:23 AM EST` } };
}

export async function workspaceFixtureRows() {
  const facts = workspaceVisitFacts();
  const draft = await placementVisitDraft(facts, { headline: 'Synthetic Scorpio 2026 draft', summary: 'Synthetic summary kept exactly.',
    body: 'Synthetic approved opening kept exactly.\n\n## Synthetic section\n\nSynthetic final sentence kept exactly.' });
  const common = { surface: 'sky', mode: 'article', target_date: null, created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-23T10:00:00.000Z', flags: [], inventory_only: false };
  return [
    { ...common, ...Object.fromEntries(Object.entries(draft).filter(([key]) => !['contentKey', 'eventType', 'sourceSnapshot', 'reviewState', 'blockType', 'promptVersion'].includes(key))),
      id: 'workspace-scorpio-draft', content_key: draft.contentKey, event_type: draft.eventType, source_snapshot: draft.sourceSnapshot,
      review_state: draft.reviewState, block_type: draft.blockType, prompt_version: draft.promptVersion },
    { ...common, id: 'workspace-default', content_key: 'sky-placement/article/sun/scorpio', status: 'DRAFT', lane: 'reference',
      provider: 'tldrastro-fallback-architecture-v3-sky-placement', event_type: 'fallback-hook', block_type: 'fallback_hook',
      headline: 'Synthetic Scorpio default', summary: '', body: 'Synthetic year-neutral default remains intact.', review_state: 'needs-review',
      sections: { packageRecord: { contentKey: 'sky-placement/article/sun/scorpio', placementArticle: 'Synthetic year-neutral default remains intact.',
        studio_content_type: 'continuous-placement', studio_editable_fields: [{ path: 'placementArticle', label: 'Shared placement article' }],
        content_role: 'hook', review_status: 'needs_review' } },
      source_snapshot: { review_status: 'needs_review' }, facts: {} },
    { ...common, id: 'workspace-template', content_key: 'sky/article-template/sun/scorpio', status: 'DRAFT', lane: 'reference',
      event_type: 'sky-article-template', block_type: 'sky_article', headline: 'Synthetic reusable Scorpio template', summary: '',
      body: '# Synthetic reusable {{sign}} template\n\nPreserve this for future visits. {{entryDate}}',
      sections: {}, source_snapshot: {}, facts: {}, review_state: null }
  ];
}
