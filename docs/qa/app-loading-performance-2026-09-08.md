# App loading and performance QA

Date: 2026-09-08. Branch: `codex/app-loading-performance`. Baseline for this task: `bc6b2e61` (the local evergreen section work), based on `origin/main` at `26ff5cb9353238a6277d6eaa8d8275763fe7d00e` (PR #694). The remote was fetched again before final review. The earlier evergreen commit is also part of this branch.

These changes are locally implemented and verified. This report does not establish a production deployment. Public production was inspected read-only; authenticated workflows were tested against explicit local API/auth fixtures, without production writes.

## Findings and resulting behavior

1. Initial HTML was effectively empty while JavaScript and presentation dependencies downloaded. Reader and standalone Studio documents now include a themed, accessible loading card, skeleton lines, and no-JavaScript explanation. A small inline bootstrap can show a slow-download message or a manual reload action even when the main JavaScript entry fails. Reduced-motion preferences are respected.
2. Web font loading was chained through a blocking CSS import. Font stylesheets now load without blocking the loading card or reader. Existing font families, weights, and shared typography tokens are preserved.
3. Reader presentation styles and route preparation were unnecessarily serialized. They now start alongside the App download. Explicit Sky and Calendar routes initialize the astronomy worker early. A direct Content Studio entry loads its dashboard without first importing the reader App. Friends list routes still avoid unnecessary astronomy work.
4. Some lazy routes had empty fallbacks or no nearby Suspense boundary. Route-local loading feedback now keeps navigation visible; failed lazy routes offer manual recovery. Reports and compact Sky cards have visible loading messages. A signed-out Friends link now offers sign-in instead of showing only navigation.
5. Canonical Sky readings repeatedly materialized and hashed the entire content corpus, producing large main-thread stalls. A private, cloned publication snapshot now materializes once and is reused across readings. Mutable Studio drafts continue to validate on each call. Publication identity, retirement records, and exact revision timestamps invalidate the cache. Cache state advances only after a complete revision validates; repeatedly reading an invalid revision cannot silently reuse older copy.
6. A hung astronomy worker could leave requests and later routes pending indefinitely. Requests now have a bounded watchdog, clear their timers, and reject together if the worker fails. Retry creates a fresh worker. Late errors from a terminated worker cannot cancel the replacement. Sky exposes a visible retry action. Ephemeris inputs and calculation rules are unchanged.
7. Existing blank-restore recovery could mistake loading or recoverable error UI for an empty page. It now recognizes these states and does not automatically reload them or clear state while their requests are pending.

## Measurements and limits

The comparable resolver benchmark uses the same corpus and ten readings on the same machine: **314.2 ms before preparation reuse, 3.7 ms after**. Node, bundled browser-source, and shipped-dist outputs agree. This measures repeated rendering, not the first complete page download.

Read-only production profiling found repeated main-thread tasks of approximately 408–853 ms on Sky. The local compressed production build showed no tasks over 50 ms in the normal Sky, Calendar, You, Friends, Saturn detail, and unauthenticated Studio scenarios. Network and API conditions differ between production and the local server; these observations are not presented as a controlled end-to-end speed ratio.

| Local compressed build scenario | First visible content | Later milestone |
| --- | ---: | --- |
| Sky, normal connection | 39 ms | Sky summary 313 ms |
| Calendar, normal connection | 28 ms | Largest contentful paint 260 ms |
| Saturn detail, normal connection | 17 ms | Largest contentful paint 356 ms |
| Studio, unauthenticated | 28 ms | Largest contentful paint 384 ms |
| Sky, 150 ms latency, 200 KB/s, 4× CPU slowdown | 552 ms | App shell 4,088 ms; cold astronomy ready 15,056 ms |

The cold astronomy asset is approximately 2 MB. A genuinely slow connection still requires significant download time; this release makes that wait visible and removes repeated main-thread computation. The local tests used explicit empty publication API fixtures, while separate tests held publication responses for ten seconds and verified that the initial Sky summary rendered in 263 ms and after reload in 288 ms. A later publication response updated the mounted summary.

Authenticated Friends fixtures passed repeated cold/warm, direct-link, mobile, incomplete-chart, and slow-response scenarios. Representative medians: cold list 156 ms, warm detail 80 ms, direct synastry 366 ms, mobile navigation 815 ms. These are fixture measurements, not production account latency guarantees.

## Source, generated package, and consumer evidence

- The canonical resolver exposes a factory-owned immutable reading snapshot. New tests compare Node, bundled browser source, and shipped distribution across six routes, mutation attempts, and draft/release boundaries.
- Generated package version is `v3-2026-09-08c`. The distribution, package manifests/projections/lineage, lunation partitions, knowledge index, and pinned cache tests were regenerated or updated.
- Approved authored inputs and knowledge source prose have no changes in this performance diff. Existing protected-content and hook packaging checks pass; 3,296 packaged hook bodies remain byte-identical.
- The app consumer caches by exact publication revision and retirement state. Invalid revision retries, installed publication refresh, and the mounted reader are covered independently from the factory tests.
- Actual browser Swiss Ephemeris calculations match the full reference package for two fixed dates. Saturn retrograde date/scroll stability and aspect/horoscope ordering pass through background refreshes.

## Verification

All browser tests used fresh builds and owned local preview processes; no reused developer server was treated as release evidence.

- 41-test browser run: loading feedback, Friends performance, You loading, full Sky retrograde regression suite, and publication refresh. Passed.
- Final reader run: 11 loading/error/recovery checks plus two publication refresh tests. **13 passed.** Includes a blocked entry bundle, blocked fonts, held Calendar chunk, failed lazy route, worker retry, signed-out Friends, and report/Studio document feedback.
- Fresh standalone Studio browser run: **11 passed.** Source discovery, editor behavior at 390/1440 widths and both theme contexts, inventory arriving during dirty edits, repeated retrograde saves, and evergreen add/reorder/empty/publish-twice workflows.
- Browser Swiss trimmed/full-package parity passed. Four loading screenshots inspected at 390/1440 widths and light/dark themes; typography, reduced motion, and no-horizontal-overflow assertions pass.
- `npm run typecheck`: passed.
- `npm run qa:css-audit`: passed.
- `npm run test:performance-contracts`: passed, including new snapshot preparation and worker recovery contracts.
- `npm run posttest:content`: passed, including canonical stage/release/approval, product surface, Studio lifecycle, and evergreen contracts.
- Existing Content Studio API roundtrip passed: create, draft/review/publish, repeated edits, reopen, archive/restore, guarded delete, stale/concurrent edits, and actual reader loader.
- Fresh web and Admin builds, auth build check, both bundle budgets, and `git diff --check`: passed.

### Broader suite failures retained

The complete repository suite is **not all green**. These failures are recorded rather than weakening assertions or rewriting approved material:

1. `test:content` reaches `test-friends-owner-signoff-ruling.mjs:161`: expected payload hash `9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`, actual `84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`. The assertion and governing source inputs are unchanged by this work; the same issue was recorded in the prior evergreen audit.
2. `qa:admin-bundle` passes the build, budgets, packaging, surface, variable, and Composition Map checks, then fails `test-admin-atomic-variable-provenance.mts:46`: its expected 39 templates conflicts with a map containing 267 entries, including standalone passages. The test and composition-map implementation are unchanged from current main. The audit was not narrowed to hide unmapped standalone variables.
3. Running subsequent Admin checks independently finds `test-admin-transit-natal-sources.mjs:40` still asserting old explanatory wording. The current description expresses the same source-sharing behavior with different wording. Its test and source are unchanged from main. Remaining independent checks, including house transit sources, CMS validation, and API roundtrip, pass.

An incidental Rosetta/arm64 esbuild mismatch occurred in a Python subprocess runner. The affected three checks were rerun directly with native Node and passed; that tooling mismatch is not classified as an app defect.

## Bundle accounting

Final measured web graph: App JavaScript 411.1 kB gzip, reader including awaited CSS 458.5 kB, startup CSS 47.4 kB, all JavaScript approximately 2.93 MB across lazy routes, all CSS 112.3 kB. The combined reader cap remains 467 kB. Large content families remain deferred.

The initial CSS checker now counts all HTML and App styles, rather than only the deferred `styles.css` entry. Its allowance changes from 47,000 to 48,000 bytes to include the pre-JavaScript loading shell and complete stylesheet accounting. Shared theme duplication was removed.

Standalone Admin entry measures 175,146 bytes gzip / 615,882 bytes raw; aggregate JavaScript is 307.8 kB gzip. Its gzip entry allowance changes from 175,000 to 175,500 bytes. The raw 616,000-byte entry limit, 309,000-byte aggregate limit, and deferred editor boundaries remain unchanged.

## Release follow-up

The branch contains both the prior evergreen section change and this performance work. Following the prepared public-export request, the owner authorized review, merge, and production publication on 2026-09-08 in task `01a07b0b-8090-7f11-81de-cfeefbe5644c`. Required CI must be assessed, the approved branch merged through main, and the Git-triggered production deployment verified before calling these fixes live. The eleven loading/error/recovery browser regressions are included in the Visual smoke workflow.

Production verification should confirm the HTML loading shell on a cold load, navigation during a delayed Calendar download, Sky summary before publication hydration, Saturn dates during refresh, worker recovery, and two consecutive Studio saves. The cold astronomy download remains the largest measured network cost and is a separate candidate for further asset-level optimization.
