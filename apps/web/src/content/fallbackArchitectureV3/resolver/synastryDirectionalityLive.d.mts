export const SYNNASTRY_DIRECTIONALITY_LIVE_SCHEMA: "synastry-directionality-live/v1";
export const SYNNASTRY_DIRECTIONALITY_MODE: "viewer-centered-synastry-v1";

export type SynastryDirectionalityLivePatch = {
  contentKey: string;
  existingSemanticDirection: string;
  missingSemanticDirection: string;
  body_you: string;
};

export type SynastryDirectionalityLiveOverlay = {
  schema: "synastry-directionality-live/v1";
  release_id: string;
  directionality_mode: "viewer-centered-synastry-v1";
  approved_at: string;
  serving_authorized_at: string;
  approval_record: string;
  rows: SynastryDirectionalityLivePatch[];
};

export function applySynastryDirectionalityLiveV1<T extends { contentKey?: string; [key: string]: unknown }>(
  baseRows: T[],
  overlay: SynastryDirectionalityLiveOverlay
): T[];
