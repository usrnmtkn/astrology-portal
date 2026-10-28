# UI integration and local release QA — October 27, 2026

The owner approved integrating current main with the accumulated design handoffs, resolving local release gates, and preparing a local review. No deployment, commit, push, owner-content publication, or paid generation was performed.

## Source and preservation

- Integration checkout: `<local-checkouts>/tldrastro-ui-release-qa-20261027`, branch `codex/ui-release-qa-20261027`.
- Final integration base: `4fc3d7dde9dcb67ed8408419953bc5aa4dcead56` (`origin/main`, 0 ahead / 0 behind on the final refreshed comparison). The initial base was `84c8c5e8a9bc1a95c6c8cb7013b8ac32bbce81d5`; Calendar contact and exact-aspect timing fixes landed during QA and were integrated before final verification.
- Previous UI checkout: `<local-checkouts>/tldrastro-ui-handoff-review-20261026`, base `5eddffa5d38ac38b594781f576ba24387d439b6d`.
- Before integration, all 288 changed/untracked UI files were snapshotted outside the checkouts. A final SHA-256 comparison found zero changes in that original checkout.
- The integration checkout and the clean detached main baseline each received their own `npm ci` installation and local knowledge build. No shared dependency directory was used. After the initial measurements, that checkout became an independent API-gate replica. A second clean checkout at the final main revision, `<local-checkouts>/tldrastro-ui-main-baseline-20261027`, received its own `npm ci`, knowledge build and clean-main measurements before becoming the independent content-gate replica. Neither gate replica receives the localhost development env file. Source fingerprints and provenance are recorded with the receipts.
- The existing ignored development configuration was copied byte-for-byte for localhost. No configuration values are included in this receipt.

## Reconciliation

Overlapping Studio, natal, Sky, script and budget changes were reconciled. The later Calendar/timing integration applied cleanly to the UI components; its package-script conflict was resolved without dropping any main or prior UI command. The integrated implementation preserves:

1. Main's deferred Studio draft factory, including Sky placement aspect bridges, plus the approved Friction & Flow catalog and validation. Actual-handler tests now create their drafts through that central factory.
2. Main's preferred sign/house natal-reading selection alongside the approved chart-sect page and Patterns & Insights presentation.
3. Main's complete source passage and house/aspect bridge composition inside the approved “Where it lands for you” card.
4. Every main release script alongside the added UI/forecast/Friction & Flow checks.
5. Main's Admin bundle allocations, with a measured allowance for preserved UI features below.

Private ingress voice references and the report evidence store were recovered from an existing local project checkout only after verifying their registered/body hashes. Both remain ignored with mode 0600. No private prose was added to source or browser assets. The seven private synastry drafts remain unchanged.

## Verification

| Criterion | Result | Evidence |
| --- | --- | --- |
| Web TypeScript and API prerequisite type checks | Passed | `npm run typecheck` plus the API gate prerequisite |
| Shared CSS/token contract | Passed | `npm run qa:css-audit` |
| Complete Content Studio API gate | Passed on final base | `npm run test:content-studio-api`, including its local knowledge prerequisite |
| Full content-integrity gate | Passed on final base | `npm run test:content` |
| Public and signed-in browser journeys | Passed on final base | 560 distinct production-preview cases: 510 broad cases plus 54 journey cases with 4 overlapping cases; metadata in `test-results/ui-release-integration-2026-10-27/browser-coverage.json` |
| Admin import and lazy boundaries | Passed | Admin/web boundary regression, actual-manifest lazy-boundary regression, and source audit |
| Reader and Admin bundle gates | Passed | Matched measurements below; forbidden payload/deferred-source guards retained |
| Original UI work preserved | Passed | 288 source hashes unchanged |
| Localhost served from integrated checkout | Passed | Verified Vite process cwd, normal current Sky rendering, disabled angle cards, and native screenshot; same origin/storage retained |

Browser coverage includes mobile and desktop light/dark states, shared navigation and child Back actions, loading/empty/error recovery, Reports account recovery and stale polling, Calendar/journal drafts and private people/tag persistence, saved editions, planetary horoscope routing, chart-sect scope, and complete Sky aspect bridge content with publication and retirement.

The calculation diagnostic contracts now follow the deferred panel while retaining every label and its development/opt-in guard. Calendar checks verify independent canonical Moon-mask colors for both waxing and waning crescent/gibbous states. The weekly test uses the updated card grid, an explicit complete date-specific published macro fixture, and an empty environment directory so owner localhost settings cannot alter fixture publication state. The packaged weekly source was already present; no runtime loading change was needed.

The Friends source contract now expects all ten provenance gates, including both new feed stages; explicit checks preserve gating before selection and after timing resolution.

The Reports fixture source contract was also updated to verify its shared `ModalDialog` shell and mobile sheet rule, rather than requiring a duplicate layout rule in Reports CSS. Rendered key-date focus, complete text, and mobile alignment checks remain enforced.

The broad run initially passed 498 of 502 cases; four assertions expected the old blog error sentence to be the entire alert. The updated handoff includes an error heading and cause. The following journey run passed those four cases. Seven additional journey assertions were updated to match the approved date-picker commit action, the three visible friend tabs plus More menu, canonical auth-action weight 600, the “Try again” check-in action, and the current post-sign-out dialog. All seven passed in a fresh production build. Persistence, privacy, content, and authentication assertions remain enforced. After the concurrent main fix was integrated, all 510 broad cases and all 54 journey cases passed again. The final 560-case receipt merges results by file and case title rather than adding overlapping run totals.

The native localhost review rendered current calculated Sky data and the disabled angle cards. The owner browser is currently signed out; its storage was not cleared or replaced. Signed-in and recovered-session behavior was verified in isolated browser contexts.

These are isolated-fixture browser/API checks, not a production acceptance claim. The chart-failure case deliberately refuses the calculation asset and waits for the real watchdog. Write tests use isolated storage and intercepted providers. No owner records or sessions were changed for testing.

## Measured bundle allocations

All sizes are bytes. Builds use Node v22.20.0 arm64, zlib `1.3.1-470d3a2`, gzip level 9, the same lockfile, and the same synthetic service settings. Reader builds enable natal aspect patterns. The clean Admin baseline uses the same empty aspect flag as the integrated Admin build.

| Reader build | App startup gzip | Reader startup with CSS gzip | Aggregate JavaScript gzip |
| --- | ---: | ---: | ---: |
| Clean final main | 391261 | 446375 | 3655166 |
| Preserved previous approved UI build | 395860 | 454200 | 3669130 |
| Final integrated UI | 396794 | 455134 | 3673825 |

Final integration adds 934 bytes to both startup graphs compared with the previous approved UI. The app startup ceiling gains 600 bytes (396250 to 396850; 56 remaining), and the reader startup ceiling gains 500 bytes (454750 to 455250; 116 remaining). The last 100 app bytes cover the concurrently merged timing/contact fixes, whose independent main build adds 140 startup bytes; the integrated build adds 132. Aggregate JavaScript remains under the unchanged 3684050 ceiling. All individual chunk, CSS, deferred-content, source-payload and memory graph guards remain enforced. This is a documented integration cost, not a performance improvement.

| Admin build | Entry raw | Entry gzip | Aggregate JavaScript gzip | JS files |
| --- | ---: | ---: | ---: | ---: |
| Clean final main | 809250 | 234641 | 847058 | 85 |
| Final integrated UI | 810192 | 234824 | 853561 | 87 |

The final Admin delta is +942 raw entry / +183 gzip entry / +6503 aggregate gzip bytes. The initial integration comparison measured +6363 aggregate bytes. The final deferred Friction & Flow source/workspace chunks account for 3288 aggregate bytes; the pair-forecast calculation worker adds 2656 compared with clean main. Entry/largest raw ceilings gain 250 bytes, entry gzip gains 250, and aggregate gzip gains 6600 above current main's limits. The final limits leave 208 raw-entry, 76 entry-gzip and 189 aggregate-gzip bytes. The initial Studio graph remains one file; sources remain deferred. This preserves the requested features and records their cost without claiming a speed improvement.

Small measurement files and final command receipts are saved in `test-results/ui-release-integration-2026-10-27/`. Full raw logs remain local under `/private/tmp/tldrastro-release-qa-*` to avoid copying private test context into repository documentation.

## Limits

Changes remain local and uncommitted. Release QA does not approve publication of owner drafts or deployment. Any later PR must rerun the unfiltered API gate on its exact head and any later production acceptance must verify the deployed revision.
