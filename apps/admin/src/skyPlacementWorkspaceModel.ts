import type { CompositionMapRow } from './compositionMap';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { compileSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields, skyArticleEditionRecord, SKY_ARTICLE_COMPILER_VERSION, type CompiledSkyArticleEdition } from '../../web/src/content/skyArticleTemplateCompiler';

export type PlacementWorkspaceRow = CompositionMapRow & { event_type?: string | null; facts?: Record<string, unknown> | null };
export type PlacementVisitFacts = {
  planet: string; sign: string; entryYear: number; validFrom: string; validTo: string;
  transitStartInstant: string; transitEndInstant: string; referenceTimeZone: string;
  calculationSource: string; generatedAt: string; slotValues: Record<string, string>;
};
export type PlacementGeneratedArticle = { edition: CompiledSkyArticleEdition; generation: Record<string, unknown> | null };

export const placementWorkspaceTabs = [
  { value: 'visit', label: 'This visit' },
  { value: 'default', label: 'Default reading' },
  { value: 'setup', label: 'Writing setup' }
] as const;

export { placementTemplateKeys } from './skyArticleTemplateKeys';

export function placementEdition(row: PlacementWorkspaceRow) {
  return skyArticleEditionRecord((row.sections as { skyArticleEdition?: unknown } | null)?.skyArticleEdition);
}

export function placementWorkspaceDocuments(...sources: PlacementWorkspaceRow[][]) {
  const rows = new Map<string, PlacementWorkspaceRow>();
  for (const row of sources.flat()) {
    if (row.inventory_only) continue;
    const saved = rows.get(row.id);
    if (!saved || (Date.parse(row.updated_at ?? '') || 0) >= (Date.parse(saved.updated_at ?? '') || 0)) rows.set(row.id, row);
  }
  return [...rows.values()];
}

export function placementVisitRows(rows: PlacementWorkspaceRow[], planet: string, sign: string) {
  return rows.filter(row => {
    const edition = placementEdition(row);
    return row.status !== 'ARCHIVED' && edition?.planet === planet && edition.sign === sign;
  }).sort((a, b) => (placementEdition(b)?.transitStartInstant ?? '').localeCompare(placementEdition(a)?.transitStartInstant ?? '')
    || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
}

export function assertPlacementVisit(facts: PlacementVisitFacts, planet: string, sign: string) {
  if (facts.planet !== planet || facts.sign !== sign) throw new Error(`This date is ${facts.planet} in ${facts.sign}. Choose a date when ${planet} is in ${sign}.`);
  if (!Number.isFinite(Date.parse(facts.transitStartInstant)) || !Number.isFinite(Date.parse(facts.transitEndInstant))
    || Date.parse(facts.transitEndInstant) <= Date.parse(facts.transitStartInstant) || !facts.slotValues.when) {
    throw new Error('The calculated visit is incomplete. Your writing has not been changed.');
  }
}

/** Only the dated draft is written. No default, source template or authoring workspace is updated. */
export async function placementVisitDraft(facts: PlacementVisitFacts, fields: { headline: string; summary: string; body: string }, template?: PlacementWorkspaceRow, options: { generated?: PlacementGeneratedArticle | null } = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Use named draft options; article creation always covers the full calculated visit.');
  if (Object.hasOwn(facts, 'scope')) throw new Error('New articles use the full calculated visit. Open a saved day article to edit its existing date and scope.');
  const generated = options.generated;
  if (generated?.edition.scope) throw new Error('Use a generated full-visit article. Saved day articles keep their own identity.');
  if (!fields.headline.trim() || !fields.summary.trim() || !fields.body.trim()) throw new Error('Add a title, summary and article body before saving.');
  if (generated && (generated.edition.planet !== facts.planet || generated.edition.sign !== facts.sign
    || generated.edition.transitStartInstant !== facts.transitStartInstant || generated.edition.transitEndInstant !== facts.transitEndInstant))
    throw new Error('The generated article belongs to a different visit. Your writing has not been changed.');
  const edition = generated ? await reviseSkyArticleEdition(generated.edition, { ...skyArticleEditableFields(generated.edition), headline: fields.headline, tldr: fields.summary, body: fields.body }) : await compileSkyArticleEdition({
    ...facts, format: SKY_INGRESS_ARTICLE_FORMAT,
    templateBody: template?.body ?? '', templateKey: template?.content_key ?? 'sky/article-template/ingress-layout/v3',
    tldr: fields.summary, housePassages: [], aspectPassages: [],
    slotValues: { ...facts.slotValues, articleTitle: fields.headline, articleBody: fields.body }
  });
  return {
    contentKey: edition.contentKey, surface: 'sky', mode: 'article', status: 'DRAFT',
    eventType: 'sky-article-edition', headline: edition.headline, summary: edition.tldr, body: edition.body,
    sections: { skyArticleEdition: edition },
    facts: { planet: facts.planet, sign: facts.sign, validFrom: facts.validFrom, validTo: facts.validTo,
      calculationSource: facts.calculationSource, calculationGeneratedAt: facts.generatedAt },
    sourceSnapshot: { contentType: 'compiled-sky-article-edition', content_role: 'authored_card', review_status: 'needs_review',
      templateKey: edition.templateKey, templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash,
      compiledHash: edition.compiledHash, engineFacts: facts, templateOrigin: generated ? 'standard-ingress-layout' : template ? 'saved-source' : 'built-in-ingress-layout',
      ...(generated ? { slotGeneration: generated.generation } : {}) },
    lane: 'reference', reviewState: 'owner-review-required', blockType: 'sky_article',
    promptVersion: SKY_ARTICLE_COMPILER_VERSION, provider: 'owner-compiled-sky-article', model: 'deterministic-template-compiler'
  };
}
