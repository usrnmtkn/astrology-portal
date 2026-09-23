# App loading laboratory results — September 23, 2026

See [protocol and limitations](app-loading-protocol.md) and [findings](app-loading-findings-2026-09-23.md). These results are local synthetic-service measurements, not production or field measurements.

## Current-main baseline

This is the main revision at the start of measurement. Main later advanced to
`513cb8cf` with Calendar article-link changes. The benchmark stays pinned to the
recorded build; it is not relabeled as a measurement of the newer main revision.

After the omission diagnostic, the final paired observer additionally requires
both the daily summary and weekly section, instead of accepting either one.
Both sides of that comparison are rerun with the stricter observer. The original
baseline records and harness fingerprint below are preserved; their successful
You text hashes include the daily passage that the rejected candidate omitted.

- Source revision: `e049ca31f761cf3639f73f93f54661e49799417d`.
- Asset inventory: `6b7d89704866b6fa0de383b787715c1e00d573980ef282e8050dfdd0112ad5a3`.
- Fixture: `e73545426c4fe3c0656a86fbd804315d2ddaca917df39e44f22124415f35463d`.
- Publication ledger: `"publications-v1-ffd2dcb953b068305951982ca8114589892d1b36c31db1f0ef22b610bd6bfaab"`.
- Harness: `e7658078b8a178ce3465e704a7c229ec95becf5c618f31ae6d4f0c261aaf88e1`.
- Raw private evidence: `app-loading-baseline-v1-final.json`, SHA-256 `74f6321218dc742e1cd740c3e4a5d9de60972720eccbfccfcaa06793be6e37f0`.
- Completed: 200 attempts, ten per declared route/profile/cache cell; 20 chart timeouts. Every failed attempt is retained. Successful rendered-text hashes are consistent within each route/profile across repeats and cache states.

Protocol: tldr-loading/v1; environment: local-synthetic-services; browser: 149.0.7827.55
Usable times include every recorded usable mark (count shown), including visits that later failed. Complete/font times describe successful attempts only. All failures remain counted. These are laboratory observations, not field percentiles.

| Variant / scenario / profile / cache | Attempts | Failed | Usable median (n) | Complete median (min–max) | Fonts median |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline / sky / desktop / fresh | 10 | 0 | 0.44 s (10) | 0.99 s (0.97 s–1.01 s) | 1.02 s |
| baseline / sky / desktop / reload | 10 | 0 | 0.09 s (10) | 0.55 s (0.50 s–0.56 s) | 0.57 s |
| baseline / sky / mobile / fresh | 10 | 0 | 3.15 s (10) | 7.06 s (7.01 s–7.08 s) | 7.08 s |
| baseline / sky / mobile / reload | 10 | 0 | 0.28 s (10) | 1.24 s (1.17 s–1.32 s) | 1.31 s |
| baseline / calendar / desktop / fresh | 10 | 0 | 1.57 s (10) | 2.36 s (2.33 s–2.36 s) | 2.37 s |
| baseline / calendar / desktop / reload | 10 | 0 | 0.22 s (10) | 0.34 s (0.33 s–0.35 s) | 0.35 s |
| baseline / calendar / mobile / fresh | 10 | 0 | 16.10 s (10) | 23.85 s (23.84 s–23.87 s) | 23.86 s |
| baseline / calendar / mobile / reload | 10 | 0 | 0.52 s (10) | 1.05 s (1.03 s–1.07 s) | 1.08 s |
| baseline / you / desktop / fresh | 10 | 0 | 0.82 s (10) | 4.55 s (4.50 s–4.62 s) | 4.56 s |
| baseline / you / desktop / reload | 10 | 0 | 0.31 s (10) | 2.61 s (2.55 s–2.65 s) | 2.63 s |
| baseline / you / mobile / fresh | 10 | 10 | 4.44 s (10) | — | — |
| baseline / you / mobile / reload | 10 | 0 | 0.51 s (10) | 14.21 s (5.17 s–14.29 s) | 14.23 s |
| baseline / you-natal / desktop / fresh | 10 | 0 | 0.82 s (10) | 2.20 s (2.20 s–2.22 s) | 2.23 s |
| baseline / you-natal / desktop / reload | 10 | 0 | 0.32 s (10) | 0.40 s (0.39 s–0.41 s) | 0.41 s |
| baseline / you-natal / mobile / fresh | 10 | 10 | 4.44 s (10) | — | — |
| baseline / you-natal / mobile / reload | 10 | 0 | 0.51 s (10) | 1.00 s (0.91 s–1.10 s) | 1.03 s |
| baseline / friends / desktop / fresh | 10 | 0 | 1.02 s (10) | 1.02 s (0.94 s–1.06 s) | 1.04 s |
| baseline / friends / desktop / reload | 10 | 0 | 0.31 s (10) | 0.31 s (0.30 s–0.32 s) | 0.32 s |
| baseline / friends / mobile / fresh | 10 | 0 | 4.87 s (10) | 4.87 s (4.86 s–4.88 s) | 4.89 s |
| baseline / friends / mobile / reload | 10 | 0 | 0.54 s (10) | 0.54 s (0.51 s–0.54 s) | 0.56 s |


## Rejected diagnostics

### Calendar parallel content

Three new mobile cold reading timeouts in three candidate attempts; baseline completed all three. The code was removed.

Private raw evidence: `app-loading-calendar-experiment.json`, SHA-256 `83457647ba15b3c07be9b7a4da3332ee4cea563b87af9804c8c4fdc70ebf0338`; 24 retained attempts. These are diagnostic batches, not release evidence.

### You download priority, first iteration

All six candidate mobile cold visits avoided the chart timeout, but all three transit-view visits failed the late-text stability check. The weekly reading briefly returned to loading. This iteration is not accepted.

Private raw evidence: `app-loading-you-priority-v1-paired.json`, SHA-256 `72476c8ec6d602834ea4f56757e8b1717bfb3ebd0e756ea2556c2042f9be42de`; 48 retained attempts. These are diagnostic batches, not release evidence.

### You download priority with sequential weekly start

- Baseline desktop cold content median: 4502.4 ms (3 attempts).
- Candidate desktop cold content median: 4659.6 ms (3 attempts).

The candidate completed all six mobile cold You/natal visits without chart timeouts or late-text failures, but its desktop slowdown exceeded `max(100 ms, 3%)`. This sequential approach was replaced; it is not accepted.

Private raw evidence: `app-loading-you-priority-v2-paired.json`, SHA-256 `86719ef69fee5feaf86984546713fc36ce766c77223c334b3edaa2e1c833cfce`; 48 retained attempts.

### You parallel weekly dependencies, before daily refresh correction

All six candidate mobile cold visits completed without timeouts or late-text failures. The full-text comparison nevertheless rejected this iteration: the daily reading was absent. A private text probe confirmed that the omission remained four seconds after the font mark; it was not a font or incidental-label difference.

Private raw evidence: `app-loading-you-priority-v3-paired.json`, SHA-256 `b95b82369aa0715332359d05c68999ca41a9c75f3877d72138534741120bc2d8`; 48 retained attempts. The candidate was revised to re-evaluate daily content when its source bundle is installed.

## Current You candidate: complete daily and weekly refresh

The final diagnostic contains 48 attempts: three matched pairs for each
You/natal desktop/mobile fresh/reload cell. All 24 candidate attempts completed;
all six baseline cold mobile attempts timed out. Successful complete-content
hashes match between variants and across repeats/cache states within each
route/profile. A failed baseline has no complete reading to compare; those
failures remain in the data.

- Candidate asset inventory: `585d801ff253be1ce3d8fae8444dc1acb1bfa88fcc016dd0ead9d8bda5dcfd75`.
- Fixture: unchanged from the baseline above.
- Stricter harness: `a080c9059de2e53353bed498a9c4afe99285393d20425fc057c536024aee8f59`.
- Private raw evidence: `app-loading-you-priority-v4-paired.json`, SHA-256 `2099ed53728bb2fb36241ab689b7dd57510133b55d0e124c7d3c33d3df63291f`.
- Comparator verdict: **blocked**. There are only three pairs per cell, and
  baseline cold-mobile timeouts prevent the primary latency comparison. No
  percentage speedup is claimed. No comparable successful cell exceeds the
  regression tolerance in this diagnostic; that is not a 30-pair release pass.

Reload follows each variant's actual cold attempt, including failed attempts.
The baseline and candidate can therefore start reload with different cache
contents. The large reload difference is not an isolated execution-time result.

Protocol: tldr-loading/v1; environment: local-synthetic-services; browser: 149.0.7827.55
Usable times include every recorded usable mark (count shown), including visits that later failed. Complete/font times describe successful attempts only. All failures remain counted. These are laboratory observations, not field percentiles.

| Variant / scenario / profile / cache | Attempts | Failed | Usable median (n) | Complete median (min–max) | Fonts median |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline / you / desktop / fresh | 3 | 0 | 0.82 s (3) | 4.53 s (4.51 s–4.57 s) | 4.54 s |
| baseline / you / desktop / reload | 3 | 0 | 0.31 s (3) | 2.57 s (2.53 s–2.63 s) | 2.59 s |
| candidate / you / desktop / fresh | 3 | 0 | 0.82 s (3) | 4.25 s (4.25 s–4.28 s) | 4.26 s |
| candidate / you / desktop / reload | 3 | 0 | 0.31 s (3) | 2.54 s (2.53 s–2.55 s) | 2.55 s |
| baseline / you / mobile / fresh | 3 | 3 | 4.42 s (3) | — | — |
| baseline / you / mobile / reload | 3 | 0 | 0.50 s (3) | 14.12 s (14.12 s–14.32 s) | 14.14 s |
| candidate / you / mobile / fresh | 3 | 0 | 4.45 s (3) | 22.88 s (22.84 s–22.88 s) | 22.89 s |
| candidate / you / mobile / reload | 3 | 0 | 0.52 s (3) | 3.33 s (3.27 s–3.56 s) | 3.41 s |
| baseline / you-natal / desktop / fresh | 3 | 0 | 0.81 s (3) | 2.18 s (2.18 s–2.18 s) | 2.21 s |
| baseline / you-natal / desktop / reload | 3 | 0 | 0.31 s (3) | 0.39 s (0.37 s–0.40 s) | 0.39 s |
| candidate / you-natal / desktop / fresh | 3 | 0 | 0.81 s (3) | 2.14 s (2.14 s–2.14 s) | 2.14 s |
| candidate / you-natal / desktop / reload | 3 | 0 | 0.30 s (3) | 0.38 s (0.38 s–0.39 s) | 0.41 s |
| baseline / you-natal / mobile / fresh | 3 | 3 | 4.41 s (3) | — | — |
| baseline / you-natal / mobile / reload | 3 | 0 | 0.48 s (3) | 0.90 s (0.80 s–0.92 s) | 0.95 s |
| candidate / you-natal / mobile / fresh | 3 | 0 | 4.41 s (3) | 19.29 s (19.29 s–19.29 s) | 19.30 s |
| candidate / you-natal / mobile / reload | 3 | 0 | 0.52 s (3) | 0.80 s (0.75 s–0.83 s) | 0.84 s |

## Adverse-condition candidate diagnostic

One fresh visit and its retained-cache reload were run at CPU 8×, 150 ms
latency, and 100,000 bytes/s download. **Both timed out at the existing 15-second
chart deadline.** The candidate does not solve this slower connection. The
profile appeared after 8.83 seconds fresh and 0.91 seconds on reload; complete
reading and font-settled milestones were absent.

This single-artifact run uses the runner's `baseline` variant label, but its
asset hash is the candidate hash above. It is not a baseline/candidate
comparison. Raw evidence: `app-loading-you-priority-v4-adverse.json`, SHA-256
`676dff8ce664995e39e02c3ba888396e0d70bb4c49e7ab97eb8d81c05447d799`.
Both attempts, including their failures, are retained. The fixture and harness
hashes match the final paired diagnostic.

## Empty and large Friends inventories

The candidate also completed all eight visits for empty and 100-row synthetic
Friends lists: one fresh/reload sequence on desktop and mobile per inventory.
This validates the observer and expected rows; one observation does not establish
an improvement. Cold mobile list completion was 4.65 seconds empty and 10.22
seconds with 100 rows. The large fixture repeats one calculated chart and is
more compressible than 100 different charts.

This single-artifact run uses the runner's `baseline` label for the candidate
asset hash. Raw evidence: `app-loading-you-priority-v4-friends-extremes.json`,
SHA-256 `b834f5ee2fba2dc3628b618dbae9c3579127357a3c00f27dac74962d9c6b63b6`.
Its fixture and harness identities match the final paired diagnostic.
