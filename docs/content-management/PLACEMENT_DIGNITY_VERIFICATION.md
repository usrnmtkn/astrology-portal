# Placement dignity integration: verification and release status

## Status

Source implementation is on the review branch. This is not a production release and no editorial records were published or bulk-migrated.

**Do not merge until the generated reader assets are regenerated and committed against the current main, followed by the release checks below.** The browser reader and generated manifests were rebuilt and tested in an Actions working tree, but that output was not committed because the final packaging step did not run. Source-only success must not be described as shipped reader success.

The repository refs changed during verification. Tests below describe the captured build from run 35163319488, not a certification of later main changes. Refresh the base without restoring old history or overwriting concurrent work.

## Implemented

- One traditional seven-planet sign lookup shared by chart badges and article selection, preserving Mercury's two combined conditions.
- Calculated read-only `placementDignity` and exact-placement `placementDignityMeaning` resolution before interpolation.
- The paragraph uses a canonical authored full paragraph, then preserved legacy full wording, then both authored mechanism and expression fields. It does not invent missing copy.
- Intentional omission, unsupported bodies, invalid identities and missing explanation are separate outcomes. No sign-only peregrine assignment.
- Legacy `dignitySentence` migration is an explicit, conflict-safe draft edit. It retains old text and does not save or publish by itself.
- Sky placement, ingress composition, motion-specific reader variants and Studio validation use the same selection. Natal and ingress endings are separate; this change is not a migration of every natal essay template.
- Placement facts are deferred past generic custom-variable interpolation so caller-provided facts cannot override the calculated condition or the paragraph validation.

## Recorded verification

Actions run: https://github.com/usrnmtkn/astrology-portal/actions/runs/35163319488

Artifact: `dignity-integration-verification`, ID `10473753646`.
Archive digest: `sha256:2c2d570cb38a50aebad1a7853ac55dd36622f3e2f9ee3a8fea8304931227bfa2`.
Artifacts have short retention; do not depend on their availability for future release verification.

Passing checks in that captured build:

- 95 dignity/content unit tests, including all 84 traditional planet-sign combinations.
- Source, newly compiled browser module and installed reader-package parity, including forged caller facts and missing-content refusal.
- Existing ingress, placement article variable, sky variable and shared variable catalog tests.
- The actual draft/publication handlers exercised with a mock store: incomplete drafts save; incomplete publication is refused; completed exact sources publish in the mock store and render through the installed package in both motion variants.
- Typecheck, web build, admin build and reader-copy boundary checks.
- 36 browser editor cases across 1440px/390px and light/dark themes, plus four explicit draft-only legacy migrations. Captured screenshots were inspected.

## Unresolved release checks

The global CSS audit reports 2,964 unresolved active token references in legacy styles. The Studio CSS architecture audit also flags an existing inline style in `SkyArticleAiWriter.tsx`. No stylesheet or audit allowance was changed by this feature.

The isolated main comparison in run 35163319488 failed because its source snapshot omitted `apps/web/src/styles.css` (41 CSS files scanned versus 42). Token findings matched, but the complete baseline-comparison assertion did not pass. Do not describe the global CSS audit as passing. Any renewed baseline comparison must include that root stylesheet and all normal audit inputs.

The corrected final packaging run 35164027468 failed before any job steps started, including on one retry. The available result did not establish the cause. Do not assume billing, access, or quota status.

## Release procedure

On an authorized development environment with the current branch refreshed against main:

```sh
npm ci
npm run prepare:app-test-dependencies
npx esbuild apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts --bundle --format=esm --platform=browser --outfile=apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js
npm run build:fallback-manifest
node --import tsx scripts/build-studio-variable-catalog.mts
npm run test:placement-dignity
node --import tsx scripts/test-sky-ingress-composition.mts
npm run test:sky-placement-article-variables
node --import tsx scripts/test-sky-placement-variables.mts
npm run test:studio-variables
node --import tsx scripts/test-sky-placement-studio-api.mts
npm run typecheck
npm run build:web
npm run build:admin
npx playwright install --with-deps chromium
npm run test:placement-dignity-editor
npm run test:reader-copy-boundary
npm run qa:css-audit
node scripts/run-studio-css-architecture-audit.mjs
```

Review and commit the regenerated browser runtime, manifest/projection/lineage changes and API variable directory. Inspect these outputs for unintended copy changes. The public Studio catalogs are regenerated by the normal builds.

Run the repository-required PR checks and a preview verification before merging. Resolve or explicitly review the pre-existing style failures without silently relaxing their audits. Production release and editorial publication remain separate actions.
