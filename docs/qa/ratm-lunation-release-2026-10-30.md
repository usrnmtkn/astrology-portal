# RATM lunation wiring release verification

Initial local base: `e7565639297769576b764135ec6e2eff01cd7040`.
Branch: `codex/ratm-lunation-horoscopes-20261029`. This integrates the saved-wording
and publication-status repairs from main before releasing the lunar work.
The release also integrates main's mobile/chart-parity repair at
`7402336cb8fd97327c74010e9b01c214e505e200`; both mobile and lunar jobs remain
dependencies of the browser release gate.

The complete 288 RATM records remain identical to main, including their approval
metadata. Only the book source file's stale top-level provenance hash changes.
No approved source wording, writer profile or production content row was edited.
Twelve held whole eclipse drafts remain excluded; the 42 released components
use the explicit owner publication action and preserve their originals.

## Verified local journey

Studio source discovery opens complete passages without requiring saved database
mirrors. Draft edits save and survive reload, stale writes fail, explicit
publication issues an exact body-hash receipt, and the actual public reader
projection reaches Node, browser-source, shipped-artifact and app renderers.
New/full-moon articles use the twelve approved RATM fallbacks, with exact saved
article sections and published source revisions retaining precedence. Retirement
cannot reveal an older original. All write tests use isolated fixture storage.

| Check | Result |
| --- | --- |
| Full unfiltered Content Studio API suite | Passed, including the new lunar regressions and current main's publication/edition contracts. |
| Complete lunar integrity suite | Passed: all 288 book passages, all 42 released eclipse components, 24 eclipse contexts, source/hash preservation and independent book/eclipsed-unit versions. |
| Fresh-build browser verification | 241 distinct cases passed across the chart/Studio pass, both integrated Studio suites, lunar writers and RATM reader/editor cases; five optional private-snapshot cases skipped. |
| Types, styles and architecture | Web/admin builds, server types, CSS/token audits, real Rollup boundaries, manifest and knowledge-index checks passed. |
| Web budgets | Startup 396,794 bytes gzip; reader including awaited CSS 455,146; aggregate JavaScript 3,687,071. Existing ceilings retained. |
| Studio budgets | Startup 817,451 raw / 237,205 gzip; aggregate JavaScript 863,184 under 864,100. Lunar editor entries remain independently deferred. Existing ceilings retained. |
| Privacy | Source and both built asset scans passed. Protected documents, source evidence and policy remain ignored. |
| Browser CI coverage | The lunar source-publication job runs all three new specs; the aggregate browser release gate depends on it. Workflow syntax, coverage and failure/cancellation contracts pass. |

The broad local run above used code/test/workflow fingerprint `7bfc047a4b9d5794fe0bfeb94867535b2848da019b4915430a32f344c8ebdac0`.
Documentation is excluded; the private record retains each source path and hash.
Local command logs and screenshots stay under protected temporary storage.

The hosted corpus check also required refreshing the non-serving production Sky
comparison after the knowledge-index provenance changed. The existing builder
updates only 36 packet/index hashes; all comparison evidence, fields and writing
remain unchanged. Its deterministic freshness check passes with zero model calls.

The hosted performance gate also caught a source-level contract that requires
ordinary authored cards to prefer the saved top-level body. Keep that selection
explicit, then preserve exact whitespace only for receipt-checked lunar revisions.
The existing contract stays intact, and a runtime regression checks complete
ordinary-card revisions alongside the full lunar integrity suite.

After the main integration, the repeated chart/Studio audit passed 217 cases with
five optional private-snapshot skips. All 28 lunar browser cases also passed.
The combined build exposed a small startup budget overage. Dated lunar loading,
aspect selection and horoscope labels now stay in the lazy lunar reader, while
three existing pure startup helpers share their existing transport. Lunar
identities share an optional reader chunk instead of importing Studio tools.
The actual Rollup graph guard now covers that lunar boundary. Existing bundle
ceilings remain unchanged; the final exact head and its checks are recorded in
the release PR.

Hosted checks must pass on the exact PR head before merge. Deployment proceeds
through the main Git integration. The release PR records the final head, merge
and deployment revisions plus read-only production verification. Local fixtures
do not establish production delivery, and no paid generation or live content
publication is part of these checks.

## Editing locations

- **Content Studio → Composition → Sky Horoscopes**: search the RATM family or
  the released eclipse section/house-layer families, then choose **Edit selected
  source**.
- **Sky Write-ups → selected lunation → Rising-sign horoscopes**: choose
  **Edit source** under the rising sign. Save a private draft, then explicitly
  choose **Save & publish** when its complete wording is approved.
