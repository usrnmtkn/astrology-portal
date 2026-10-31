export const LUNATION_STUDIO_REVISION_SCHEMA: 'content-studio-lunation-revision/v1';
export function isLunationEclipseSectionKey(key: string): boolean;
export function isStudioLunationRevision(record: unknown): boolean;
export function isPinnedLunationBookRevision(section: unknown, book: unknown, bookHash: string, sectionHash: string): boolean;
