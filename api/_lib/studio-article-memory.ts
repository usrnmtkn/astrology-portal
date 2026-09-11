import { activeStudioFeedback, selectStudioFeedback, studioFeedbackEnabled } from './studio-memory-feedback.js';

/** Server-calculated edition identity; caller notes cannot widen passage scope. */
export async function studioArticleWritingMemory(input: { planet: string; sign: string; facts: Record<string, unknown> }) {
  if (!studioFeedbackEnabled()) return null;
  const year = input.facts.entryYear;
  if (!Number.isInteger(year) || Number(year) < 1000 || Number(year) > 9999
    || !/^[a-z_]+$/.test(input.planet) || !/^[a-z]+$/.test(input.sign))
    throw new Error('Article memory requires the calculated edition identity. No draft was generated.');
  return selectStudioFeedback(await activeStudioFeedback(), `sky-article/${input.planet}/${input.sign}/${year}`);
}
