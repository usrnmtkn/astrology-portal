import bundledRelationshipAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json";
import bundledRelationshipHookRowsV3 from "./fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json";
import bundledSharedPlacementRowsV3 from "./fallbackArchitectureV3/bundled-shared-placement-rows-v3.json";
import synastryDirectionalOverridesV1 from "./fallbackArchitectureV3/source-rows/synastry-directional-overrides-v1.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle,
  HookRow
} from "./fallbackArchitectureV3Runtime";
import { isFriendsAcceptedApprovalLevel } from "./fallbackApproval";

const approvedBondEffectRows = bundledRelationshipHookRowsV3.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/bond-effect-")
));

if (
  approvedBondEffectRows.length !== 139
  || approvedBondEffectRows.some((row) => (
    row.review_status !== "approved"
    || !isFriendsAcceptedApprovalLevel(row.approval?.approvalLevel)
  ))
) {
  throw new Error("Relationship bundle must serve all 139 owner-approved directional bond rows.");
}

const approvedSynastryDirectionalOverrides = synastryDirectionalOverridesV1.rows as HookRow[];
if (
  approvedSynastryDirectionalOverrides.length !== 24
  || approvedSynastryDirectionalOverrides.some((row) => (
    row.review_status !== "approved"
    || row.directionality_mode !== "viewer-centered-synastry-v1"
    || !row.body_you?.trim()
    || !row.body_they?.trim()
  ))
) {
  throw new Error("Relationship bundle must serve all 24 owner-approved synastry directionality overrides.");
}

export const relationshipFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: bundledRelationshipAuthoredCardsV3.authoredCards as AuthoredCard[]
  },
  templatesFile: {
    templates: []
  },
  rowsFile: {
    hookRows: [
      ...(bundledRelationshipHookRowsV3.hookRows as HookRow[]),
      ...(bundledSharedPlacementRowsV3.hookRows as HookRow[]),
      ...approvedSynastryDirectionalOverrides
    ],
    vocabularyRows: []
  }
};
