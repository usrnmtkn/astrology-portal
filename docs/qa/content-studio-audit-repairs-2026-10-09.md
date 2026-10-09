# Content Studio audit repairs

Repair PR: [#1188](https://github.com/usrnmtkn/astrology-portal/pull/1188).
Integration baseline: `62460b456` (main, including the section-inventory repair).
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

## Scope and boundaries

No owner prose, saved horoscope profiles, saved phrases, publication state or production database rows are rewritten. No paid generation is used. Original private report references remain in ignored protected local storage. Tests write only to isolated storage.

The repeated branch-push and PR API checks are intentional release requirements in `docs/qa/content-studio-api-verification.md`; this repair retains them. The older Admin/Web boundary audit still reports the same 77 findings as an independently installed main checkout. Those existing shared-module/extraction findings are not silently waived or claimed fixed by this patch.

## Bundle comparison

Both checkouts have independent `npm ci` installations and use the same CI Supabase placeholders. Web builds enable natal aspect patterns. Composite Review loads as a deferred module.

- Main standalone Studio: 782,242 raw / 227,862 gzip entry bytes; 785,944 aggregate gzip bytes across 78 files. Main already exceeds the original entry ceilings.
- Repair standalone Studio: 781,189 raw / 227,487 gzip entry bytes, within the unchanged entry ceilings; 786,829 aggregate gzip bytes across 79 files (+885). The aggregate allowance increases by 500 bytes; entry, graph, CSS and dependency limits stay unchanged.
- Main web aggregate: 3,552,061 gzip bytes across 225 files; Sky detail chunk 5,970 bytes. Repair web: 3,554,455 gzip bytes across 228 files (+2,394); Sky detail chunk 6,027 bytes (+57). The bounded allocation is 750 aggregate bytes and 100 Sky-detail bytes above the existing limits; startup and other surface limits remain unchanged.

## Release verification

The required unfiltered API gate must pass locally and on the exact PR head. Fresh-build browser evidence uses synthetic content and isolated API storage. Deployment verification must name a READY main revision and distinguish deployed-frontend fixture tests from read-only checks of actual saved owner content. A draft PR or a healthy endpoint is not a live-release claim.
