# Content Studio and chart wiring audit — 2026-10-29

The [October 30 follow-up](lunation-studio-publication-2026-10-30.md) resolves the
initial book provenance, local private-evidence and eclipse-publication gaps
described below. This report retains the initial audit's evidence and limits.

Branch: `codex/ratm-lunation-horoscopes-20261029`. The initial audit used
`a8e89c62c`; the checkout was then fast-forwarded to `9d0c5250e` on `origin/main`.
The owner-requested changes remain uncommitted and undeployed. This is an audit
and local implementation report, not production-release approval.

## Findings and changes

1. Complete fallback sources were missing from Studio's composition discovery
   contract. The hook-only package catalog omitted complete house horoscopes,
   the 288 RATM passages, and canonical lunation articles when no saved database
   mirror existed. The catalog now uses the same source-family contracts as the
   composition map. The map also identifies existing dated Sky articles, lunar
   fallback components, station/week opening copy, and exact transit inserts
   used by their current consumers. Source documents still load on selection;
   the catalog contains identifiers, titles and roles only.
2. Published RATM revisions reached the dated article but were discarded by the
   shared fallback package loader. Exact, valid book identities with the
   `full_copy` role now enter that overlay. A regression first reproduced the
   missing overlay and now verifies actual Studio publication → public reader
   projection → package assembly → shipped renderer, including retirement.
3. The previously implemented RATM article and Studio wiring remains covered by
   all 288 source identities, complete passages, article-specific precedence,
   version checks, retry, save/reload, and publication tests.
4. No further confirmed reader/publication wiring failure was found in the
   exercised natal, synastry, compatibility or composite flows. The early
   calculation-worker asset failure did not recur on a fresh build and preview.

No approved source prose, PDFs, generated knowledge, or resolver distribution
was edited. Source governance and exact publication checks remain in place.

## Scope and acceptance

| Surface/boundary | Result | Evidence |
| --- | --- | --- |
| Studio source discovery without saved mirrors | Passed | Actual authenticated catalog and package-source handlers; complete house/RATM copy opens and survives reload in 390/1440px, light/dark layouts. |
| Sky placement articles and source editors | Passed | Active article/pending revision isolation; canonical article, motion and hemisphere source selection; failure/retry, repeated edits and publication. |
| Ordinary new/full moon articles | Passed | Twelve RATM passages for guest readers; original opening and final text; both direct dates and reload; complete source edit/save/publish flow. |
| Shared RATM fallback renderer | Passed | Actual published row is packaged and rendered by the shipped runtime; retirement cannot reveal the original. |
| Natal placements for You and Friends | Passed | Complete owner passages, separate Friend copy, direct/retrograde routing, source selection and publication, unknown-time safeguards and late hydration. |
| Natal empty houses, rulership, day/night | Passed | Actual preview handlers; source editing, reload, repeated saves, retirement, approved publication and independent sect drafts. |
| Natal aspects and patterns | Passed | Exact source precedence, owner publication, full opening/ending, authenticated pattern read/preview and unknown-time rules. |
| Synastry and compatibility | Passed | Directional and exact sources, first-visit content, complete details, missing exact-aspect creation/save/reopen/publication, and retirement. |
| Composite | Passed | Complete shared/relationship-specific passages, card/detail agreement, type fallback, full-document loading/retry, pagination and actual publication API contracts. |
| Production publication pointers | Passed, read-only | 7,299 Live/serving row metadata records inspected. The consistency query found no live pointer referencing a missing row, different key/version, non-Live lane/state, or pending review. |
| Production UI | Read-only observation | Natal source finder, Compatibility and Composite Review load saved sources. The deployed October 26 Taurus article still lacks the unshipped RATM section. |
| Production changes | Not performed | No content mutations, paid generation, commits, merge, deployment, or alias changes. |

The registry contains 9,872 approved/reviewed, enabled, non-retired records.
Initially 1,507 had no composition-map family. The revised contracts reduce
that number to 56, consisting of career/report families and two other legacy
records outside the chart/Sky editor paths examined here. A family match is
discovery metadata, not a publication entitlement.

Protected eclipse sections retain their package integrity constraints. Their
components can be inspected as sources; this change does not create a generic
Studio publication path for replacements or remove the required exact-source
approval/hash relationships. Ordinary RATM new/full-moon edits have the tested
publication path described above.

## Verification and limits

- Across the audit runs, 209 distinct browser cases passed. The final fresh
  budget-passing build was checked again for complete-source discovery, all
  twelve RATM article/editor cases, and the calculation-worker regression.
- Web and server typechecks, fresh web/admin builds, reader-copy boundaries,
  CSS/token audit, admin boundaries and the unchanged bundle budgets passed.
  Final reader startup is 395.9 kB JavaScript / 454.2 kB including awaited CSS,
  gzip. The new eligibility key shares the existing eligibility chunk rather
  than pulling the Sky utility chunk into startup.
- All 41 focused chart/Sky/Studio contract commands passed again after the final
  shared-loader change and update to current main.
- The broader independent API-command matrix passed 156 of 164 commands on the
  initial base. Two additional failures were corrected and passed: the missing
  emitted test dependency, and a runner PATH issue resolved by invoking `tsx`
  through Node. Together with the focused set, 199 command checks passed.
- Six command groups remain blocked by unavailable protected ingress or report
  documents. These include approved-voice checks, ingress writer/editorial
  checks, shared writing feedback, and report rhetorical admission. This is not
  a clean `test:content-studio-api` release-gate result.
- Five optional browser cases need private approved-row/draft snapshots and
  were skipped. Synthetic publication, complete-source and reader tests passed
  separately; they do not certify every saved production passage.
- The existing `test:lunation-book` source-file hash mismatch remains as recorded
  in [the RATM report](ratm-lunation-horoscopes-2026-10-29.md). All 288 body values
  match the current canonical source; the stale generated top-level hash was
  not rewritten as part of this wiring change.
- Automatic approval review rejected sending the bulk production-derived key
  inventory to the public reader API. That scan was not executed. Production
  evidence is restricted to read-only database consistency checks and UI reads;
  mutation/publication evidence uses isolated fixtures and actual handlers.

Repeatable browser configuration: `playwright.wiring-audit.config.ts` builds
fresh web/admin previews with `reuseExistingServer: false`. The separate
`playwright.lunation-horoscopes.config.ts` verifies the complete lunar flow.
Private logs and metadata remain outside Git under
`/private/tmp/tldr-wiring-full-pass-20261029/`.
