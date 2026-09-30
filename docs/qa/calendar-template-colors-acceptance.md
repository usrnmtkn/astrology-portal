# Calendar template colors acceptance

Owner request, September 30, 2026: distinguish editable passage sentences and
variables with colored sections in the Complete passage template.

Scope: Content Studio → Calendar Write-ups → Daily, Weekly, or Monthly Sky →
Complete passage. This adds presentation to the native text field. It does not
rewrite copy, change template syntax, or modify calculation/publication handlers.

Initial verification base: `7ae1375e2543e282d8d6e1c007e6d8fe59d160f5`, branch
`feat/calendar-template-colors`. The tested uncommitted source fingerprint and
per-file hashes are in `test-results/calendar-template-colors-tested-files.json`.
Production deployment and exact-head CI are not claimed by these local results.
Tested source fingerprint: `36e037da0b7beeb4cbf3d869c965e458d72f249ac8edf50f81e826f3e97f236b`.

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Differentiate Sun/Moon sentences in the editable field | Passed | Distinct shared palette backgrounds; rendered screenshots in light/dark at 1440/390 px |
| Distinguish variables and explain their source type | Passed | Inline underlines/colors; visible calculated-value/saved-writing key and matching source-table colors |
| Select and edit a named section without changing other text | Passed | Native selection, insertion, exact surrounding-byte checks and undo |
| Preserve input behavior and offer plain text | Passed | Native textarea; color toggle preserves value; scroll, resize, matching font/wrap metrics; formatting open/close round trip |
| Preserve saved template markers and full wording | Passed | Actual API save/reload/publish/reader assertions retain conditional syntax and opening/final sentences |
| Preserve existing templates and formatting workflows | Passed | 16 existing Calendar template cases and 4 formatting publication cases |
| Support both Chrome and Safari engines | Passed | Four editor variants in each engine; desktop/mobile and light/dark |
| Handle empty, invalid, failed-save and changed-source states | Passed | Existing actual-handler browser flow plus empty-field and unknown-variable-key assertions |
| Preserve typography, navigation and mobile width | Passed | Existing heading computed-style checks, source links and overflow checks |
| Content Studio API contract | Passed locally | Full `npm run test:content-studio-api`, own installed dependencies, isolated storage |
| Type and design-system checks | Passed | Web/admin TypeScript; `qa:css-audit`; no new raw design values |
| Web/admin builds, budgets and public-asset privacy | Passed | Both builds; both bundle guards; 353 web and 92 admin files scanned |
| Aggregate `qa:admin-bundle` command | Failed on existing main issue | `test-admin-auth.mjs` rejects the existing `getContentAdminPrincipal` call in `calendar-lunation-writing.ts`; identical failure reproduced in clean main 7ae1375e2 |
| Deployment | Not performed | Local feature change only |

The final fresh-build browser run passed **28 tests** in four minutes: 24 Chrome
cases and 4 WebKit editor cases. The temporary cross-browser configuration is
`/private/tmp/calendar-colors.playwright.config.ts`; it imports the repository
configuration, starts a fresh build with `reuseExistingServer: false`, and adds
WebKit only for the editor flow. All content writes use the isolated API store.
No owner content or production data was changed.

Logs: `/private/tmp/calendar-colors-final-browser.log`, `calendar-colors-api.log`,
`calendar-colors-typecheck.log`, `calendar-colors-admin-typecheck.log`, and
`calendar-colors-css.log`. Screenshots: `test-results/calendar-template-colors-*.png`.
The API, browser and static checks were not reported as a passing aggregate admin
audit; its unrelated failure remains visible above.

## Feature size

Matched main/feature builds use separate installed dependencies and the same
workflow Supabase placeholders. Main 7ae1375e2 measures 3,512,904 aggregate web
JavaScript gzip bytes; this feature measures 3,514,113 (+1,209). Shared Studio CSS
also included in the deferred memory graph grows from 28,660 to 28,942 (+282).
The budget records 1,500 additional aggregate JavaScript bytes and 400 additional
deferred Studio/graph CSS bytes. Reader startup, reader CSS, individual JavaScript
chunks and runtime-performance limits are unchanged. No dependency was added.

## Release integration

Integrated onto `8fc236d8a0b908f24860594a7461b654c0174099` on September 30.
The only overlap was the aggregate JavaScript budget: preserve the transit
hydration allocation and add this feature's measured 1,500-byte allocation
for a combined cap of 3,518,500. TypeScript and CSS/token checks pass on the
combined source. The legacy admin-authorization audit failure also reproduces
on clean current main 8fc236d8a. No authorization implementation changes.

The release PR records the final exact-head API and browser results, deployment
revision, and production checks. The local table above is a verification snapshot,
not a claim that the feature was deployed at the time this record was committed.
