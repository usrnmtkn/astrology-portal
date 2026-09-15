# Sky loading layout and CI repair

The Sky page previously revealed summary text before its placement data and calculated dates were ready. The reading now waits in one loading area, with its children mounted so their requests run together. Once revealed, the reading remains visible through revalidation. Placement rows use their real layout height instead of estimated offscreen sizes. This change does not edit published copy, publication selection, or calculation thresholds.

## Integration and browser coverage

The repair incorporates main `aa7de8ccfa82a203635aefe54695577329b2af40`, retaining the released Calendar, editor and placement-date changes. On integrated head `f347e2ab53bab937f12b0a6d360a981e5d372c58`, all 42 local browser cases passed, including cold visits, reloads, navigation back, background refresh, publication replacement/retirement, calculated dates and advancing clocks. The four first-frame layout variants cover phone/desktop and light/dark. Both hosted summary shards also passed on that head, as did the full Content Studio API, reader contracts, NASA/JPL freshness, Calendar release, Memory and Social security gates.

The summary suite remains 26 cases, split across two jobs under the existing 15-minute limit. No assertions are removed.

## Failures found after restoring hosted CI

The account's Actions capacity was restored, allowing a real API rerun to pass. Subsequent owner-only action restrictions and then disabled Actions prevented jobs from running. With explicit owner approval, Actions was enabled with an exact allowlist for the nine GitHub/Supabase action versions used by the workflows. Broad GitHub-owned and verified-publisher permissions remain disabled.

Three actual failures were then identified:

- Friends mobile readiness still used an ordinary heading assertion inside its timing window. That assertion can back off by 500 ms. Use the existing 16 ms visibility sampler for the heading as well as the row, retaining both conditions, three samples and the 1,000 ms median limit. The corrected ten-case local Friends suite passes; mobile median was 486 ms before the subsequent payload optimization.
- The Venus-in-Libra client-flow test expected one duration element, although the approved date presentation now includes a visit and a full residency. Assert both exact date ranges instead of applying a single-element assertion to two elements. The targeted test passes.
- The web bundle limit already failed on clean main, using an isolated checkout with its own `npm ci` and the workflow's Supabase environment. Repair the payload rather than increasing its limits.

## Payload repair

Imported JSON is emitted as JavaScript literals so the minifier can compact property keys instead of retaining escaped JSON strings. The protected placement-passages JSON and the Sky core payload already belong to reader startup; placing them in the same initial chunk removes one request and allows shared compression. Their source data and runtime values remain unchanged. No content is deferred behind a new request or substituted during loading.

Same-environment gzip measurements in bytes:

| Metric | Clean main | Integrated repair before optimization | Optimized repair | Existing limit |
| --- | ---: | ---: | ---: | ---: |
| App JavaScript boot | 431,214 | 431,258 | 429,769 | 430,500 |
| Reader boot including CSS | 480,838 | 480,859 | 479,370 | 479,500 |
| Aggregate JavaScript | 3,077,960 | 3,077,817 | 3,065,995 | 3,069,000 |

The optimized build passes all bundle budgets, the browser knowledge boundary, runtime content parity, package partitions, worker recovery and startup-performance contracts. The generated fallback manifest remains current. Public-asset privacy scanning passes. All bundle, runtime timing, sample-count and NASA/JPL accuracy limits are unchanged.

The final combined local run passes all 16 cases: all ten Friends performance checks, all four first-frame Sky layout variants and both supplied-copy cases. Mobile navigation measured a 470 ms median on the optimized build. A shipped-bundle parity regression also confirms all four initial JSON sources retain their complete reader values, including every protected passage row; it runs in Visual Smoke. Typecheck passes. The final hosted release checks must pass before merge. Production verification must identify the main merge commit and test the public Sky route after its deployment succeeds. The rotating-illustration prototype is separate and is not integrated by this repair.

## Loading-state visual baseline

Hosted checks on `e349b502e4ce7ca7e6f0e528068ee184f33d5ddc` passed the API contract, Friends timing gate (775 ms median), both summary shards, all four client-flow shards and all four Studio-flow shards. The visual baseline still expected the old inner placement loader while deliberately holding the initial calculation. The shared reading gate correctly hides that loader.

The regression now asserts the visible shared `Loading the sky…` status, hidden summary while calculation is pending, and loaded placement plus removed status after releasing calculation. Both platform-specific dark Sky baselines show the reviewed single loading card; other baselines and the 1.5% pixel tolerance are unchanged. The Linux capture was identical across the original run and retry. All eight fresh-build visual baseline and smoke cases passed locally after this correction.
