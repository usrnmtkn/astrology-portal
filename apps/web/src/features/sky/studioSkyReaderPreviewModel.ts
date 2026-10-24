import { assertCompiledSkyArticleEdition } from '../../content/skyArticleTemplateCompiler';
import { isSkyIngressEssay } from '../../content/skyIngressEssay.mjs';
import { publicationTimestamp } from '../../content/contentPublicationState';
import type { LiveGeneratedContent } from '../../services/generatedContent';
import type { SkyDetail } from './SkyDetailArticle';
import type { SkyReaderPreviewRequest, SkyReaderPreviewSource } from '../../../../../src/shared/skyReaderPreview';

/** A disposable simulation map. Never install it in a reader cache or submit it to storage. */
export function skyReaderPreviewDraftMap(published: Map<string, LiveGeneratedContent>, draft: NonNullable<SkyReaderPreviewRequest['draft']>, planet: string, sign: string) {
  const edition = assertCompiledSkyArticleEdition(draft.edition);
  if (edition.planet !== planet || edition.sign !== sign) throw new Error('This draft belongs to a different Sky placement.');
  if (!isSkyIngressEssay(edition.format)) throw new Error('This article format is not selected by the current Sky reader.');
  const existing = published.get(edition.contentKey);
  const current = (existing?.sections as { skyArticleEdition?: { compiledHash?: string } } | undefined)?.skyArticleEdition;
  if (draft.requiresPublishedBase && !current) throw new Error('The original published article is no longer available. Reopen the revision before publishing.');
  if (existing && draft.baseVersion && publicationTimestamp(existing.updatedAt) !== publicationTimestamp(draft.baseVersion)) throw new Error('The published version changed after this draft began. Reopen the revision before publishing.');
  if (current && current.compiledHash !== draft.baseCompiledHash) throw new Error('The published article changed after this draft began. Reopen the revision before comparing or publishing.');
  const result = new Map(published);
  result.set(edition.contentKey, {
    id: 'studio-preview-only', contentKey: edition.contentKey, surface: 'sky', mode: 'article',
    eventType: 'sky-article-edition', targetDate: null, headline: edition.headline, summary: edition.tldr,
    body: edition.body, sections: { skyArticleEdition: edition }, status: 'LIVE', lane: 'serving', reviewState: null,
    model: null, updatedAt: existing?.updatedAt ?? '',
    // Simulate the exact approval receipt produced by publication, only in this disposable map.
    sourceSnapshot: { previewOnly: true, ownerApproval: { approved: true, action: 'approve-sky-article-edition',
      contentKey: edition.contentKey, templateKey: edition.templateKey, templateHash: edition.templateHash,
      fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash } }
  });
  return result;
}

export function skyReaderPreviewSource(detail: SkyDetail): SkyReaderPreviewSource {
  const source = detail.readerExport;
  const rows = source?.rows ?? [];
  const edition = rows.map(row => (row.sections as { skyArticleEdition?: { validFrom?: string; validTo?: string } } | undefined)?.skyArticleEdition).find(Boolean);
  const season = rows.map(row => (row.sections as { seasonFallback?: { seasonStart?: string; seasonEnd?: string } } | undefined)?.seasonFallback).find(Boolean);
  return {
    title: detail.title,
    keys: source?.keys.filter(key => key !== 'compiled-sky-article-edition-v2') ?? [],
    versions: rows.filter(row => row.id !== 'studio-preview-only').map(row => `${row.contentKey}: ${row.updatedAt ?? ''}`),
    role: edition || season || source?.keys.some(key => key.startsWith('sky-article/') || key === 'sky-article-v1') ? 'Dated article' : 'Shared fallback',
    status: rows.some(row => row.id === 'studio-preview-only') ? 'Draft simulation' : rows.length ? 'Published' : 'Bundled fallback',
    validFrom: edition?.validFrom ?? season?.seasonStart ?? '', validTo: edition?.validTo ?? season?.seasonEnd ?? ''
  };
}
