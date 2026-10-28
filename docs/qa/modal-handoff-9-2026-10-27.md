# Shared dialogs and natal reading pages — October 27, 2026

The reader refinements are available locally at `http://127.0.0.1:5173/you/natal/twelfth-ruler`. **368 distinct browser scenarios have passing latest results**, combining a broad run with focused verification after its findings. This is not one uninterrupted 368-case run and is not a production-release certification.

## Revision and preservation

- Checkout: `<local-checkouts>/tldrastro-ui-handoff-review-20261026`.
- Branch: `codex/ui-handoff-review-20261026`; tested base `5eddffa5d38ac38b594781f576ba24387d439b6d` plus the preserved local design work and this refinement.
- This checkout has its own `npm ci` dependencies and local knowledge-package build. Localhost 5173 serves this checkout; ignored development configuration was transferred without exposing its values.
- Final remote refresh found `origin/main` at `98bec06314d4df455eb16acf42ff8db591630cfd`: **0 ahead / 1 behind**. The additional commit restores native archive/draft recovery in Content Studio. It is not included in this acceptance snapshot.
- The previous integration checkout remains intact. All **198 original design-worktree file hashes match** their preservation manifest. [Preservation receipt](../../test-results/modal-handoff9-2026-10-26/original-preservation.json).
- The current-main integration retained both branches' checks and allocations. Three-way integration evidence is retained in [the copy receipt](../../test-results/modal-handoff9-2026-10-26/integration-copy.json) and [overlap inventory](../../test-results/modal-handoff9-2026-10-26/integration-overlap.json).
- No commits, pushes, deployments, paid generation, owner-content mutations or publication were performed. Protected serving artifacts and the knowledge corpus have no diff from the tested base. The seven private Synastry drafts remain unchanged.

## Reference and implemented behavior

The reference is `GitHub app design system (9).zip`, SHA-256 `6f9b8b0ed288fc4056e3f075274260a4943347ae080902be4d804fe523d9ab2e`. Its README and modal HTML/CSS were read as design evidence; uploaded support scripts were not executed. Compatibility cards were also checked against the supplied ZIP (8).

| Criterion | Result and evidence |
| --- | --- |
| Shared reading/settings/confirmation presentation | Passed. Desktop widths 640/560/440, 48px top clearance, bounded scrolling and fixed headers; mobile bottom sheets, handle and safe-area padding. One shared component serves dignity, report key dates, Calendar preferences/link-ready and report deletion. |
| Reading typography and scrolling | Passed. Newsreader 19/1.5 and separate saved paragraphs; 20px desktop/18px mobile gaps. Titles compact to 22px on scroll, with a hairline and conditional bottom fade. Home/End explicitly target the scroll region so header resizing cannot leave the reader above or below the intended endpoint. |
| Keyboard, touch and reduced motion | Passed. Initial title focus, trapped Tab/Shift+Tab, Escape, opener restoration, inert background, nested-dialog restoration, touch dismissal and fade-only reduced motion. Confirmation ignores backdrop clicks and has no Close control. |
| Calendar preferences and ready state | Passed. Fixed full-width action, one header/title, saved preferences, retry, copy/app actions and focus behavior remain functional. |
| Report deletion | Passed with isolated storage fixtures. Equal-width Cancel/Delete actions; Escape/Cancel do not delete; duplicate submissions are prevented; failure retains the dialog for retry; success persists after reload and restores focus to a surviving library control. No owner report was deleted. |
| Long Insight reading | Passed for You and Friends. “Understanding undoing” now opens `/you/natal/twelfth-ruler` or `/friends/:id/natal/twelfth-ruler`. The introduction and calculated ruler-house section remain complete, including repeated paragraphs. Deep links, reload, browser Forward, immediate-parent Back and opener focus are verified. Empty publications and retryable failures use the same readable page layout. |
| Day/Night chart pages | Passed in the broad suite. Existing page routes, sect facts, complete saved paragraphs, audience-specific sources, reload and Back behavior remain intact. No missing Night chart prose was invented. |
| Compatibility and card titles | Passed. Compatibility uses the supplied 56px glyph and 44px circular read cue. Insight titles remain complete; only body previews are clamped. Every preview opens its complete saved reading. |
| Missing reports versus temporary failures | Passed. Unknown IDs/slugs use the shared “Report not found” design and a Reports destination. Temporary loading failures retain a retry action and do not masquerade as deleted reports. |

The browser sweep also covers Sky/placement/aspect/retrograde pages, all horoscope periods, Guide/blog, Calendar day/week/month and journal, You, Friends Feed/Circle/Charts and profile tabs, Account/Settings, guest/member report states, navigation order, date/location controls, loading, empty/error states, body/card typography and child Back controls. Modal stress coverage includes 320, 390, 800, 960 and 1440px widths at 390 and 900px heights, in both themes.

## Browser evidence

All runs build the production reader and start a dedicated strict-port preview; no existing preview server is reused. Data-changing journeys use synthetic accounts, publications and service/storage fixtures. Native in-app-browser verification is read-only against localhost, with the actual saved Insight reading and Back/opener restoration inspected.

| Run | Result | Qualification |
| --- | ---: | --- |
| Focused recovery | 90 passed | Modal viewport/keyboard/touch, report states/actions, complete Insight pages and combined cards. |
| Broad acceptance | 360 passed, 4 failed | Four older account journeys still expected the retired Insight button/modal. The original failures and traces are retained. |
| Final card/page acceptance | 32 passed | Updated account journeys, complete unclamped card titles, combined Patterns & Insights and full page/reload/Back behavior on the final CSS build. |
| Final Insight state acceptance | 4 passed | Both audiences exercise missing publications and failure/retry at phone/desktop widths in both themes. |

[Latest results by scenario](../../test-results/modal-handoff9-2026-10-26/latest-results.json) contains **368 passing latest results**, zero non-passing scenarios and the separate run statistics. The focused 90 overlap this inventory and are not added to the distinct count. [Source hashes](../../test-results/modal-handoff9-2026-10-26/source-hashes.json) and raw run JSON/logs are retained beside it.

## Static, copy and build checks

- Web TypeScript, CSS/token audits, Studio/live design layers and `git diff --check`: passed.
- Full-detail copy: **1,880 protected passages / 17 registered consumers** passed. The new page consumers use the existing full-body boundary; the new body-preview clamp is explicitly inventoried. No title or article body is clamped.
- Reader copy boundary: **10,955 rows / 19,217 fields**, no findings.
- Sect/Insight routing, Friends/You routing and natal pattern contracts: passed.
- Actual Friend publication handlers, 64 Friction/Flow handler sources and horoscope context/privacy checks passed in isolated fixtures. These selected checks do not replace the unfiltered API gate below.
- Final web bundle gate: passed. The shared-dialog allocation is documented in `scripts/web-bundle-budgets.json`; no content was removed or dependency changed to fit it.

| Final gzip measurement | Bytes | Limit |
| --- | ---: | ---: |
| App startup JavaScript | 393,279 | 393,350 |
| Reader boot including awaited CSS | 449,796 | 450,000 |
| Reader startup CSS | 56,517 | 58,100 |
| All CSS | 141,764 | 142,000 |
| Shared deferred Memory CSS | 31,367 | 31,400 |
| All JavaScript | 3,667,726 | 3,684,050 |

[Final web measurements](../../test-results/modal-handoff9-2026-10-26/final-measurements.json), [bundle output](../../test-results/modal-handoff9-2026-10-26/final-budget.log), [CSS audit](../../test-results/modal-handoff9-2026-10-26/final-css.log), [copy preservation](../../test-results/modal-handoff9-2026-10-26/final-full-detail-copy.log).

## Remaining release gates

1. **Unfiltered Content Studio API gate fails:** three approved-voice tests stop with `INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE`. Required private ingress-reference evidence is unavailable in this checkout. No private prose was copied into Git and the evidence requirement was not weakened. [Gate log](../../test-results/modal-handoff9-2026-10-26/integrated-api.log).
2. **Standalone Admin bundle gate fails:** entry 234,753 / 234,650 gzip bytes and total 850,609 / 846,050, exceeding the limits by 103 and 4,559 bytes. Independent Admin builds using the pre-refinement and updated shared ModalPortal produce byte-identical entry JavaScript and identical aggregate totals. The recorded failure predates this dialog refinement; it remains a release blocker. [Current gate](../../test-results/modal-handoff9-2026-10-26/admin-budget.log), [before-refinement comparison](../../test-results/modal-handoff9-2026-10-26/admin-before-budget.log).
3. Integrate the newly arrived `98bec0631` Studio archive/recovery commit and run its affected API/editor flows before merging or releasing this branch.

Real OAuth/email delivery, payments, paid report generation, production publication, Firefox/Safari and assistive-technology behavior are not certified by these local Chromium results. Sky collective angle cards stay disabled by owner instruction until their own articles exist.

![Live Insight reading opened as a page](../../test-results/modal-handoff9-2026-10-26/insight-page-live.png)
