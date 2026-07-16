# Content Fallback Copy QA Bug Report

Date: 2026-07-16
Area: Client-facing content and fallback copy
Status: Fixed and verified

## Summary

Content QA found reader-facing fallback copy that exposed placeholder or directional scaffold language. These failures have been fixed and verified by the Playwright content/fallback-copy suite.

## Bug 1: Friend Composite Shows Review Placeholders

Severity: High

Surface: Friends > saved chart > Composite tab

Automated test:
`content fallback copy is reader-facing in friend relationship tabs`

Command:
`npx playwright test -c playwright.config.ts tests/visual/client-facing-user-flows.spec.ts -g "content fallback copy|directional copy"`

Steps to recreate:
1. Seed a signed-in/local profile with friend charts.
2. Open `/#friends?tab=charts`.
3. Open Nikki's chart.
4. Select the `Composite` tab.
5. Inspect composite placements and composite aspects.

Actual result:
Composite rows repeatedly show `Interpretation in review.` in the client-facing UI.

Expected result:
Every visible composite placement/aspect row should have reader-facing fallback copy, even when live/generated content is unavailable. No review-state placeholders should appear to clients.

QA acceptance criteria:
1. Composite placements no longer show `Interpretation in review.`
2. Composite aspects no longer show `Interpretation in review.`
3. The automated content fallback test passes without relaxing the placeholder guard.

Resolution:
Added reader-facing composite placement and aspect emergency summaries in `apps/web/src/App.tsx` so missing generated/reviewed copy falls back to usable client-facing relationship copy.

## Bug 2: Ascendant Placement Shows Directional Scaffold Copy

Severity: High

Surface: You > natal placement detail > Ascendant

Automated test:
`content QA flags directional copy in You ascendant placement detail`

Command:
`npx playwright test -c playwright.config.ts tests/visual/client-facing-user-flows.spec.ts -g "content fallback copy|directional copy"`

Steps to recreate:
1. Seed a signed-in/local profile.
2. Open `/#you`.
3. Open the `Ascendant in ...` placement detail.
4. Inspect the fallback copy body.

Actual result:
The detail can show: `Notice how this placement asks for attention in real life.`

Expected result:
The placement detail should explain the Ascendant placement in finished reader-facing language. It should not contain directional or writer-scaffold phrasing such as `Notice how`, `asks for attention`, `this placement asks you to`, `pay attention to`, or `watch for`.

Likely source:
[emergencyCopy.ts](/Users/mprez/Code/tldrastro/apps/web/src/content/emergencyCopy.ts:393)

QA acceptance criteria:
1. Ascendant placement fallback copy no longer includes directional scaffold phrasing.
2. The replacement copy is substantial enough to feel like a finished interpretation.
3. The directional-copy QA test passes without weakening `directionalCopyPattern`.

Resolution:
Replaced the no-house natal placement fallback in `apps/web/src/content/emergencyCopy.ts` with finished explanatory copy that does not use directional scaffold phrasing.

## Regression Scope

After fixing both issues, run:

```sh
npx playwright test -c playwright.config.ts tests/visual/client-facing-user-flows.spec.ts -g "content fallback copy|directional copy"
```

Then run the full client-facing suite:

```sh
npx playwright test -c playwright.config.ts tests/visual/client-facing-user-flows.spec.ts
```

Verification:
`npm run qa:content-copy` passed on 2026-07-16 with `6 passed`.
