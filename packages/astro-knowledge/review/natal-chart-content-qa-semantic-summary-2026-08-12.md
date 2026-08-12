# Natal Chart whole-passage semantic QA — 2026-08-12

**Status:** complete  
**Authority:** owner-authorized billed batch, 2026-08-12  
**Model:** `gpt-5.6-terra`, medium reasoning  
**Governance:** advisory owner-review evidence only; no copy, approval, serving, auto-publish, or writer-promotion changes

## Scope and protocol

The input was the 8,110 distinct surface-specific passages in `artifacts/natal-chart-content-qa-inventory-2026-08-12.json`. The judge received only an opaque batch-local identifier and the rendered passage text. It did not receive source rows, render keys, facts, routes, deterministic findings, or astrology context.

For each judged passage, the model first stated one plain-sentence core message and then assigned `PASS`, `EDIT`, `CUT`, or `SOURCE_GAP` under `TLDR-NATAL-CHART-WHOLE-PASSAGE-FLOW-JUDGE-OWNER.md` at SHA-256 `df7ca21789ea4f12a8460ca2521f75ecba0d66f451f85f4c55d01ce984d25589`. Every `EDIT` or `CUT` includes one primary defect class and a diagnosis without replacement prose.

- Judged: **7,702**
- Deferred as `deferred-pending-pass-2`: **408** Friend passages with known second-person leakage
- Pending among eligible passages: **0**
- Completed core messages with exactly one sentence: **7,702 / 7,702**

The deterministic inventory contains 171 passages with `whether`. Of these, 114 were in the eligible set and received semantic judgments: 43 `PASS`, 70 `EDIT`, and 1 `CUT`. The other 57 overlap the 408 Friend second-person-leakage passages and remain deferred under the explicit do-not-spend-on-changing-text exclusion. No eligible judgment selected `whether` as its primary defect; the deterministic flag remains preserved as separate evidence.

## Verdicts by canonical family

The family is taken from the first stable render occurrence for each deduplicated passage.

| Family | PASS | EDIT | CUT | SOURCE_GAP | Total judged |
| --- | ---: | ---: | ---: | ---: | ---: |
| named-point | 82 | 14 | 0 | 0 | 96 |
| empty-house | 1,743 | 1,411 | 14 | 0 | 3,168 |
| glossary | 17 | 6 | 1 | 0 | 24 |
| natal-aspect | 270 | 921 | 10 | 2 | 1,203 |
| natal-aspect-pattern | 1 | 10 | 0 | 1 | 12 |
| placement-composed | 770 | 2,330 | 99 | 0 | 3,199 |
| **Total** | **2,883** | **4,692** | **124** | **3** | **7,702** |

## Primary defect class by canonical family

Only `EDIT` and `CUT` passages carry a defect class.

| Defect class | Named point | Empty house | Glossary | Natal aspect | Aspect pattern | Placement | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| astrology-restated | 5 | 183 | 5 | 578 | 5 | 316 | 1,092 |
| translation-required | 5 | 246 | 1 | 332 | 5 | 493 | 1,082 |
| real-filler | 1 | 28 | 0 | 1 | 0 | 54 | 84 |
| scaffold-grammar | 1 | 64 | 1 | 6 | 0 | 524 | 596 |
| trait-first | 1 | 0 | 0 | 8 | 0 | 13 | 22 |
| decorative-evidence | 0 | 63 | 0 | 1 | 0 | 7 | 71 |
| premature-complication | 0 | 17 | 0 | 0 | 0 | 2 | 19 |
| trait-naming | 1 | 0 | 0 | 0 | 0 | 8 | 9 |
| whether | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| other-named | 0 | 824 | 0 | 5 | 0 | 1,012 | 1,841 |
| **Total EDIT/CUT** | **14** | **1,425** | **7** | **931** | **10** | **2,429** | **4,816** |

The largest `other-named` cluster is an abrupt or unbridged topic/domain/subject shift between composed sections. Those labels remain verbatim in the results artifact so the owner can review the model's actual diagnosis rather than a post-hoc normalization.

## Calls, tokens, and estimated cost

- Credential preflight: **1** successful request, 603 tokens
- Successful checkpointed audit requests: **386**
- Requests abandoned in flight when the initial four-worker process was stopped for a faster resumable run: **4**
- Total requests issued: **391**
- Known tokens, including preflight: **3,822,565** total; 2,548,296 input and 1,274,269 output
- Known estimated cost: **$19.1619**
- Conservative estimated upper bound if all four abandoned attempts were fully billed at the successful-batch average: **$19.3605**

The successful audit results were checkpointed atomically by `renderKey|renderedTextSha256`. Resuming skipped every completed passage. The final results artifact contains all 8,110 records and no duplicate checkpoint key.

## Outputs

- Machine-readable results: `packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json`
- Owner-review workbook: `tldr-astro-phrasebank/TLDR-NATAL-WHOLE-PASSAGE-SEMANTIC-QA-OWNER-REVIEW-2026-08-12.xlsx`
- Resumable runner: `scripts/run-natal-chart-whole-passage-semantic-qa.mjs`

The workbook contains only the 4,816 `EDIT` and `CUT` candidates, with the composed passage, model verdict, defect, core message, diagnosis, stable render key, SHA-256, and blank owner-verdict/edit columns. Model findings do not alter content state.
