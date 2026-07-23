# Legacy content deleted on purpose (2026-07-23)

The owner deleted every legacy copy library from this directory. This was deliberate, not an accident. Do NOT restore any of these from git history, and do not recreate their functionality:

- `sky-writing/` (entire directory, including sky-articles-authored-v1.json — the source of the rogue Leo season copy)
- `skyWriting.ts`, `skyContentSnapshot.json`, `skyHistoricalLookback.ts`
- `placementScaffold.ts`, `placementScaffoldData.json`
- `emergencyCopy.ts`, `emergencyCopy.json` (an "emergency" substitution tier — banned: SOURCE_GAP means HIDE the surface, never substitute copy)
- `lunarBeatCopy.ts`, `seasonArcCopy.ts`, `fallbackHooks.ts` (legacy hook system feeding on hardcoded lunation/season copy)
- `metaphorSpecificityPhraseBook.ts`, `metaphor-specificity-phrasebook.json`
- `aspectPairSourcePhrases.json`
- `sourceGroundedRuntime.ts`, `sourceGroundedV2.ts`, `sourceGroundedMustacheV22.ts`, `sourceGroundedModels.ts`, `finalSourceGroundedDashboardRecords.json`, `sourceGroundedReviewCandidates.json` (the entire pre-v3 generation system)
- `migration-seeds/`, `templateHandoffV2/` (superseded migration artifacts)
- `lunar-calendar/content-library.json` (reader-facing Moon fallbacks, writeups, mantras, phase frames, lunation framing, and season prose; this was the source of the rogue rewritten Scorpio Moon paragraph)
- `../features/calendar/lunarCalendarLibraryResolver.ts` (assembled the deleted lunar-calendar prose ahead of the approved package renderers)

The former `lunar-calendar/` directory contained no pure astronomy records. It was
therefore removed in full. Calendar dates, times, positions, illumination, phase
angles, and void windows remain computed by `services/ephemeris.ts`; reader copy
must come verbatim from the v3 package renderers.

Also deleted from `scripts/` (2026-07-23, second pass): `content-source/` (the entire pre-v3 source data directory: fallback-language rows, old templates rows, source-grounded records, normalized sky records, rich-synastry content), `generate-emergency-copy.mjs`, `generate-placement-scaffold-data.mjs`, `generate-source-grounded-review-candidates.mjs`, `generate-normalized-sky-snapshot.mjs`. Any build step (prebuild or otherwise) that referenced these generators must be removed, not repointed. Generators that recreate deleted copy count as legacy content.

Anything that fails to compile because it imported one of these files was, by definition, on a legacy path. Fix it by routing through the ONLY two approved content sources:

1. Dashboard rows (originating from the fallback-architecture v3 package import), then
2. The v3 resolvers in `dist/tldr-content.js` (`fallbackArchitectureV3/`), then
3. Hide the surface on `SourceGapError`.

If a surface has no coverage in those sources, it renders nothing and the gap gets reported to the owner. It does not get copy from anywhere else.
