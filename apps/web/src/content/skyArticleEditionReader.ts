import { writeupHoroscopesReady } from '../../../../src/shared/skyWriteupHoroscopes.js';
import { assertCompiledSkyArticleEdition, hasExactSkyArticleOwnerApproval, skyArticleEditionContentKey, skyArticleReaderCopyIsConsistent } from './skyArticleTemplateCompiler.js';
import { isSkyIngressEssay } from './skyIngressEssay.mjs';

type ReaderEditionRow = {
  content_key: string; status?: string | null; lane?: string | null; review_state?: string | null;
  headline?: string | null; summary?: string | null; body?: string | null;
  sections?: unknown; source_snapshot?: Record<string, unknown> | null;
};

/** Shared row validation; publication identity and active dates remain caller gates. */
export function approvedSkyArticleReaderEdition(row: ReaderEditionRow) {
  if (row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state != null) return null;
  try {
    const edition = assertCompiledSkyArticleEdition((row.sections as { skyArticleEdition?: unknown } | null)?.skyArticleEdition);
    if (edition.format !== undefined && edition.format !== 'saved-template' && !isSkyIngressEssay(edition.format)) return null;
    if (row.content_key !== edition.contentKey || edition.contentKey !== skyArticleEditionContentKey(edition)
      || row.headline !== edition.headline || row.summary !== edition.tldr || row.body !== edition.body
      || !hasExactSkyArticleOwnerApproval(edition, row.source_snapshot)
      || typeof edition.compiledMarkdown !== 'string' || !edition.compiledMarkdown.trim()
      || edition.compiledMarkdown.match(/^#\s+(.+)$/mu)?.[1]?.trim() !== edition.headline
      || !skyArticleReaderCopyIsConsistent(edition)
      || !writeupHoroscopesReady(edition.writeupHoroscopes)
      || !isSkyIngressEssay(edition.format) && (edition.housePassages.length !== 12
        || edition.housePassages.some(passage => typeof passage.body !== 'string' || !passage.body.trim()))) return null;
    return edition;
  } catch {
    return null;
  }
}

/** The existing article header displays the first authored title once. */
export function skyArticleReaderMarkdown(edition: { compiledMarkdown: string }) {
  return edition.compiledMarkdown.replace(/^#\s+.+$(?:\r?\n)?/mu, '');
}
