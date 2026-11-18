export const lunarOwnerKey = 'cms/lunation-article/2026-09-26/full-moon/aries';
export const lunarOwnerBody = 'Synthetic lunar opening preserved exactly.\n\nSynthetic complete lunar ending.';

export function lunarOwnerDraft() {
  return {
    id: 'a0000000-0000-4000-8000-000000000026', content_key: lunarOwnerKey,
    status: 'DRAFT', lane: 'reference', review_state: null,
    surface: 'sky', mode: 'article', event_type: 'lunation-article', block_type: 'sky_article',
    provider: 'manual-admin', headline: 'Full Moon in Aries', summary: '', body: lunarOwnerBody,
    sections: {}, facts: {}, flags: [], target_date: null, updated_at: '2026-09-25T12:00:00Z',
    source_snapshot: {
      contentType: 'mustache-template', contentSystem: 'cms-surface-override', allowedSlots: [],
      lunationWorkspace: { lint: { passed: true, validationProfile: 'legacy', violations: [] } }
    }
  };
}
