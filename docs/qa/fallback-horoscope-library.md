# Fallback horoscope library

Content Studio → Horoscopes → Fallback horoscopes opens the shared reusable horoscope sources at `/admin/content#horoscope-fallbacks`.

The library filters planetary placements, New Moons, Full Moons and eclipse components by planet/point, sign and rising sign. Search and source selection retain the complete passage. A source link identifies the canonical key in the URL; reload reopens that source. Loading, catalog failure, passage failure and empty filters have explicit states and retry actions.

The current catalog contains 1,314 complete source units: 984 placement house horoscopes, 288 ordinary RATM lunation passages and 42 released eclipse components. All 14 supported planets and points have authored coverage. This is the available authored inventory, not a claim that every possible planet × sign combination has prose. Missing combinations remain visibly empty. The held whole-card eclipse drafts are not eligible source units.

`house-horoscope-core/…` and ordinary RATM keys use the same saved-row preference as Sky Placement's related horoscopes: a saved source wins over its package starter, and the newest saved version wins among duplicates. Browsing does not create database mirrors. The library hydrates full documents and invokes the existing version-checked editor and owner publication action. Sky's house preview includes the saved package draft, and links back to its exact library source. Its publication badge still describes reader eligibility separately.

Save draft keeps a revision private. Save & publish validates and publishes the exact saved revision. Dated article horoscope sections retain their existing precedence over reusable fallbacks. No resolver selection, approved source body, chart calculation or writing profile changes are part of this interface change.

On 2026-11-03 the owner requested unrestricted topics in authored fallback horoscopes, explicitly including tarot (`thread:01a1a220-6437-7f22-95c0-f9b24c68c3bf`). This supersedes the 2026-10-31 no-tarot publication rule from `thread:01a189cd-3bdd-75f2-8843-02aafc84e64f` for these fallback source families. Save & publish, Publish again and the legacy manual-source publication path permit Tarot, Tarotscope and Major/Minor Arcana references. The reader's topic boundary also permits these fallback keys when their metadata declares astrology or mixed content. Required fields, explicit owner publication, version checks, integrity receipts, review states and retirement still apply. The earlier 123 RATM publication holds remain intact until the owner publishes an individual saved source; removing the topic restriction does not republish held content in bulk. Other surfaces and AI writing instructions retain their existing policies.

## Verification

- `scripts/test-fallback-horoscope-studio.mts` verifies all source identities, whole-sign house mappings and matching library/Sky selection under duplicate versions. Actual API handlers exercise retirement, tarot draft save/reopen, publication through both actions, unchanged originals, stale-version rejection and exact reader output using isolated storage. Node/browser eligibility and the browser source/shipped resolver receive the same typed tarot fixtures, including the previously astrology-only Virgo source. Unreviewed copy remains ineligible.
- `tests/visual/fallback-horoscope-studio.spec.ts` verifies parent/child discovery, complete source opening and ending, filters, catalog/passage retry, empty results, selection after reload, draft save/reopen, tarot publication, published persistence after reload and the complete rendered lunar passage. A second journey edits a planetary fallback through both library and Sky Placement, verifying the same single saved source.
- Both journeys cover 390/1440 widths and light/dark themes. The shared page-header typography is compared with Horoscopes, and the additional library heading uses the existing screen-reader-only treatment.
- The spec runs in the existing lunation-source-wiring workflow and its browser release aggregate. The actual-handler regression runs in the unfiltered Content Studio API suite.

Local results, exact tested revision, bundle measurements and production verification belong in the release record. A source or fixture pass alone does not establish deployment.

## November 3 topic-policy change: local acceptance

Base revision: `ab228938e1f637704e9437683704e25c4015028d`. Branch:
`fix/studio-fallback-editorial-freedom-20261103`, with zero committed changes
ahead of or behind fetched `origin/main` at verification. The implementation is
uncommitted. Source fingerprint:
`32547722ccbd0af1a74ca01996e44e5043bea2b71bd77c4c7d0588a0ed09c317`.
The fingerprint hashes sorted changed non-document paths, a NUL, the file's
complete bytes (or `<deleted>`), and another NUL. Task-memory notes are excluded.
Dependencies were installed with this isolated worktree's own `npm ci`.

| Criterion | Local result |
| --- | --- |
| Save, reopen and publish tarot in placement, ordinary lunation and eclipse fallback sources | Passed: actual handlers with isolated PostgreSQL storage; includes the screenshot's Aries New Moon identity and the explicitly astrology-typed Virgo source. |
| Publish again after retirement | Passed: actual publication handler and SQL function; the exact saved tarot passage becomes reader-eligible. |
| Draft privacy, stale publication and original-copy preservation | Passed: retirement persists during draft saving, stale publication returns 409, original records remain unchanged. |
| Topic boundary in Node, browser source and shipped artifact | Passed: astrology/mixed fallback fixtures remain eligible after publication; unreviewed fixtures remain ineligible. Both browser resolver builds retain the complete ordinary lunation passage. All 42 eclipse components pass the existing API-to-app-renderer test with tarot fixtures. |
| Studio discovery, editing, publication, reload and actual lunar reader | Passed: eight fresh-build Playwright cases, desktop/mobile and light/dark; opening and final sentence checked in the reader. |
| App builds and types | Passed: web and standalone Studio builds; both TypeScript checks. |
| Copy, package, cache and style checks | Passed: reader-copy boundary, reader repair-order contract, current generated manifest, fallback package cache/refresh, lunation book, CSS audits and Playwright release-path freshness contract. |
| Privacy | Passed: source inventory plus built web and standalone Studio assets. |
| Project memory | Passed: working-tree search/detail retrieval returns the complete new scoped owner direction with exact hashes and no reader-copy approval. Deployed memory is unchanged until release. |
| Content Studio API checks | All assertions passed across the unfiltered run and its resumed remaining command chain. The unfiltered command stopped at missing local protected report evidence; after provisioning that ignored fixture, the exact chain from `npm run test:rhetorical-patterns` through `test:friction-flow-studio-api` exited 0. An earlier sandboxed attempt stopped at the test runner's IPC socket. These results are not a clean, single unfiltered suite pass; that required gate must pass on the committed PR head before merge. |
| Production | Unverified: no commit, merge, deployment or live content mutation performed. |

The resolver package version is `v3-2026-11-03-fallback-topics`; the shipped
artifact, manifests, source hashes and pinned assertions were regenerated or
updated together. Generated reader records remain identical apart from version
and source-lineage metadata. Existing held passages were not bulk republished.
