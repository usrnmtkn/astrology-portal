import { buildStudioArticleMemoryMap } from './studio-article-memory-map.mjs';
import { activeStudioFeedback, selectStudioFeedback, studioFeedbackEnabled } from './studio-memory-feedback.js';

/** Server-calculated edition identity; caller notes cannot widen passage scope. */
export async function studioArticleWritingMemory(input: { planet: string; sign: string; facts: Record<string, unknown> }) {
  const year = input.facts.entryYear;
  if (!Number.isInteger(year) || Number(year) < 1000 || Number(year) > 9999
    || !/^[a-z_]+$/.test(input.planet) || !/^[a-z]+$/.test(input.sign))
    throw new Error('Article memory requires the calculated edition identity. No draft was generated.');

  const key = `sky-article/${input.planet}/${input.sign}/${year}`;
  const feedback = studioFeedbackEnabled()
    ? selectStudioFeedback(await activeStudioFeedback(), key)
    : null;
  const memory = buildStudioArticleMemoryMap(
    { planet: input.planet, sign: input.sign, year: Number(year) },
    { studioCorrections: feedback?.corrections ?? [] },
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
