# Moon sign write-ups in Sky Placement

The Moon sign reader joins three saved sources in this order:

| Studio section | Source key | Field |
| --- | --- | --- |
| Opening | `fallback-hook/sky-placement-hook/moon/{sign}` | `body_you` |
| How it shows up | `fallback-hook/sky-placement-lived/moon/{sign}` | `body_you` |
| Challenge and response | `fallback-hook/sky-placement-turn/moon/{sign}` | `body_you` |

Sky Write-ups → Moon → a zodiac sign must show all three in Saved preview,
with each passage and matching library row opening its existing source editor.
The generic `sky-placement/article/moon/{sign}` starter is not used by
`renderMoonSignEntry` and stays out of this library. It remains accessible in
Content Library. No source migration or prose rewrite is needed.

Calculated dates and optional occurrence additions remain the reader's concern.
The saved preview includes drafts and does not imply publication.

## Acceptance checks

`scripts/test-sky-moon-studio.mts` is part of `test:content-studio-api`. It checks
all twelve signs against the shipped reader, actual inventory and detail handlers,
exact draft/publication readback, sibling preservation, stale writes and access.

`tests/visual/sky-placement-composition.spec.ts` checks complete discovery,
source order, exact saved prose, editing from the preview and list, publication
and reload using isolated actual-handler storage. It also checks mobile/desktop,
light/dark, shared label typography, no-match results, overflow, loading, failed
reads and retry. Run it with `playwright.sky-composition.config.ts`; also run the
Moon cases with `playwright.config.ts` to verify the actual web-hosted admin route.
Both configurations build the current checkout and start a fresh preview.

All writes in these checks use isolated fixtures. Before claiming the fix is
live, record the approved merge revision, successful main deployment and repeat
the affected checks against that deployed revision. Production owner copy must
not be edited for testing.

## Initial local verification, October 3, 2026

Tested the uncommitted patch on `fix/moon-sky-writeup-editor`, based on
`2fd8c427aa1f85b66269055ce690454f3142da1c`. This is local evidence, not a deployed
revision or a replacement for exact-head CI.

| Criterion | Result and evidence |
| --- | --- |
| All twelve existing Moon write-ups are discoverable and complete | Passed: `test-sky-moon-studio.mts`, all 36 sources; shipped-reader text parity. |
| Preview and list open the correct existing source | Passed: all four viewport/theme combinations in the browser suite; no browsing writes. |
| Complete edits persist after publication and reload | Passed: actual-handler fixtures for all three Cancer sections, exact text and sibling preservation; real reader loader and installed Moon renderer receive the published result. |
| Loading, failed reads, retry and no-match results | Passed in standalone Studio and the web-hosted admin route. |
| Labels, paragraph breaks, desktop/mobile and light/dark | Passed: computed styles and visible order, full saved text, four inspected screenshots and no horizontal overflow. |
| Adjacent placement behavior | Passed: full standalone `sky-placement-composition.spec.ts`, 21 cases including Sun and Saturn; 168-map composable-block checks. |
| Actual deployed entry point | Passed locally: fresh web build, `/admin/content#sky-writeups`, all five Moon browser cases. |
| API, type and CSS gates | Passed: unfiltered `npm run test:content-studio-api`, web typecheck, admin build typecheck and `npm run qa:css-audit`. |
| Source/assets privacy and bundle limits | Passed with the protected policy and measured feature allocations below. |
| Hosted CI and production delivery | Pending in this local record; the release PR records exact-head CI and the deployed revision. |

Matched builds use isolated `npm ci` installs, the same base revision, and the
visual-smoke workflow's synthetic Supabase settings. Admin aggregate JavaScript
grows from 783,175 to 783,607 gzip bytes (+432); entry grows from 761,740 to
762,551 raw bytes (+811) and 221,642 to 221,903 gzip bytes (+261). Web aggregate
grows from 3,520,196 to 3,520,531 gzip bytes (+335). Budget rationale records
these feature costs; reader startup, CSS, graph and dependency limits are unchanged.

An additional legacy source-text test,
`node --import tsx scripts/test-admin-sky-writeup-relations.mjs`, fails identically
on clean main and this patch because it expects the removed sentence “Only a
complete, approved Sky house horoscope can appear”. The Moon behavior checks
above pass. This unrelated existing assertion was not changed or counted as passing.

Integration with main `8857bc7ef` preserves the independent horoscope-variable
allocation and the Moon allocation: the combined web aggregate cap is 3,521,250
bytes and the fresh combined build measures 3,520,761 gzip bytes. Reader startup
and all individual chunk and CSS limits remain unchanged.

Matched standalone-admin builds at this integration measure 783,414 aggregate
gzip bytes on clean main and 783,809 on the feature (+395). The combined admin
aggregate cap is 784,000, including 250 bytes for the concurrently merged
horoscope controls. All other admin limits retain the original Moon allocation.
