import { buildStudioArticleMemoryMap } from './studio-article-memory-map.mjs';
import { activeStudioFeedback, selectStudioFeedback, studioFeedbackEnabled } from './studio-memory-feedback.js';
import { skyArticleEditionContentKey } from '../../apps/web/src/content/skyArticleTemplateCompiler.js';
import { isSkyIngressEssay, isSkyIngressArticle } from '../../apps/web/src/content/skyIngressEssay.mjs';

/** Server-calculated edition identity; caller notes cannot widen passage scope. */
export function studioArticleWritingMemoryKey(input: { planet: string; sign: string; facts: Record<string, unknown> }) {
  const year = input.facts.entryYear;
  if (!Number.isInteger(year) || Number(year) < 1000 || Number(year) > 9999
    || !/^[a-z_]+$/.test(input.planet) || !/^[a-z]+$/.test(input.sign))
    throw new Error('Article memory requires the calculated edition identity. No draft was generated.');

  const format = input.facts.articleFormat;
  const ingress = isSkyIngressEssay(format);
  const validFrom = typeof input.facts.validFrom === 'string' ? input.facts.validFrom : '';
  if (ingress && (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom) || Number(validFrom.slice(0, 4)) !== year)) {
    throw new Error('Ingress article memory requires the calculated visit date. No draft was generated.');
  }
  return skyArticleEditionContentKey({ planet: input.planet, sign: input.sign, entryYear: Number(year), validFrom,
    format: ingress ? format : 'saved-template' });
}

export async function studioArticleWritingMemory(input: { planet: string; sign: string; facts: Record<string, unknown> }) {
  const key = studioArticleWritingMemoryKey(input);
  const feedback = studioFeedbackEnabled()
    ? selectStudioFeedback(await activeStudioFeedback(), key)
    : null;
  const memory = buildStudioArticleMemoryMap(
    { planet: input.planet, sign: input.sign, year: Number(input.facts.entryYear) },
    // The current dated writer already receives its qualified rules in the
    // provider system. Memory contributes correction evidence, not a second
    // generic article rule bundle. Saved/other article workflows retain theirs.
    { studioCorrections: feedback?.corrections ?? [], includeEffectiveRules: !isSkyIngressArticle(input.facts.articleFormat) },
  );

  if (feedback) (memory.receipt as any).studioFeedback = {
    ...feedback.receipt,
    selected: feedback.receipt.selected.filter(item => memory.receipt.selected.some(ref => ref.memoryId === item.memoryId)),
    excluded: [
      ...feedback.receipt.excluded,
      ...memory.receipt.excluded.filter(item => item.memoryId.startsWith('studio-')),
    ],
    promptSha256: memory.receipt.promptSha256,
  };

  return memory;
}
