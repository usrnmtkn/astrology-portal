export const READER_ELIGIBLE_REVIEW_STATUSES: Set<string>;
export function isGovernedReaderEligible(row: Record<string, unknown>, options?: { allowUnreviewed?: boolean }): boolean;
export function requiresExactOwnerApproval(contentKey: unknown): boolean;
export function hasExactOwnerApproval(row: unknown): boolean;
export function transitReaderTier(row: unknown): string | null;
export function synastryReaderTier(row: unknown): string | null;
export function readerEligibilityReason(row: Record<string, unknown>): string | null;
