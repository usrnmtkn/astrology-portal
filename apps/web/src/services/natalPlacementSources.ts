import { loadDeferredFallbackArchitectureV3Bundle, loadFallbackArchitectureV3BundledCoreManifest } from '../content/fallbackArchitectureV3Runtime';
import { contentPublication, publicationAllowsContent } from '../content/contentPublicationState';
import { contentPublicationsAvailableOnline, contentPublicationsResolved, refreshContentPublications } from './contentPublications';
import { loadContentStudioLastKnownGoodRows } from './generatedContent';
import { loadReaderRows } from './readerContentClient';
import { packageFallbackArchitectureV3CoreRows } from './fallbackArchitectureV3CorePackaging';
import { natalPlacementSourceKeys } from '../content/natalPlacementSourceKeys';

export type NatalPlacementSourceSelection = { planet: string; sign: string; house?: string; motion: string; dignity?: string };

/** Load this article's published dependencies without waiting for the library. */
export async function prepareNatalPlacementSources(selection: NatalPlacementSourceSelection, signal: AbortSignal) {
  const keys = natalPlacementSourceKeys(selection.planet, selection.sign, selection.house, selection.motion);
  if (selection.dignity) keys.push(`fallback-hook/dignity-line/${selection.dignity}/${selection.planet}`, `fallback-template/natal.modifier.dignity-${selection.dignity}`);
  await Promise.all([loadDeferredFallbackArchitectureV3Bundle(), refreshContentPublications()]);
  signal.throwIfAborted();
  if (!contentPublicationsResolved()) throw new Error('Natal publication state is unavailable.');
  const manifest = await loadFallbackArchitectureV3BundledCoreManifest();
  const selected = new Set(keys);
  const live = keys.filter(key => contentPublication(key)?.state === 'live' && contentPublication(key)?.row_id);
  const result = contentPublicationsAvailableOnline()
    ? live.length ? await loadReaderRows({ keys: live }, signal) : { data: [], error: null }
    : { data: (await loadContentStudioLastKnownGoodRows()).filter(row => selected.has(row.content_key)), error: null };
  signal.throwIfAborted();
  if (result.error) throw result.error;
  const rows = (result.data ?? []).filter(row => selected.has(row.content_key));
  const required = keys.filter(key => contentPublication(key)?.state === 'live' && contentPublication(key)?.row_id);
  if (required.some(key => !rows.some(row => row.content_key === key && publicationAllowsContent(key, row.id, row.updated_at)))) {
    throw new Error('Some published natal sources did not load.');
  }
  const bundle = packageFallbackArchitectureV3CoreRows(rows, manifest);
  const packaged = new Set([
    ...(bundle?.rowsFile.hookRows ?? []), ...(bundle?.rowsFile.vocabularyRows ?? []),
    ...(bundle?.templatesFile.templates ?? []), ...(bundle?.transitLib.authoredCards ?? [])
  ].map(row => row.contentKey));
  if (required.some(key => !packaged.has(key))) throw new Error('Published natal sources are unavailable.');
  return bundle;
}
