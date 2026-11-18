# UI integration and acceptance — October 26, 2026

The updated design is available at `http://127.0.0.1:5173/#sky` from the integration worktree. Sky Ascendant and Midheaven cards show calculated positions and are disabled. They have no article destination, natal description, Read more control, or active hover treatment. No replacement angle prose was written.

## Integration boundary

- Worktree: `<local-checkouts>/tldrastro-ui-integration-20261026`.
- Branch: `codex/ui-integration-20261026`.
- Base: main `947523bfc7459c0a5d002f07d170e7e5e04619f5`, plus the preserved uncommitted design work and these repairs.
- Final refresh found main at `180327f0f2f34a4b03f941fc42152c1f6bdc081d`: **0 ahead / 7 behind**. Those seven later Friend natal publication commits are outside this tested snapshot.
- Reference: the supplied `GitHub app design system (5).zip` v6 handoff, also recorded in the prior QA report.
- The original design worktree remains unchanged: **all 198 snapshotted file hashes match**. See [preservation evidence](../../test-results/ui-integration-qa-2026-10-26/original-preservation.json).
- No commits, push, merge publication, deployment, owner prose edits, private draft edits, or paid generation were performed. Development configuration remains ignored.

The design patch was applied in a separate checkout with its own installed dependencies. Four overlapping files were reconciled: package scripts retain both branches' checks; web budgets retain main's tighter startup limits and existing design allocations; Admin budgets retain the existing feature allocations; viewport checks retain connected-layout polling and exclude zero-box wrappers.

## Repairs and verification

| Change | Evidence |
| --- | --- |
| Disabled Sky angle cards using finite calculated longitudes and formatted degrees. Shared row typography and visible angle glyphs; stable disabled backgrounds. | Four light/dark phone/desktop cases check exact calculated facts, native disabled state, glyph bounds, rendered contrast, reload, no article links and no natal prose. Live localhost inspected in both themes. |
| A saved profile's stale theme could overwrite a local choice on reload. Local explicit choices now take precedence; a device without a local preference can still adopt its saved profile theme. | Two deterministic stale-profile reload cases plus complete header/menu/theme journeys at 320, 390, 768 and 1440px. |
| Optional chart setup, date picker, diagnostics and reader CSV status are deferred. Global theme controls have their own module instead of importing Settings forms. Learn styles load with their consumers. | Date picker and Create chart containment across five viewport sizes and both themes; six complete CSV exports; cross-page theme/surface checks; startup and transport contracts. The date-picker check waits for the actual calendar grid after lazy loading. |
| Lossless repeated-string interning and grouping existing startup helpers reduce transfer cost. Unused legacy selector entries were removed. | Complete governed JSON values, export identities, property order, Unicode, collisions, tree shaking and input digests remain intact. Pinned memory renderer/vendor exclusions are tested. Reader copy and CSS audits pass. |
| Older performance checks referred to the pre-handoff natal table, display-label capitalization, profile stylesheet ownership and fixed Compatibility-only navigation. | Checks now protect the shared deferred placement sections, actual placement-render boundary, responsive profile stylesheet and selected-tab prefetch before selection. Worker scheduling also exercises the relationship forecast job behind visible Calendar work. No time or size limits were relaxed. |

## Browser acceptance

**648 distinct scenarios have passing latest results**, recorded in [latest-results.json](../../test-results/ui-integration-qa-2026-10-26/latest-results.json). This is a broad run plus final focused verification, not one uninterrupted 648-case run.

| Run | Result | Scope |
| --- | ---: | --- |
| Integrated pilot | 619 passed, 1 failed | Revealed the stale-profile theme reset; its trace is retained. |
| Fresh broad acceptance | **622 passed**, no retries or skips | Typography; Calendar and journal; charts/tables; Back navigation; handoff pages; type/glyphs/wheels; empty, loading and retry states; navigation overflow; planetary horoscopes; unavailable readers; viewport containment; date labels; tooltips and report notifications. |
| Final angle/deferred-action acceptance | **32 passed** | Final angle layout and contrast, local theme reload, date picker, chart setup and full CSV exports. |
| Final shared-theme acceptance | **44 passed** | Repeats those cases after theme-control extraction, plus four full theme journeys and eight cross-page typography/surface matrices. |

The broad build preceded the final angle-only styling and shared-theme extraction. The final 44-case build checks those changed surfaces across themes and viewport sizes. It adds 26 distinct overlay/export scenarios to the 622-case matrix. Intermediate failed rechecks remain in the worktree's ignored test results and `/private/tmp` logs; the failures are not counted as passing until their corresponding final acceptance results.

## Build and release checks

- Full `test:content-studio-api`: **passed**, including actual handler/save/reopen/publication/reader round trips in isolated test storage and all 64 Friction/Flow sources. No live owner writes or billed provider calls.
- Web and standalone Admin TypeScript: **passed**.
- CSS consistency, token integrity, Studio/live design layers and theme persistence: **passed**.
- Full-detail copy: **1,880 protected passages / 15 consumers passed**.
- Reader copy boundary: **10,955 rows / 19,217 fields**, no findings.
- Full `test:performance-contracts`: **passed**, including transport identity, complete-field parity, startup boundaries, caches, cancellation, worker scheduling, Calendar range handler/client behavior and pinned payload partitions. See [full performance output](../../test-results/ui-integration-qa-2026-10-26/performance.log).
- Whitespace check: **passed**.

The final browser artifact passes the actual web bundle checker, including deferred/forbidden payload and memory-renderer boundaries. No startup limit was increased.

| Gzip measurement | Final bytes | Limit |
| --- | ---: | ---: |
| Application startup JS | 391,100 | 392,000 |
| Reader startup including awaited CSS | 446,403 | 447,000 |
| App code chunk | 87,242 | 89,000 |
| Reader startup CSS | 55,303 | 58,100 |
| All CSS | 134,247 | 134,325 |
| All JavaScript | 3,655,014 | 3,684,050 |

See [web measurements](../../test-results/ui-integration-qa-2026-10-26/web-measurements.json), [bundle output](../../test-results/ui-integration-qa-2026-10-26/web-bundle.log), and [final source hashes](../../test-results/ui-integration-qa-2026-10-26/source-hashes.json).

## Remaining release gates

1. **Standalone Content Studio bundle size still fails:** aggregate 851,159 / 845,800 gzip bytes (**5,359 over**), and entry 234,734 / 234,650 (**84 over**). TypeScript and Vite compilation succeed. Speculative Admin chunk/minifier changes were discarded; its build configuration remains the base version. This is not a release-ready certification. See [Admin bundle output](../../test-results/ui-integration-qa-2026-10-26/admin-bundle.log).
2. **Seven newer main commits need a subsequent integration and affected-flow recheck.** This report identifies the tested base instead of claiming validation of moving main.
3. **Collective Sky angle articles remain unwritten by instruction.** Their cards stay disabled; calculated chart angles and existing natal readers retain their own roles.

## Live review

The old worktree's verified server was replaced on the same port so the review keeps its localhost origin. The integrated Sky page is open in the in-app browser.

![Disabled Sky angle cards in dark mode](../../test-results/ui-integration-qa-2026-10-26/sky-angles-dark.png)

[Light-theme capture](../../test-results/ui-integration-qa-2026-10-26/sky-angles-light.png)
