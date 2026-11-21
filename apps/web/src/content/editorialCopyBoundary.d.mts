export const READER_FIELDS: RegExp;

export type ReaderCopyField = {path: string; text: string};
export type ReaderCopyIssue = {path: string; reason: string};

export function editorialTextIssues(text: unknown): string[];
export function readerCopyFields(value: unknown, path?: string, inheritedReader?: boolean): ReaderCopyField[];
export function readerCopyIssues(row: unknown): ReaderCopyIssue[];
export function assertCleanReaderCopy(row: unknown): void;
export function separateOwnerArticle(text: string, options?: {editorOnly?: boolean}): {
  body: string;
  headline: string;
  notes: string[];
  originalText: string;
  slotDescriptions: Record<string, string[]>;
  editorOnly: boolean;
};
