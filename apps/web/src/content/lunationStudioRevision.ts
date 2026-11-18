import type * as Contract from './fallbackArchitectureV3/resolver/lunationStudioRevision.mjs';
// @ts-ignore The package's generated ESM artifact has no declaration file.
import { isLunationEclipseSectionKey as eclipseKey, isStudioLunationRevision as studioRevision, isPinnedLunationBookRevision as pinnedBook, LUNATION_STUDIO_REVISION_SCHEMA as schema } from './fallbackArchitectureV3/dist/tldr-content.js';

// Share the shipped resolver's implementation instead of downloading a second
// copy of the publication contract in the initial reader graph.
export const isLunationEclipseSectionKey: typeof Contract.isLunationEclipseSectionKey = eclipseKey;
export const isStudioLunationRevision: typeof Contract.isStudioLunationRevision = studioRevision;
export const isPinnedLunationBookRevision: typeof Contract.isPinnedLunationBookRevision = pinnedBook;
export const LUNATION_STUDIO_REVISION_SCHEMA: typeof Contract.LUNATION_STUDIO_REVISION_SCHEMA = schema;
