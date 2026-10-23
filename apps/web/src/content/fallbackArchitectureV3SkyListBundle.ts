import rows from './fallbackArchitectureV3/initial-sky-list-rows-v1.json';
import type { FallbackArchitectureV3Bundle, HookRow } from './fallbackArchitectureV3Runtime';
export { loadCanonicalSkyV4ReaderRoute } from './skyCanonicalReader';

// Other current placements use the complete canonical reader. The Moon keeps
// its separate, complete opening/lived/turn sources on the list.
export const initialSkyListBundle: FallbackArchitectureV3Bundle = {
  transitLib: { authoredCards: [] }, templatesFile: { templates: [] },
  rowsFile: { hookRows: rows.hookRows as HookRow[], vocabularyRows: [] }
};
