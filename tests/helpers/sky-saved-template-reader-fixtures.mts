import { compileSkyArticleEdition, type CompileSkyArticleEditionInput } from '../../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../apps/web/src/content/skyIngressEssay.mjs';

// Synthetic intervals exercise selection, not ephemeris accuracy or source approval.
export async function compiledReaderFixture(overrides: Partial<CompileSkyArticleEditionInput> = {}) {
  const ingress = overrides.format === SKY_INGRESS_ARTICLE_FORMAT;
  return compileSkyArticleEdition({
    format: 'saved-template', templateKey: 'sky/article-template/sun/ingress',
    templateBody: '# Synthetic saved-template article\n\nSynthetic saved-template opening.\n\nSynthetic final general sentence.\n\n## Horoscopes\n\n{{risingBlocks}}',
    planet: 'sun', sign: 'scorpio', entryYear: 1901, validFrom: '1901-10-23', validTo: '1901-11-22',
    transitStartInstant: '1901-10-23T00:00:00.000Z', transitEndInstant: '1901-11-23T00:00:00.000Z',
    tldr: 'Synthetic separately authored summary.',
    slotValues: ingress ? {
      articleTitle: 'Synthetic ingress article', when: 'Synthetic calculated interval.',
      articleBody: 'Synthetic ingress opening.\n\nSynthetic ingress final sentence.',
      priorOccurrenceSection: '', otherDatesSection: ''
    } : {},
    housePassages: ingress ? [] : ['scorpio', 'libra', 'virgo', 'leo', 'cancer', 'gemini', 'taurus', 'aries', 'pisces', 'aquarius', 'capricorn', 'sagittarius']
      .map((risingSign, index) => ({ house: index + 1, risingSign, contentKey: 'synthetic/house/' + (index + 1),
        body: 'Synthetic house ' + (index + 1) + ' opening.\n\nSynthetic house ' + (index + 1) + ' final sentence.' })),
    aspectPassages: [], ...overrides
  });
}

export async function legacyIngressReaderFixture() {
  const edition = await compiledReaderFixture({ format: SKY_INGRESS_ARTICLE_FORMAT });
  // Previously published ingress editions stored one complete Overview section.
  edition.articleSections = [{ heading: 'Overview', body: edition.body }];
  return edition;
}

export function compiledReaderRow(edition: Awaited<ReturnType<typeof compiledReaderFixture>>, id = '00000000-0000-4000-8000-000000000001') {
  return {
    id, content_key: edition.contentKey, surface: 'sky', mode: 'article', event_type: 'sky-article-edition',
    block_type: 'sky_article', status: 'LIVE', lane: 'serving', review_state: null,
    headline: edition.headline, summary: edition.tldr, body: edition.body, sections: { skyArticleEdition: edition },
    source_snapshot: { ownerApproval: { approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey,
      templateKey: edition.templateKey, templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash } },
    updated_at: '2026-11-03T00:00:00.000Z'
  };
}

export function compiledReaderCandidate(row: ReturnType<typeof compiledReaderRow>) {
  return { ...row, contentKey: row.content_key, sourceSnapshot: row.source_snapshot, updatedAt: row.updated_at, reviewState: row.review_state };
}
