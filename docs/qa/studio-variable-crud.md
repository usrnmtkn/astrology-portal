# Authored variables in Content Studio

The Variables page now opens a persistent owner-authored library. The owner can create, read, rename, edit, tag, search, filter and delete custom variables. Each token has one shared value and optional planet, sign or placement overrides. Selection priority is placement, planet, sign, shared. The first/subject sign is used by sign-aware compatibility templates; contexts without a planet or sign use the shared value.

The prior catalog mixed renderer internals with reusable language. Whole article pointers (`articleBody`, `articleHeadline`), assembly introductions and undocumented/internal slots are no longer offered as writing variables. Calculated facts and documented phrase sources remain in separate Library selections. “Available in” describes template-contract support, not a count of saved usages. Existing authored source prose, including the explicitly requested full season and polar-axis prose, is unchanged.

## Storage and publication

Authenticated CRUD uses `/api/admin/generated-content?variables=true`. Definitions occupy private DRAFT reference rows under `studio-variable/` in the existing generated-interpretations table. Existing uniqueness, admin authentication and row policies apply; no migration or new deployment setting is required. Generic content writes cannot publish or mutate definition rows. Updates and deletion require the exact saved timestamp and use a storage compare-and-swap. Names cannot collide with calculated or existing built-in tokens. Prose is literal; nested custom variables are not supported.

Placement articles, motion-specific articles, placement composition sections and package template editors keep tokens visible and resolve preview values. Saving binds referenced values into a server-generated snapshot. Only name, identity, value, overrides and revision are copied into publication metadata; labels, tags and descriptions remain private. Changed or missing definitions and incomplete values block publication until the draft is saved and reviewed again. Tag/description changes alone do not invalidate a prose review. Existing publications keep their frozen values after a library edit, rename or deletion. Renaming does not silently rewrite drafts using the old token.

## Verification

- `npm run test:content-studio-api`: unfiltered actual-handler contract, including new CRUD coverage, authorization, duplicate names, stale/concurrent writes, metadata privacy, missing shared/override values, rename/delete, placement composition, review and publication.
- `npm run test:studio-variables`: curated catalog and identical fixtures through Node reference, browser source and shipped dist for Natal, Compatibility, Calendar, Sky, composition and Studio preview.
- `npx playwright test -c playwright.studio-variables.config.ts`: fresh build; 390/1440 widths in light/dark, empty/populated states, tags/search, persisted CRUD, cursor insertion, resolved preview and actual-handler publication with isolated storage.
- `npx playwright test -c playwright.config.ts --workers=1 tests/visual/sky-placement-publication-hydration.spec.ts`: frozen custom values on the real reader route, opening/final sentence, navigation, reload, publication update and retirement.
- CSS audit, computed heading-role parity, web/admin builds, public asset privacy scan and bundle budgets.

Repeat both browser flows on the Ready main deployment using `PLAYWRIGHT_BASE_URL=https://tldrastro.vercel.app` and `STUDIO_PRODUCTION_ENTRY=1` for the Studio flow. API writes in browser verification use isolated storage, not owner records.

## Measured feature cost

Separate worktrees with their own `npm ci` dependencies and the workflow Supabase configuration compared main `347fc5c83` with this feature. Admin entry/aggregate gzip: 179.2/477.0 kB to 180.0/482.3 kB. Form, directory and insertion UI are deferred. Allocate 1 kB entry and 6 kB aggregate without changing raw-entry, largest-chunk or forbidden-payload limits.

Reader boot including CSS: approximately 480.1 to 481.2 kB; allocate 1.5 kB for shared frozen-value selection and 1 kB for its separately measured JavaScript portion. The two shared Studio CSS rules add 31 gzip bytes to the deferred graph stylesheet; allocate 50 bytes. No runtime dependency or bundled custom library data is added.

## Existing broad-suite limitation

The broader `npm run test:content` still stops at the protected natal-aspect projection assertion: actual `7469bac8…`, expected `087d8486…`. The unchanged main worktree reproduces the identical failure. This is the known baseline documented in `docs/qa/placement-article-phrase-variables.md`; this release changes neither those rows nor their assertion. The full Content Studio API suite and the targeted renderer/browser contracts pass independently.

Regenerating the package-version integrity index also requires regenerating `production-sky-kernel-comparison-v1/comparison.json`. Its changed fields are packet hashes only; evidence text, approval state, serving state and character counts remain unchanged.
