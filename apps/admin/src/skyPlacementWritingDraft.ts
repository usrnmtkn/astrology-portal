import { skyArticleEditionContentKey } from '../../web/src/content/skyArticleTemplateCompiler';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { assertPlacementVisit, placementEdition, type PlacementVisitFacts, type PlacementWorkspaceRow } from './skyPlacementWorkspaceModel';
import type { WriteupHoroscope } from '../../../src/shared/skyWriteupHoroscopes';
import type { SkyReaderArticleCopy } from '../../../src/shared/skyReaderPreview';

export type PlacementWritingFields = { headline: string; summary: string; body: string; writeupHoroscopes?: WriteupHoroscope[] };
type WritingDraft = {
  schema: 'sky-placement-writing-draft-v1'; facts: PlacementVisitFacts; fields: PlacementWritingFields;
  targetContentKey: string; targetRowId?: string; targetRowUpdatedAt?: string;
  compiledDraft?: { id: string; updatedAt?: string | null };
  readerImport: SkyReaderArticleCopy | null;
};

export function placementWritingDraft(row: PlacementWorkspaceRow): WritingDraft | null {
  const value = (row.sections as { skyPlacementWritingDraft?: WritingDraft } | null)?.skyPlacementWritingDraft;
  if (row.event_type !== 'sky-article-edition-workspace' || value?.schema !== 'sky-placement-writing-draft-v1'
    || !value.fields || !value.facts || !['headline', 'summary', 'body'].every(key => typeof value.fields[key as keyof PlacementWritingFields] === 'string')) return null;
  try { assertPlacementVisit(value.facts, value.facts.planet, value.facts.sign); } catch { return null; }
  const target = value.targetContentKey;
  const expected = skyArticleEditionContentKey({ ...value.facts, format: SKY_INGRESS_ARTICLE_FORMAT });
  if (value.fields.writeupHoroscopes !== undefined && (!Array.isArray(value.fields.writeupHoroscopes)
    || value.fields.writeupHoroscopes.some(passage => !passage || typeof passage.sign !== 'string' || typeof passage.body !== 'string'))) return null;
  return typeof target === 'string' && (target === expected || Boolean(value.targetRowId) && target.startsWith(`sky-article/${value.facts.planet}/${value.facts.sign}/`))
    && row.status === 'DRAFT' && row.lane === 'reference' && (row.content_key === placementWritingDraftKey(target)
      || row.content_key.startsWith(placementWritingDraftKey(target) + '/')) ? value : null;
}

export const placementWritingDraftKey = (target: string) => target.replace(/^sky-article\//u, 'sky-article-workspace/') + '/editor';

/** Private working copy, never a compiled or reader-eligible edition. */
export function placementWritingDraftPayload(facts: PlacementVisitFacts, fields: PlacementWritingFields,
  readerImport: SkyReaderArticleCopy | null, target?: PlacementWorkspaceRow | null, workspace?: PlacementWorkspaceRow | null) {
  assertPlacementVisit(facts, facts.planet, facts.sign);
  const targetContentKey = target && placementEdition(target)?.contentKey || skyArticleEditionContentKey({ ...facts, format: SKY_INGRESS_ARTICLE_FORMAT });
  const draft: WritingDraft = { schema: 'sky-placement-writing-draft-v1', facts, fields, targetContentKey, readerImport,
    ...(target ? { targetRowId: target.id, targetRowUpdatedAt: target.updated_at ?? undefined } : {}) };
  return { contentKey: workspace?.content_key ?? `${placementWritingDraftKey(targetContentKey)}/${crypto.randomUUID()}`, surface: 'sky', mode: 'article', status: 'DRAFT',
    eventType: 'sky-article-edition-workspace', headline: fields.headline || 'Untitled article', summary: fields.summary, body: fields.body,
    sections: { skyPlacementWritingDraft: draft }, lane: 'reference', reviewState: 'owner-review-required', blockType: 'sky_article',
    provider: 'owner-edited-sky-article', model: 'manual', sourceSnapshot: { contentType: 'sky-article-edition-workspace',
      review_status: 'needs_review', targetContentKey } };
}

/** Existing editions keep their saved period even when their engine snapshot predates this editor. */
export function placementWritingFacts(row: PlacementWorkspaceRow): PlacementVisitFacts | null {
  const edition = placementEdition(row);
  if (!edition) return null;
  const saved = (row.source_snapshot as { engineFacts?: PlacementVisitFacts } | null)?.engineFacts;
  return saved && saved.transitStartInstant === edition.transitStartInstant && saved.transitEndInstant === edition.transitEndInstant ? saved : {
    planet: edition.planet, sign: edition.sign, entryYear: edition.entryYear, validFrom: edition.validFrom, validTo: edition.validTo,
    transitStartInstant: edition.transitStartInstant, transitEndInstant: edition.transitEndInstant, slotValues: edition.slotValues,
    calculationSource: 'saved-article-edition', generatedAt: row.updated_at ?? '', referenceTimeZone: 'America/New_York'
  };
}
