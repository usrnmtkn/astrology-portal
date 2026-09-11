# Friends release performance investigation — 2026-09-11

GitHub Actions budget enforcement initially prevented execution. The owner’s billing page later showed $10 of a $50 Actions budget and a fresh API retry ran successfully. The earlier annotation did not establish that the current account budget was exhausted. Once execution resumed, every check passed except the Friends matrix in the general browser job.

## Failure and change

Run 34619126380, job 103352494536, on 1b781508 measured cold list median 903/919 ms (800 ceiling), direct Synastry 2246/2652 ms (1500), incomplete list 877/929 ms (800), repair 2935/2977 ms (2500), and slow-network list 902/913 ms (800), across the initial and retry runs. This is not waived as runner noise.

The trace’s first cold sample starts navigation at 50692 ms. App download begins at 50799; Friends route/controller downloads start at 51184/51190; the list-shell download starts at 51438. The old preload waited for App evaluation and then allowed another nested list-shell import. The new lightweight loader is shared by main and React. On a Friends URL it starts route, controller and shell together, without awaiting App. Other routes still do not fetch Friends components until navigation intent. Profile component selection, hover/focus loading, route recovery and calculated chart data are preserved.

A new browser regression holds the App download until both controller and shell requests arrive. This fails if the original dependency chain returns. Existing seven timing scenarios retain every assertion, three cold-context samples, timing ceiling, and slow-network/calculation delay. No polling cadence, test timeout or retry count was changed to obtain a pass.

## Local validation

Fresh-build local matrix: eight tests pass. Medians: cached list 171 ms; warm detail 63; direct Synastry 282; mobile navigation 827; incomplete list 152 and repair 1438; slow list 128, shell 51, relationship 1342 and enhancement 6. These local values are not substitutes for the hosted release gate.

An additional diagnostic used browser animation-frame observations under 3x CPU slowdown. Cached-list paint median changed from 394 to 355 ms. This diagnostic is comparative evidence, not a new production budget. The exact matrix and fresh hosted run remain the gate.

Main 2449a7e6 is integrated. Conflicts preserve the lazy review panel plus its new credential prop, and retain both the full editorial/API checks and new Studio-memory feedback check. The full local API suite, typecheck, startup contracts and CSS audits pass. The measured bundle allocation is recorded in scripts/web-bundle-budgets.json; the loader stays dynamic and no runtime dependency or CSS is added by this fix.

Hosted results and merge/deployment evidence must be recorded in the PR after the final head finishes. No production claim follows from these local results.

## Benchmark recording correction

Hosted 9cdf362d proves the download-order regression passes and improves cold-list medians to 874/827 ms and direct Synastry to 2037/2098 ms, but still fails four timing scenarios. This is recorded as an incomplete first fix, not a pass.

The matrix inherited `trace: retain-on-failure` from the functional-browser configuration. That setting records screenshots and DOM snapshots on *every* sample, discarding them only after a passing test. The failed cold sample recorded 21 full-page frames in roughly one second. Playwright explicitly documents tracing every test as performance-heavy: https://playwright.dev/docs/best-practices#debugging-on-ci and https://playwright.dev/docs/trace-viewer#tracing-on-ci .

`npm run qa:friends-loading-matrix` now explicitly disables trace recording only for this timing benchmark. Screenshots on failure, console measurements, all correctness assertions, 3 samples, original ceilings, retries, calculation delays and network throttling remain unchanged. Functional browser suites retain traces. Diagnose a failure separately with `npx playwright test tests/visual/friends-loading-performance.spec.ts --trace on`; a traced diagnostic must not replace or waive the untraced timing gate. No polling or readiness threshold is changed.

This correction must be confirmed on GitHub; local passes alone did not establish the CI result.

## Readiness sampling correction

The untraced hosted run 34630759172 on 9c00a577 passed all list checkpoints (cold median 509 ms, incomplete 511/503, slow list 456), warm detail, mobile, and download-order regression. Direct Synastry still measured 1986/2090 ms; repair measured 2502/2514 ms. These two failures are retained as evidence.

The installed Playwright implementation uses retry delays of 20, 50, 100, 100, then 500 ms for locator assertions. Timing `toBeVisible` or `not.toContainText` therefore includes up to an extra half-second of observation delay. The benchmark now samples the same visibility and repaired-text conditions every 16 ms, retaining the existing timeout and performance ceilings. A synthetic delayed-button regression checks that observation lag stays below 150 ms; the old backoff cannot pass that checkpoint reliably. The initial `Moon pending` assertion and all completed-content assertions remain intact. This changes the measurement precision, not the definition of a ready page or the permitted loading time.

Hosted 800c1596 passed eight of nine tests: cold list 366 ms, direct Synastry 1074, mobile 936, slow list 352 and relationship content 1391. The incomplete-chart test correctly caught a premature readiness result because its delayed-calculation counter was still zero. The new polling implementation used `innerText`, which applies CSS uppercase transformation; the old text assertion uses `textContent`. Repair polling now uses nonempty `textContent` and a case-insensitive pending check, preserving the original condition. A regression proves uppercase styling cannot mark pending data ready. The delayed-calculation and zero redundant-timezone-request assertions remain mandatory.

## Integration with the subsequent main release

The complete Friends performance step passed on 06d94396 in run 34632321160. The Sky Summary (78 browser tests) and placement/recovery (72 browser tests) jobs also passed. Before final merge, main advanced to a85ed295 (#755), adding shared API validation, secondary editor version checks, offline publication installation, Calendar readiness fixes, and independent Friends benchmark improvements. The remaining superseded reader run was stopped for integration.

The integrated release preserves main's isolated Friends runner and trace-free configuration, plus its browser animation-frame timestamps for Synastry and repair. It retains this branch's parallel entry loader, 16 ms list observations, complete-content assertions and all three new regressions. No timing ceiling, sample count or delay is relaxed. The API command includes the union of both branches' checks. Recovery verifies exactly three inventory attempts and the existing loading budget; the article-note and actual-handler Aspect Pattern browser tests are both retained. The final integrated commit must pass fresh hosted gates and production verification; earlier commit results are supporting evidence only.

The push guard initially classified the already-remote a85ed295 ancestor as a new outgoing commit and found its old Friends fixture. The integrated fixture is synthetic. The guard now obtains existing heads from the actual receiving remote instead of trusting local tracking refs. It scans every genuinely outgoing commit and all merge blobs, and still checks the entire ancestry against retired commits. If remote inspection fails it scans conservatively. Regression fixtures prove a clean integration of an existing remote ancestor succeeds, newly introduced private intermediate content still fails even with a clean tip and fabricated tracking ref, and retired ancestry remains blocked. No remote history is rewritten.
