import bundledRelationshipAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json";
import bondLanguagePass2 from "./fallbackArchitectureV3/source-rows/bond-language-pass-2.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle,
  HookRow
} from "./fallbackArchitectureV3Runtime";

function assertBondLanguagePass2Import() {
  const rows = bondLanguagePass2.rows;
  const keys = new Set(rows.map((row) => row.contentKey));

  if (rows.length !== 139 || keys.size !== 139) {
    throw new Error(`Bond language pass 2 must contain 139 unique rows; found ${rows.length}/${keys.size}.`);
  }

  for (const row of rows) {
    if (
      row.review_status !== "reviewed"
      || row.content_role !== "fallback_hook"
      || row.grammar_frame !== "complete_sentence"
      || row.body_you !== row.body_they
      || !row.source_keys?.includes("owner/bond-language-pass-2")
    ) {
      throw new Error(`Invalid bond language pass 2 row: ${row.contentKey}`);
    }
  }
}

assertBondLanguagePass2Import();

export const relationshipFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: bundledRelationshipAuthoredCardsV3.authoredCards as AuthoredCard[]
  },
  templatesFile: {
    templates: []
  },
  rowsFile: {
    hookRows: bondLanguagePass2.rows as HookRow[],
    vocabularyRows: []
  }
};
