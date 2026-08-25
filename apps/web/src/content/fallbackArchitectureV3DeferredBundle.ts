import bundledDeferredCoreRowsV3 from "./fallbackArchitectureV3/bundled-deferred-core-rows-v3.json";
import bundledSharedPlacementRowsV3 from "./fallbackArchitectureV3/bundled-shared-placement-rows-v3.json";
import bundledSkyCoreRowsV3 from "./fallbackArchitectureV3/bundled-sky-core-rows-v3.json";
import bundledTransitCoreAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle,
  HookRow,
  RowsFile
} from "./fallbackArchitectureV3Runtime";

const NEW_MOON_MACRO_OPEN = "New Moons begin a six-month cycle, and what starts now grows on the terms you set first.";
const FULL_MOON_MACRO_OPEN = "Full Moons bring what has been building into clearer view.";
const OWNER_BOOK_MACRO_OPENS = new Map([
  [
    "authored/sky-lunation-macro/full-moon/pisces",
    "Full moons are about illuminating that unconscious and that which is unseen."
  ]
]);
const fallbackSourceRowsV3 = {
  hookRows: [
    ...bundledSkyCoreRowsV3.hookRows,
    ...bundledDeferredCoreRowsV3.hookRows
  ],
  vocabularyRows: bundledSkyCoreRowsV3.vocabularyRows
};

function assertLunationBlendImport() {
  const allAuthoredCards = bundledTransitCoreAuthoredCardsV3.authoredCards;
  const allHookRows = fallbackSourceRowsV3.hookRows;
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
    const expectedOpen = OWNER_BOOK_MACRO_OPENS.get(macro.contentKey)
      ?? (macro.contentKey.includes("/new-moon/")
        ? NEW_MOON_MACRO_OPEN
        : FULL_MOON_MACRO_OPEN);

    if (!macro.body.startsWith(expectedOpen)) {
      throw new Error(`Lunation macro frame mismatch: ${macro.contentKey}`);
    }
  }

  const batchThree = allRows.filter((row) => row.source_keys?.includes(
    "Lunation sign packages batch 3 — the next three events"
  ));
  const piscesBookMacro = allAuthoredCards.find((row) => (
    row.contentKey === "authored/sky-lunation-macro/full-moon/pisces"
    && row.source_keys?.includes(
      "packages/astro-knowledge/review/lunation-card-assembly-v1/source/book-sections-v1.json#Pisces full moon horoscopes & tarotscopes"
    )
  ));

  if (
    batchThree.length !== 8
    || batchThree.some((row) => row.review_status !== "approved")
    || piscesBookMacro?.review_status !== "approved"
  ) {
    throw new Error("Batch 3 lunation import must contain eight approved legacy rows plus the approved direct-book Pisces macro.");
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

  const reviewGatedMacroKey = "authored/sky-lunation-macro/new-moon/aquarius";
  const expectedServingMacroKeys = ["new-moon", "full-moon"].flatMap((phase) => [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
  ].map((sign) => `authored/sky-lunation-macro/${phase}/${sign}`))
    .filter((contentKey) => contentKey !== reviewGatedMacroKey)
    .sort();

  if (
    JSON.stringify([...macroKeys].sort()) !== JSON.stringify(expectedServingMacroKeys)
    || compactKeys.size !== 24
  ) {
    throw new Error(
      `Approved lunation sign coverage mismatch: ${macroKeys.size}/24 macros, ${compactKeys.size}/24 compacts; only ${reviewGatedMacroKey} may be absent.`
    );
  }
}

assertLunationBlendImport();

export const deferredFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: bundledTransitCoreAuthoredCardsV3.authoredCards as AuthoredCard[]
  },
  templatesFile: {
    templates: []
  },
  rowsFile: {
    hookRows: [
      ...(bundledDeferredCoreRowsV3.hookRows as HookRow[]),
      ...(bundledSharedPlacementRowsV3.hookRows as HookRow[])
    ],
    vocabularyRows: bundledDeferredCoreRowsV3.vocabularyRows,
    dailyGlanceVariants: bundledDeferredCoreRowsV3.dailyGlanceVariants as unknown as RowsFile["dailyGlanceVariants"]
  }
};
