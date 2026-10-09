# Content Studio audit repairs

Repair PR: [#1188](https://github.com/usrnmtkn/astrology-portal/pull/1188).
Integration baseline: `fb91e8ff2` (main, including section inventory, Calendar API/loading, daily aspect peaks, dated ingress essays and Gemini horoscope recovery).
Exact final test and deployment revisions belong to the PR validation record; local fixture results do not establish a production release.

## Corrected behavior

| Area | Repair | Regression evidence |
| --- | --- | --- |
| Shared writer | Lexical, length, list and scene-structure signals remain advisory. Existing factual/rendering boundaries and full-context rhetorical review remain enforced. The effective owner policy also governs deterministic validation and the assembled prompt. | Shared-generation governance, rhetorical review, production pre-call and actual-handler suites; no provider calls. |
| Positive writing evidence | Serving approval and semantic rewrite rows no longer stand in for owner authorship. Selected registered owner passages remain complete, with source and exact-text hashes and word counts. Semantic references are labeled meaning-only. | Actual packaged index across ten surface/event families; long multi-paragraph evidence, negative/semantic exclusion, deduplication and fail-closed evidence floor. |
| Saved variables | A frozen renderer cache includes every referenced calculated value. Reusing a sign/planet no longer retains a previous next sign or chart-holder name. | Identical fixtures against Node reference, browser source and rebuilt shipped resolver. Package version `v3-2026-10-09-studio-variable-context`; generated manifests/index refreshed. |
| Calendar passages | Expand complete saved prose while preserving explicit fact tokens. Do not guess a variable from a rendered word that may represent several facts. | Colliding Sun/Moon signs, literal date wording, explicit nested tokens, actual CRUD/publication and date/timezone reader selection. |
| Composite variants | Studio and reader share the saved string/body/summary/copy schema and supported legacy fields. Public projection admits only seven relationship types and reader text fields. Canonical relationship mapping and romantic gating remain intact; unrelated chart comparisons use shared copy. | Actual save/reopen/stale-edit/draft privacy/public-read boundary, runtime normalization and complete rendered card/detail text. |
| Composite Review | Hydrate compact documents before showing empty writing; offer retry on failure; preserve inventory order/page; retain paragraph breaks and shared layout. | Desktop/mobile, light/dark, load/error/retry/reopen/reload, twelve-row pagination. |
| Serving badges | Query the displayed saved revision. Only a displayed package baseline may use the package identity. | Actual status handler and rendered Draft-versus-Live comparison. |
| Lifecycle audit | Verify required surface identities rather than a historical fixed count; record current date, revision and package version. | 26 surface maps, seven reference-only retired rows and 19 clean shipped partitions. |
| Section coverage | Incorporated main's missing stations/templates, metadata classification and composite scope repair. | Both actual handlers, full details/pagination and the section-visibility browser suite. |
| Calendar browser contract | Match the existing month view's omission of wholly out-of-month weeks. July 2026 renders five rows. | Fresh-build mobile regression checks 35 cells, all 31 July dates, June 28/August 1 boundaries, layout, touch targets and client errors. |
| Report judge fixture wiring | Give unchanged reference units their own minimal, hash-pinned composition packet. Keep the independent fictional routing fixture separate. | All five complete-unit contracts pass; altered source dates still fail. Protected reference hashes, paragraphs, comparison evidence and fact-lock checks remain enforced. |
| Sky detail test setup | Load the browser service graph through Vite so environment-dependent imports can run in the content suite. Keep exact source bytes separate from existing display-whitespace normalization. | 878 published identities in both directions; full displayed paragraphs, event signs, stale-revision refusal, offline retention and retirement checks pass. The original Node import failure also reproduces on untouched main. |
| Composition source preview | Hydrated catalog-only package rows join inventory; existing saved rows still hydrate in place without moving the review page. | Full protected source copy before/after reload and editable-starter discovery in the actual browser. |
| Calendar API deadline | Cold week/month reads use the existing eight-second reader deadline. CI showed a healthy response colliding with the former 2.5-second cutoff and launching the local engine. | Delayed actual-handler responses stay on the API path; outage recovery, bounded abort, DST and timezone facts remain covered. |
| Current Calendar browser contracts | Include the released Daily writing workspace and complete quarter-Moon paragraphs. | Verify full source paragraphs and saved-template navigation in desktop/mobile and light/dark views; no source prose changes. |

## Scope and boundaries

No owner prose, saved horoscope profiles, saved phrases, publication state or production database rows are rewritten. No paid generation is used. Original private report references remain in ignored protected local storage. Tests write only to isolated storage.

The repeated branch-push and PR API checks are intentional release requirements in `docs/qa/content-studio-api-verification.md`; this repair retains them. The older Admin/Web boundary audit still reports the same 77 findings as an independently installed main checkout. Those existing shared-module/extraction findings are not silently waived or claimed fixed by this patch.

## Bundle comparison

Both checkouts have independent `npm ci` installations and use the same CI Supabase placeholders. Web builds enable natal aspect patterns. Composite Review loads as a deferred module.

- Main standalone Studio: 785,709 raw / 228,944 gzip entry bytes; 788,414 aggregate gzip bytes across 78 files. Repair: 784,680 / 228,563 at entry; 789,287 aggregate across 79 files (+873). Main already exceeds its old aggregate cap by 14 bytes. Allocate 1,250 aggregate bytes above main, leaving 363 bytes; retain entry and other limits.
- Main web: 3,557,262 aggregate gzip bytes; repair: 3,559,251 (+1,989), within the unchanged 3,562,500-byte cap. App/reader startup grows from 464,332/518,286 to 465,012/518,966 (+680 each). Allocate 750 bytes above each current startup cap for shared composite variant selection. Sky detail grows from 5,974 to 6,023 bytes; retain the audit's 100-byte allowance above main. CSS, other chunks, graph and dependency limits remain unchanged.

The earlier `25fd2c1e3` comparison remains in the preceding commits. These measurements replace it for the final integration with `fb91e8ff2`.

## Release verification

The required unfiltered API gate must pass locally and on the exact PR head. Fresh-build browser evidence uses synthetic content and isolated API storage. Deployment verification must name a READY main revision and distinguish deployed-frontend fixture tests from read-only checks of actual saved owner content. A draft PR or a healthy endpoint is not a live-release claim.

The broader `npm run test:content` exposed an existing report-calibration mismatch, reproduced on untouched main `62460b456`: the complete-unit judge used the general routing fixture's deliberately fictional dates. The judge now reads `report-judge-reference-unit-facts.json`, containing only the attribution dates and point/house associations already recorded in its public claim manifest. This is a composition fixture, not a calculated natal chart; it contains no identity, birth inputs, signs, degrees or longitudes. The input is fixed independently of runtime packet assembly, hash checked by both judge entry points, and tested against byte-locked reference units. Changing input dates still fails. Protected owner text, historical calibration artifacts and the general routing/privacy fixture remain unchanged. No live calibration is run or authorized.

The follow-up full run passes that report gate and exposed the Sky-detail Node/Vite setup failure, also repaired above. A sequential diagnostic sweep executed all 113 commands in the content and post-content scripts. After the focused Sky-detail repair, 28 other commands still fail. Each reproduces the same first failure on independently installed, untouched main `9fbedf2fd`, and all 28 failures were reproduced again after advancing that baseline to `25fd2c1e3`, then `fb91e8ff2`; the first error in each command remains unchanged. They include historical copy/approval hash drift, old UI source-pattern checks, a relative-import test-loader failure, and stale inventory/writing-harness artifacts. No protected prose, approval record, historical hash or failing assertion is changed to clear these failures. This is **not a green full-content-suite result**; the protected local comparison records the exact commands and paired failures. These require a separate source-provenance and test-contract reconciliation before a clean full-suite claim.

Final integration checks: the full local Content Studio API gate passes, as do 33 affected reader/section/Calendar browser cases and 11 standalone Studio cases from fresh builds. The latter includes complete package-source text before and after reload, Calendar templates in both themes and widths, and composite review loading/error/retry/pagination. Calendar timezone, range, cancellation and delayed healthy-response checks pass. Approved serving projections and lineage are byte-equivalent after excluding package-version and its derived manifest hash. These results establish local behavior; the PR records the hosted checks and actual production revision separately.
