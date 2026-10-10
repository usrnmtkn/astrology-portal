import { compileSkyArticleEdition } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import { skyIngressEssayFields } from '../../apps/web/src/content/skyIngressEssay.mjs';

export async function syntheticLibrarySkyArticle() {
  const slotValues = Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic ${name}.`]));
  Object.assign(slotValues, { articleTitle: 'Synthetic dated Sky article', overviewHeading: 'Synthetic overview',
    overviewBody: 'Synthetic complete dated opening.', closingHeading: 'Synthetic close', closingBody: 'Synthetic complete dated ending.',
    priorOccurrenceSection: '', otherDatesSection: '', majorTransitSections: '## Synthetic transit\n\nSynthetic dated transit paragraph.' });
  const edition = await compileSkyArticleEdition({ format: 'ingress-essay-v2', planet: 'sun', sign: 'libra', entryYear: 2026,
    validFrom: '2026-09-22', validTo: '2026-10-23', transitStartInstant: '2026-09-23T00:05:14Z', transitEndInstant: '2026-10-23T09:37:57Z',
    referenceTimeZone: 'America/New_York', templateKey: 'sky/article-template/sun/libra', templateBody: '',
    tldr: 'Synthetic saved dated summary.', slotValues, housePassages: [] });
  return { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: edition.contentKey, surface: 'sky', mode: 'article',
    status: 'LIVE', lane: 'serving', review_state: null, event_type: 'sky-article-edition', block_type: 'sky_article', target_date: null,
    updated_at: '2026-10-09T00:00:00Z', headline: edition.headline, body: edition.body, summary: edition.tldr,
    sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: {
      approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey, templateKey: edition.templateKey,
      templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash
    } } };
}
