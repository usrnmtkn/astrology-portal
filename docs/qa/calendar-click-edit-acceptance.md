# Calendar editing, Sky summary and placement editor repairs

Owner task: `thread:01a0ff77-c532-73b0-b754-ee17b8b86784`.
Requests: make colored Calendar write-ups easy to open, edit and save; omit the
separate Moon-ingress sentence when the Sky summary already names that Moon sign.

Colored passage buttons now say **Edit** and open a focused native writing field.
Clicking tinted sentences or their enclosing markers opens the same field.
Editing replaces only the selected section contents; surrounding wording and
conditional markers remain intact. **Edit complete template** retains full-text
and formatting access. Save draft, Publish passage and save/error feedback sit
immediately after the field, with the date/week/month or shared scope labeled.

`skyDailySummary.ts` checks the structured Moon-placement link already rendered
before the ingress section, alongside its existing same-day lunation check.
It omits the repeated label before counting the remaining sign changes. Other
planets' sign changes, an arrival in a different Moon sign, void timing, future
lunation links and separately saved ingress writing remain available. Reader
and Studio preview share this composer. No source passage is rewritten.

Existing version-checked draft and publication handlers control persistence.
No published production copy was mutated and no model call was made. A separate
non-serving article workspace was saved after the owner authorized a TL;DR;
the protected template body and its original saved version remain unchanged.

## Tested revision and results

Base: `2fd8c427aa1f85b66269055ce690454f3142da1c`.
Branch: `fix/calendar-passage-click-edit`, zero commits ahead/behind the refreshed
main, with uncommitted changes. Exact final hashes are in
`test-results/calendar-click-tested-files.json`.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Click tinted text or an Edit button to open the matching field | Passed | Real pointer coordinates and focus assertions |
| Preserve other passages and markers while editing | Passed | Exact full-template comparisons, native undo, all seven weekdays |
| Save from the focused editor and reload exact text | Passed | Browser → real API handlers → isolated storage → reopened editor |
| Keep saved drafts separate from publication | Passed | Publication flow and reader opening/final-sentence checks |
| Weekly and Monthly save/publication; loading, empty, invalid, failed-save and changed-source states | Passed | Existing browser/API cases on the combined patch |
| Nearby Save button, light/dark themes and mobile width | Passed | 1440/390-pixel flows, button geometry, screenshots, overflow assertion |
| Current Moon sign appears once, other ingress/countdown remain, no blank paragraph | Passed | Reader assertions at 1440/390 pixels before and after reload |
| Summary fact/wording contracts | Passed | `node --import tsx scripts/test-sky-daily-summary.mts`, including 144 sign pairs and new ordinary-Moon cases |
| Content Studio API contract | Passed | Full `npm run test:content-studio-api` on this base with own installed dependencies |
| Type/design checks | Passed | Web/admin typechecks/builds; CSS/token audit; shared styles unchanged |
| Web/admin builds and size checks | Passed | Fresh builds and bounded measured feature allocations below |
| Production | Unverified | Not committed, merged or deployed |

The final fresh-build Chromium run passed all seven selected reader/editor tests
in 1.8 minutes. The initial focused-editor implementation also passed all eight
Chrome/Safari desktop/mobile and light/dark cases. Later changes shortened help
text and adjusted Moon-summary assembly; Safari was not rerun for those changes.
Tests use isolated storage and simulated calendar events, not production writes.
Previews are started fresh with server reuse disabled.

Logs: `/private/tmp/calendar-click-verified-browser.log`,
`calendar-click-cross-browser.log`, `calendar-click-combined-api.log`,
`calendar-click-moon-summary.log`, `calendar-click-combined-typecheck.log`,
`calendar-click-css.log`, `calendar-click-verified-bundle.log`, and
`calendar-click-verified-admin-build.log`.
Screenshots: `test-results/calendar-focused-editor-*.png`,
`calendar-weekday-editor-*.png`, `sky-summary-no-duplicate-moon-*.png`.

## Sky placement follow-up

The imported placement source retained its content key and continuous-placement
schema but omitted canonical package metadata and editable-field declarations.
The repair recognizes the supported writing schema for calculated variables,
exposes an empty direct article in the composition map, and retains a separate
versioned draft even for legacy imports. Explicit publication validates the copy,
restores server-owned package identity and receipt metadata, and admits the exact
approved revision to the installed reader. The immutable original is preserved.

Virtual sources now use the compact inventory detail endpoint followed by the
existing authenticated package-source endpoint when no saved document exists.
This fixes missing seasonal paragraphs without adding source banks to the bundle.

Article templates expose Save template and Complete edition. They keep their
variables as authoring material; attempts to publish the template itself now
return an actionable error. Complete edition focuses the existing edition builder.
Placement fields explain that aspectSections and lunationSection belong there.
No owner article or horoscope body was rewritten.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Missing seasonal source loads with no database row | Passed | Browser uses actual inventory and package-source handlers |
| Empty legacy placement opens an editable direct article | Passed | 390 light and 1440 dark browser cases |
| Date variables save and reopen exactly | Passed | Actual handler, isolated storage, reload and original-record assertions |
| Publication reaches the installed reader | Passed | API/ledger/loader/shipped reader regression with both date variables substituted |
| Legacy draft retains prior source; invalid publication preserves it | Passed | Exact original comparisons; wrong-path slots and natal-trait refusal |
| Template save preserves four variables; direct publication is refused | Passed | Actual API and rendered Save template / Complete edition controls |
| Existing placement revisions still save, reload and republish | Passed | Four browser cases covering archived revisions and legacy draft flags |
| Combined Calendar, summary and Sky browser run | Passed | 27 Chromium cases, 4.6 minutes, fresh web build on a dedicated port |
| Supplemental placement contracts | Passed | 14 Studio cases, all 168 composition maps, evergreen layout and shipped-artifact parity, template compiler |
| Supplemental relation source-text assertion | Known baseline failure | test-admin-sky-writeup-relations.mjs:179 expects an old help sentence; identical failure on untouched main 2fd8c427a. Current UI says “Only complete, approved house horoscopes appear in the app.” |
| Full Content Studio API / reader-copy boundary | Passed | Final unfiltered suite and boundary checks pass, including the legacy POV refusal regression |
| Deployment | Unverified | Local working changes only; no commit, merge or deployment |

The final API regression also verifies an incomplete draft can be retained while
publication refuses invalid current-Sky copy with an actionable 400 response.
Browser write tests use synthetic records and isolated storage only. No generation
provider is called. The owner-authorized summary was saved separately through the
live edition builder as DRAFT/reference/owner-review-required; database readback
confirmed it and the unchanged template version. The live builder still requires
the two article passages and decisions on three pre-existing horoscope variables.

Current logs: `/private/tmp/sky-placement-repair-browser-verified.log`,
`sky-placement-repair-full-api-final.log`, `sky-placement-repair-api-final.log`,
`sky-placement-repair-boundary-final.log`, `sky-placement-repair-css-final.log`,
`sky-placement-repair-web-budget.log`, `sky-placement-repair-admin-budget.log`.
New screenshots: `test-results/sky-placement-legacy-390-light.png` and
`test-results/sky-placement-legacy-1440-dark.png`.

## Combined build size

Matched isolated builds with separate npm-ci dependencies and identical browser
workflow environment compare unchanged main 2fd8c427a with the combined patch:

| Measurement | Main | Combined patch | Change |
| --- | ---: | ---: | ---: |
| Web aggregate JavaScript gzip | 3,520,112 | 3,520,600 | +488 |
| Admin entry raw | 761,740 | 762,999 | +1,259 |
| Admin entry gzip | 221,642 | 222,103 | +461 |
| Admin aggregate JavaScript gzip | 783,175 | 783,835 | +660 |

Allocate 500 web aggregate bytes above the original cap (3,520,750 total), and
1,250 admin entry/largest raw, 500 entry gzip, and 750 aggregate bytes above their
previous caps. This leaves 150 web aggregate and 165 admin aggregate bytes of
measured headroom. Reader startup, CSS, memory graph, other individual chunks,
forbidden payload and runtime-performance limits remain unchanged. No dependency
or reader prose was added. Both bundle checks pass.

Baseline: `/Users/mprez/Code/tldrastro-calendar-click-baseline` at 2fd8c427a.
Its own knowledge package was built before application verification. Baseline
logs include `/private/tmp/calendar-click-baseline-build.log`,
`calendar-click-baseline-bundle.log`, and
`sky-placement-repair-baseline-admin-build.log`.

## Release integration

The owner authorized merge and production release on October 2. Rebased onto
main `8857bc7ef65bab61ce513b63c83005609a35571f`; the only conflict was the aggregate
web budget. Preserve the independent horoscope prompt-variable allocation and
the measured 500-byte allocation here, for a combined cap of 3,521,250 bytes.

On rebased implementation `6aa3e9e3e9fb553b50df6575647ca4800c240c5e`, the full
unfiltered Content Studio API suite passed again. All 27 Chromium browser cases
passed against a new web build on a dedicated port. Both rebuilt app bundle
checks and both public-asset privacy scans passed. Logs are
`/private/tmp/calendar-sky-release-rebased-{api,browser}.log` and the matching
`web-budget` / `admin-budget` logs. The new legacy editor regression is included
in `playwright.sky-article.config.ts` so the existing CI Sky article job runs it;
the browser-suite coverage check passes. This registration changes no runtime
source. Final hosted checks, merge revision and production verification are
recorded in PR #1112.

Hosted browser checks exposed two stale fixture assumptions after the UI/API
changes: the imported-template flow still clicked `Save`, and the phrase editor
fixture answered only plural `contentKeys` lookups. Updated the template test to
click `Save template` and assert `DRAFT`, and made the phrase fixture answer both
single and batch document lookups. Fresh builds passed all four template cases
through the web entry, the same four through standalone admin, and all eight
phrase editor variants. Full article, sibling horoscope and phrase assertions
remain intact. These corrections change tests only. Logs:
`/private/tmp/calendar-sky-release-template-label-browser.log`,
`calendar-sky-release-template-label-admin.log`, and
`calendar-sky-release-phrase-fixture-browser.log`.
