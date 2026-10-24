import { compileSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';

export async function skyPlacementSourceFixture(planet = 'saturn', sign = 'aries') {
  const name = planet[0].toUpperCase() + planet.slice(1);
  const edition = await compileSkyArticleEdition({
    format: 'ingress-essay-v2', templateBody: '', templateKey: `sky/article-template/${planet}/ingress`,
    planet, sign, entryYear: 2026, validFrom: '2026-09-22', validTo: '2026-10-23',
    transitStartInstant: '2026-09-22T00:00:00Z', transitEndInstant: '2026-10-23T00:00:00Z',
    tldr: 'Synthetic published summary.', housePassages: [], aspectPassages: [],
    slotValues: { articleTitle: `Synthetic ${name} article`, when: 'Synthetic calculated window.', what: 'Synthetic event.',
      takeaway: 'Synthetic takeaway.', overviewHeading: 'Synthetic overview', overviewBody: 'Synthetic published opening.\n\nSynthetic published final sentence.',
      majorTransitSections: 'Synthetic supported contact.', closingHeading: 'Synthetic closing', closingBody: 'Synthetic complete close.' }
  });
  const approval = { approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey,
    templateKey: edition.templateKey, templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash };
  const active = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: edition.contentKey, status: 'LIVE',
    surface: 'sky', mode: 'article', event_type: 'sky-article-edition', block_type: 'sky_article', target_date: null,
    lane: 'serving', review_state: null, headline: edition.headline, summary: edition.tldr, body: edition.body,
    sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: approval }, updated_at: '2026-10-01T00:00:00Z' };
  const revised = await reviseSkyArticleEdition(edition, { ...skyArticleEditableFields(edition), body: 'Synthetic pending revision opening.\n\nSynthetic pending revision final sentence.' });
  const pending = { ...structuredClone(active), id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    content_key: active.content_key.replace('sky-article/', 'sky-article-revision/'), status: 'DRAFT',
    event_type: 'sky-article-edition-revision', lane: 'reference', review_state: 'owner-review-required',
    body: revised.body, sections: { skyArticleEdition: revised, skyArticleRevisionBase: edition },
    source_snapshot: { targetRowId: active.id, targetRowUpdatedAt: active.updated_at }, updated_at: '2026-10-02T00:00:00Z' };
  const fallback = { ...structuredClone(active), id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
    content_key: `sky-placement/article/${planet}/${sign}`, headline: `Synthetic shared ${name} fallback`, mode: 'in_depth',
    event_type: 'fallback-hook', block_type: 'fallback_hook', provider: 'tldrastro-fallback-architecture-v3',
    body: 'Synthetic reusable placement passage.',
    sections: { packageRecord: { ...structuredClone(skyPlacementSourceRecords.get(`sky-placement/article/${planet}/${sign}`)),
      contentKey: `sky-placement/article/${planet}/${sign}`, content_role: 'full_copy',
      review_status: 'approved', owner_approved: true, serving_enabled: true,
      placementArticle: 'Synthetic reusable placement passage.', tldrWhat: 'Synthetic fallback summary.',
      fallback: { hook: 'Synthetic fallback opening.', lived: 'Synthetic fallback middle.', turn: 'Synthetic fallback close.' } } },
    source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'approved' } };
  return { edition, active, pending, fallback };
}
