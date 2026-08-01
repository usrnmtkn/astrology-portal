import fallbackSourceRowsV3 from "./fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
import bondLanguagePass2 from "./fallbackArchitectureV3/source-rows/bond-language-pass-2.json";
import lunationBlendUnitsV1 from "./fallbackArchitectureV3/source-rows/lunation-blend-units-v1.json";
import transitSynastryRowsV1 from "./fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle,
  HookRow
} from "./fallbackArchitectureV3Runtime";

const NEW_MOON_MACRO_OPEN = "New Moons begin a six-month cycle, and what starts now grows on the terms you set first.";
const FULL_MOON_MACRO_OPEN = "Full Moons bring what has been building into clearer view.";

function assertLunationBlendImport() {
  const allAuthoredCards = [...transitSynastryRowsV1.authoredCards, ...lunationBlendUnitsV1.authoredCards];
  const allHookRows = [...fallbackSourceRowsV3.hookRows, ...lunationBlendUnitsV1.hookRows];
  const allRows = [...allAuthoredCards, ...allHookRows];
  const fallbackSetSource = "Lunation fallback set — full sign coverage, 19 macros + 20 compact cores";
  const fixedFrameMacros = allAuthoredCards.filter(
    (row) => row.contentKey.startsWith("authored/sky-lunation-macro/")
      && (
        row.review_status === "approved"
        || row.source_keys?.includes(fallbackSetSource)
      )
  );

  for (const macro of fixedFrameMacros) {
    const expectedOpen = macro.contentKey.includes("/new-moon/")
      ? NEW_MOON_MACRO_OPEN
      : FULL_MOON_MACRO_OPEN;

    if (!macro.body.startsWith(expectedOpen)) {
      throw new Error(`Lunation macro frame mismatch: ${macro.contentKey}`);
    }
  }

  const stagedRulerRows = lunationBlendUnitsV1.hookRows.filter((row) =>
    row.contentKey.startsWith("fallback-hook/lunation-ruler-house/")
  );
  const primaryHooksByKey = new Map(fallbackSourceRowsV3.hookRows.map((row) => [row.contentKey, row]));

  if (
    stagedRulerRows.length !== 12
    || stagedRulerRows.filter((row) => row.review_status === "needs_review").length !== 11
    || stagedRulerRows.filter((row) => row.review_status === "approved").length !== 1
  ) {
    throw new Error("Lunation ruler staging must contain one approved row and 11 review-gated rows.");
  }

  for (const row of stagedRulerRows) {
    const mirrored = primaryHooksByKey.get(row.contentKey);

    if (!mirrored || mirrored.review_status !== row.review_status || mirrored.body_you !== row.body_you) {
      throw new Error(`Lunation ruler mirror mismatch: ${row.contentKey}`);
    }
  }

  const batchThree = allRows.filter((row) => row.source_keys?.includes(
    "Lunation sign packages batch 3 — the next three events"
  ));

  if (batchThree.length !== 9 || batchThree.some((row) => row.review_status !== "approved")) {
    throw new Error("Batch 3 lunation import must contain exactly nine approved rows.");
  }

  const fallbackSet = allRows.filter((row) => row.source_keys?.includes(fallbackSetSource));

  if (fallbackSet.length !== 39 || fallbackSet.some((row) => row.review_status !== "approved")) {
    throw new Error("Lunation fallback set must contain exactly 39 approved rows.");
  }

  const fallbackCompacts = fallbackSet.filter(
    (row) => row.contentKey.startsWith("fallback-hook/lunation-sign-compact/")
  );

  if (
    fallbackCompacts.length !== 20
    || fallbackCompacts.some((row) => !("body_you" in row)
      || row.body_you.trim().split(/\s+/u).length <= 10)
  ) {
    throw new Error("Lunation fallback compact rows must contain the authored prose.");
  }

  const macroKeys = new Set(allAuthoredCards
    .filter((row) => row.contentKey.startsWith("authored/sky-lunation-macro/"))
    .map((row) => row.contentKey));
  const compactKeys = new Set(allHookRows
    .filter((row) => row.contentKey.startsWith("fallback-hook/lunation-sign-compact/"))
    .map((row) => row.contentKey));

  if (macroKeys.size !== 24 || compactKeys.size !== 24) {
    throw new Error(
      `Lunation sign coverage incomplete: ${macroKeys.size}/24 macros, ${compactKeys.size}/24 compacts.`
    );
  }
}

function assertBondLanguagePass2Import() {
  const rows = bondLanguagePass2.rows;
  const keys = new Set(rows.map((row) => row.contentKey));
  const baseByKey = new Map(fallbackSourceRowsV3.hookRows.map((row) => [row.contentKey, row]));
  const readerEligible = new Set(["approved", "approved_reuse", "reviewed"]);

  if (rows.length !== 139 || keys.size !== 139) {
    throw new Error(`Bond language pass 2 must contain 139 unique rows; found ${rows.length}/${keys.size}.`);
  }

  for (const row of rows) {
    const servingTwin = baseByKey.get(row.contentKey);

    if (
      row.review_status !== "reviewed"
      || row.content_role !== "fallback_hook"
      || row.grammar_frame !== "complete_sentence"
      || row.body_you !== row.body_they
      || !row.source_keys?.includes("owner/bond-language-pass-2")
    ) {
      throw new Error(`Invalid bond language pass 2 row: ${row.contentKey}`);
    }

    if (!servingTwin || !readerEligible.has(String(servingTwin.review_status))) {
      throw new Error(`Bond language pass 2 is missing an approved serving twin: ${row.contentKey}`);
    }
  }

  const byKey = new Map(rows.map((row) => [row.contentKey, row]));
  const lintSwaps = [
    ["fallback-hook/bond-effect-conjunction/uranus", "Let the change finish speaking before you decide it is a problem."],
    ["fallback-hook/bond-effect-trine/pluto", "uses the truth as a weapon"],
    ["fallback-hook/bond-effect-soft/pluto/variant-3", "without holding it over them later"],
    ["fallback-hook/bond-effect-hard/pluto/variant-2", "Name the actual power imbalance"]
  ] as const;

  for (const [contentKey, expected] of lintSwaps) {
    if (!byKey.get(contentKey)?.body_you.includes(expected)) {
      throw new Error(`Bond language pass 2 lint swap mismatch: ${contentKey}`);
    }
  }
}

assertLunationBlendImport();
assertBondLanguagePass2Import();

export const deferredFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: transitSynastryRowsV1.authoredCards as AuthoredCard[]
  },
  templatesFile: {
    templates: []
  },
  rowsFile: {
    hookRows: bondLanguagePass2.rows as HookRow[],
    vocabularyRows: []
  }
};
