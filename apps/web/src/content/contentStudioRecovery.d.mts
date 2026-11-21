import type { GeneratedContentRow } from '../services/generatedContent';
export const recoveryBranch: string;
export const recoverySnapshotPath: string;
export const recoverySnapshotUrl: string;
export const recoveryDeploymentConfig: string;
export interface RecoverySnapshot {
  schema: 'content-studio-last-known-good-v2';
  sourceRevision: string;
  rowCount: number;
  rows: GeneratedContentRow[];
  publications: unknown[];
}
export function validateRecoverySnapshot(snapshot: unknown): RecoverySnapshot;
