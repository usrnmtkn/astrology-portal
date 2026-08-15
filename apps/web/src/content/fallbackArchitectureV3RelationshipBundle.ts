import bundledRelationshipAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json";
import bundledRelationshipHookRowsV3 from "./fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json";
import bundledSharedPlacementRowsV3 from "./fallbackArchitectureV3/bundled-shared-placement-rows-v3.json";
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
      ...(bundledSharedPlacementRowsV3.hookRows as HookRow[])
    ],
    vocabularyRows: []
  }
};
