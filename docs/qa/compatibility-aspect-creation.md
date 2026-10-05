# Compatibility aspect creation

Request: `thread:01a0ffc5-1088-7520-a1df-0abaa1e3a4cc`, 2026-10-02.
The following measurements and acceptance record describe the initial October 3
implementation. Release integration is recorded at the end of this document.
Tested base: `8857bc7ef65bab61ce513b63c83005609a35571f`, plus the uncommitted
patch on `codex/studio-moon-midheaven-search`. This is local acceptance evidence,
not a claim that the interface change is deployed.
The remote was refreshed before final verification: 0 commits ahead and 0 behind
`origin/main`. SHA-256 of sorted path + NUL + complete bytes + NUL for the nine
changed implementation/test/workflow/package/budget files:
`8bc3f560a1409d19d527dcab62f6e45551786bddb83c710b1c9da34e3253707e`.

## Behavior

Compatibility offers **Add aspect content** in its shortcuts, Create menu and
empty search state. The form includes every supported planet/point, including
Ascendant and Midheaven, and the five exact major aspects. A recognized search
prefills the identity; a search without an aspect leaves that choice blank.

Opening an aspect checks saved inventory for both chart orders, independently
of loaded list pages. An existing source opens for editing without a write.
Otherwise, the normal source editor opens with separate You and Friend / They
passages. Partial drafts can be saved. Publication requires both directions.
The existing dynamic synastry reader admission and exact owner-approval path
serve the saved exact aspect; other aspects do not inherit it.

Search also recognizes square/opposition under existing Hard sources and
trine/sextile under Soft sources. No existing content is renamed or rewritten.

## Acceptance

The browser flow uses the actual API handler and isolated in-memory storage;
all passages and approvals in tests are synthetic. It covers:

- Existing Moon square Midheaven search against a grouped Hard source.
- Empty search discovery and prefilled Ascendant trine Midheaven creation.
- Failed source lookup with no mutation, followed by successful retry.
- Partial draft save, disabled incomplete publication, second-direction edit,
  reload and exact-text reopen.
- Owner publication and reopening the same source from the reverse chart
  order, even when it is omitted from the loaded inventory.
- Light/dark themes at 390 and 1440 pixels, no horizontal overflow, and equal
  computed title styles before and after saving.

`scripts/test-compatibility-aspect-create.mts` additionally checks every allowed
identity, unauthorized writes, unsupported and wrong-direction variables,
stale publication conflicts, draft exclusion from the public reader, exact
publication receipts, and both directions in the shipped synastry resolver.

Verified locally:

| Check | Result |
| --- | --- |
| Full `npm run test:content-studio-api` | Passed |
| Focused aspect API/resolver regression | Passed |
| Fresh-build Compatibility browser suite | 4 passed, including grouped search |
| Admin typecheck and CSS/token audits | Passed |
| Web and standalone Admin builds | Passed |
| Bundle budgets with the measured allocations below | Passed |
| Browser suite coverage | Passed |
| Repository and both built-output privacy scans | Passed |
| Standalone Admin check sequence | Two pre-existing failures, detailed below |
| New interface on production / exact-head CI | Unverified; patch uncommitted |

The standalone sequence is not wholly passing. `test-admin-writing-surface-map`
expects the literal phrase `separate third-person source writing` in an unchanged
natal editor. It fails identically on the separately installed main baseline.
`test-admin-article-workspace` fails under its configured Node strip-types runner
on an extensionless import, also identically on main; running that same test
with the repository's `tsx` loader passes. All other checks in that sequence
passed when run independently. Neither assertion nor unrelated production
source was changed to conceal these failures. Browser-only environment overrides
were scoped to builds; auth checks use their own test environment.

The owner's two supplied passages were saved as an unpublished Studio draft
under `fallback-hook/synastry-pair/ascendant/midheaven/trine`, with exact-text
hashes, word counts and source-task provenance. Authenticated readback and the
deployed editor confirmed both complete passages. They are kept in protected
Studio storage, not this repository. Publishing that draft and deploying this
interface patch are separate actions.

## Bundle measurements

Both checkouts have independent `npm ci` installations. Matched builds use the
Visual smoke workflow's synthetic Supabase configuration and natal-aspect flag.

| Metric | Main base | Patch | Change |
| --- | ---: | ---: | ---: |
| Web aggregate JavaScript gzip | 3,520,304 | 3,521,618 | +1,314 |
| Standalone Studio entry raw | 761,740 | 767,289 | +5,549 |
| Standalone Studio entry gzip | 221,649 | 223,145 | +1,496 |
| Standalone Studio aggregate gzip | 783,414 | 784,893 | +1,479 |

Allocate 1,500 web aggregate bytes, 5,500 Studio raw entry/largest bytes, 1,750
Studio entry gzip bytes and 2,000 Studio aggregate bytes above the prior caps.
The main baseline was already 164 bytes above its Studio aggregate cap. Reader
startup, CSS, individual reader chunks, lazy boundaries, forbidden payload and
runtime-performance limits remain unchanged. No dependency or reader prose is
added to the bundles.

Before release, commit the reviewed patch, require exact-head CI, and verify the
main deployment and the same Studio workflow. Local fixture publication does
not authorize or prove production publication of the owner's draft.

## October 5 release integration

The owner explicitly requested "please merge and push live" in the same task.
The feature was rebased onto main `91a53e55c2847bdb1aa0da476639150a90854a30`,
preserving the later Studio timeout controls, Calendar retrograde editor,
dedicated-editor routing and their CI coverage. Bundle allowances add this
feature's original bounded allocation to current main, rather than replacing
newer allocations. No approved reader source or generated content package is
changed by the code release. The previously saved owner draft keeps its existing
publication state.

Rerun the full API gate, four Compatibility browser journeys, typecheck,
CSS/token audit and bundle/privacy checks on the integrated version. Exact-head
CI and deployed-main verification belong in the release PR evidence; the
historical October 3 results above do not substitute for those checks.


Final matched standalone builds on the October 5 base measure 768,011 raw /
223,589 gzip entry bytes and 770,310 aggregate gzip bytes. The integrated feature
measures 773,530 / 224,835 / 771,575: +5,519 / +1,246 / +1,265. Main already exceeds
its raw-entry cap by 1,761 bytes. Reconcile raw entry/largest to 774,000, retain
225,000 entry gzip, and preserve main's 786,000 aggregate ceiling without a new
aggregate allowance. Web aggregate remains within its original feature allocation.

The full local Content Studio API gate and all four fresh-build Compatibility
browser cases passed after integration, as did typecheck, CSS/token audit,
reader-copy boundary, web bundle and repository/public-output privacy checks.

A later required update to main `0e8b3e98a` preserves the merged manual-transit
writing and preview recovery behavior. Independent builds with the same installed
dependencies and CI configuration measure baseline entry raw/gzip/aggregate at
768,671 / 223,857 / 770,906 and the combined feature at
774,190 / 225,253 / 772,290 (+5,519 / +1,396 / +1,384). The latest main already
exceeds its raw/gzip entry caps by 421 / 107 bytes. Reconcile the combined entry
limits to 774,500 raw and 225,500 gzip, retaining the 786,000 aggregate cap.
Preserve main's 750-byte web allocation and the original 1,500-byte Compatibility
allocation, for a combined web aggregate ceiling of 3,544,750 bytes.
