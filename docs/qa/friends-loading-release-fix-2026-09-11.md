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
