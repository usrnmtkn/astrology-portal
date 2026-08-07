# Full QA Report — 2026-08-07

Generated: 2026-08-07 10:39 EDT  
Repository: `tldrastro`  
Verdict: **NOT RELEASE READY**

Priority note: the app is not live, so the P0/P1 labels in this report describe release-pipeline and development-workflow impact, not an active end-user incident. There is no emergency remediation requirement.

## Executive summary

The app is broadly functional, visually stable, and within its compiler and performance budgets, but the release path is red. The official build and root test command both fail, three browser-level failures reproduce in the aggregate suite, the editorial model registry is internally invalid under its current schema, and two externally dependent ephemeris gates could not produce release evidence.

The strongest browser result was 77/80 passing in the full Playwright aggregate. Client content checks were 7/7, admin workflows were 18/18, and visual baselines were 3/3. The failures are concentrated rather than systemic.

No application fixes were applied during this pass. The worktree already contained 457 changed/untracked status entries before QA; that count was unchanged after the official build attempt. The only intentional new artifact from this pass is this report. Snapshot-update commands were intentionally excluded because they mutate expected baselines.

## Release blockers and prioritized findings

### P0 — The official release build is blocked by a stale approved-copy assertion

**Evidence**

- `npm run build` completes the knowledge-package generation and validation, then fails in `scripts/test-reader-facing-content-contract.mjs:244`.
- `npm run qa:content-wiring` fails on the same assertion.
- The test pins the old conjunction/Sun daily body at `scripts/test-reader-facing-content-contract.mjs:243`.
- The source row at `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json:29167` contains newer copy and records it as owner-authored, exact approval dated 2026-08-05, superseding Copy Batch A.
- A direct Vite production build succeeds (1,864 modules, 1.98 s), so this is a prebuild contract failure, not a bundler/compiler failure.

**Diagnosis**

The test fixture was not advanced when the approved content row changed. Based on the source metadata, the source row is authoritative and the test is stale.

**Fix**

1. Confirm the 2026-08-05 approval record remains the intended serving copy.
2. Replace `approvedConjunctionSunDailyBody` in `scripts/test-reader-facing-content-contract.mjs` with the exact current approved `body_you` value, or source the expected value from a versioned approval artifact so approval updates cannot silently diverge.
3. Keep both `body_you` and `body_they` assertions; they protect the mirrored-copy contract.
4. Re-run `npm run qa:content-wiring`, then `npm run build`.

### P0 — The root test suite is blocked by contradictory Calendar detail contracts

**Evidence**

- `npm test` fails at `scripts/test-calendar-content-hydration.mjs:294`.
- The same file first requires exact timing-event copy to own the Calendar detail body even when a general placement article exists.
- A later assertion still requires `eventBody.length > 0 && !hasPlacementBody`, which encodes the opposite behavior.

**Diagnosis**

This is a stale static assertion left behind after Calendar detail precedence changed. The current implementation and the newer assertion agree that exact event copy owns the detail body.

**Fix**

1. Remove or rewrite the obsolete `!hasPlacementBody` assertion at line 294.
2. Replace it with a narrowly scoped assertion for any event types that should still fill only an empty article, if such a distinction is required.
3. Run `node scripts/test-calendar-content-hydration.mjs`, then `npm test` to expose any later failures that were hidden by fail-fast execution.

### P0 — Editorial model registry validation blocks unrelated generation/placement tests

**Evidence**

- `npm run qa:article-voice` fails with `judge:daily-glance.active is required`.
- `npm run test:sky-placements` reaches the same failure after its app-integration contract passes.
- `packages/astro-knowledge/config/editorial-model-registry.json:260` defines `judge:daily-glance` with `active: null` and an explicitly unpromoted candidate.
- `packages/astro-knowledge/scripts/editorial-model-registry.js:63` requires every non-writer lane to have an active release and validates the entire registry before resolving any lane.

**Diagnosis**

The registry state and schema policy disagree. The data says the candidate is advisory and promotion is unauthorized, while the validator makes an active judge mandatory. Because resolution validates all lanes globally, the incomplete Daily Glance lane prevents tests for other surfaces from resolving their own valid model configuration.

**Fix**

Choose one governed policy and encode it consistently:

1. If Daily Glance must remain unpromoted, allow inactive judge lanes when they contain only a staged candidate, and make `resolveActiveRelease` fail only when that specific lane is requested.
2. If every judge lane must be active, promote an evaluated release only through the existing calibration/owner-authorization workflow; do not copy the candidate into `active` merely to satisfy tests.
3. Add a registry unit fixture for an inactive, candidate-only judge lane and another proving that it cannot be used as active.
4. Re-run `npm run qa:article-voice`, `npm run test:sky-placements`, and the registry-management tests.

### P1 — Friends house-transit cards omit a computed term classification

**Evidence**

- The client suite fails because `.house-transit-term-tag` is absent.
- `App.tsx:17213` computes `termLabel` as `Long-term` or `Short-term` and passes it into `FriendHouseTransitView`.
- `FriendTransitsTab.tsx:31` requires the field, but the house-card markup around line 235 renders only keyword pills.
- The failure reproduced in both `qa:client-flows` and the full 80-test aggregate.

**Diagnosis**

This is a presentation regression introduced during the Friends component extraction/refactor: data preparation is correct, but the leaf component drops the field.

**Fix**

1. Render `card.termLabel` inside the footer tag container using `ui-pill house-transit-term-tag` (matching the existing styling/contract).
2. Keep it after the description and alongside the keyword tags so the accessibility and layout assertions remain meaningful.
3. Re-run the focused Friends flow and `npm run qa:client-flows`.

### P1 — Stale fallback cache self-healing leaves the current Jupiter placement body incomplete

**Evidence**

- `npm run qa:fallback-cache-self-heal` fails reproducibly.
- The stale Jupiter sentence is removed and the current Sun–Jupiter aspect copy appears, but the current bundled Jupiter-in-Leo placement hook does not.
- The expected hook exists in `bundled-sky-placement-rows-v3.json:1446-1450`.
- The legacy core cache keys are cleared successfully; the failure is therefore in route-owned placement-bundle activation/render refresh, not basic cache deletion.
- The full aggregate reproduces the same result.

**Diagnosis**

The route reaches a partially current state: aspect content is refreshed, while the deferred placement partition is not reflected in the open detail. The loader at `App.tsx:11153-11157` discards the boolean returned by `loadSkyPlacementFallbackArchitectureV3Bundle()` and marks the partition ready on any resolved promise. The refresh effect is keyed on `fallbackArchitectureV3Version`, so a false-ready or incomplete recomposition can leave the already-open detail without its placement section.

**Fix**

1. Instrument the route loader with the returned `didLoad` value and `isSkyPlacementFallbackArchitectureV3BundleLoaded()` state.
2. Mark the route ready only after the placement partition is demonstrably installed; treat a resolved `false` as ready only when an installed local/dashboard placement bundle is present.
3. After installation, explicitly rebuild the open detail from `skyDetailFromRoutePath` (or ensure the version increment occurs strictly after `recomposeReaderBundle`).
4. Extend `test-deferred-sky-placement-runtime.mjs` with Jupiter/Leo, because its current Sun/Leo case exercises the continuous-placement path but not the hook-based Jupiter path.
5. Re-run `npm run qa:fallback-cache-self-heal`, then `npm run visual:smoke`.

### P1 — Sky-aspect source-gap test no longer matches the pipeline’s source coverage

**Evidence**

- `npm run test:sky-aspects` passes matrix parity and the current-sky adapter, then fails in `test-sky-aspect-integration.mjs:147` because its test double throws if generation is reached.
- The fixture expects a source gap to stop before the model, but the current governed sources now cover the fixture sufficiently for the pipeline to call the generator.

**Diagnosis**

The negative fixture became sourced as the content package expanded. The protection is still valuable, but the fixture no longer creates the condition it claims to test.

**Fix**

1. Replace the fixture with a deliberately unsupported planet/aspect/sign combination or inject a registry with the relevant source removed.
2. Assert both halves: true gaps never call the model, while newly covered inputs do.
3. Re-run `npm run test:sky-aspects`.

### P1 — Adjacent-voice recognizability assertion pins retired prompt wording

**Evidence**

- `npm run test:sky-aspect-timing` passes all timing-register checks, then fails in `test-adjacent-voice-recognizability.js:35`.
- The prompt contains active `ED-013`/`CF-016` policy language about CC/SD constructions and Chani-adjacent voice, but the test requires the literal phrase `CC/SD/AC` or `CHANI, Spirit Daughter, or AC`.

**Diagnosis**

The semantic policy is present, but the exact phrase contract was not updated when the prompt language changed. This is a stale assertion unless the removed AC wording is still a mandated policy requirement.

**Fix**

1. Decide whether AC must remain an explicit governed comparison.
2. If yes, restore that requirement in the prompt source. If no, update the test to assert the active decision IDs and their operative meaning rather than a historical phrase.
3. Re-run `npm run test:sky-aspect-timing`.

### P2 — CSS consistency audit reports three untokenized typography values

**Evidence**

- `npm run qa:css-audit` fails with three blockers; token integrity and contrast checks pass.
- `apps/web/src/styles/friends-route.css:611`: `letter-spacing: 0.06em`.
- `apps/web/src/styles/friends-route.css:624`: `font-size: 1rem`.
- `apps/web/src/styles/friends-route.css:625`: `line-height: 1`.

**Fix**

1. Replace the bucket-label tracking with the appropriate label/tracking token.
2. Replace glyph size and line height with the existing glyph/type and compact-leading tokens, adding narrowly named tokens only if no semantic equivalent exists.
3. Run `npm run qa:css-audit` and visually recheck Friends house-transit cards.

### P2 — Editorial scan has 26 non-blocking review warnings

**Evidence**

- 807 files and 23,666 reader-facing strings scanned.
- 0 blocking findings; 26 warnings.
- Warning classes: directive/moralizing language, vague boilerplate, and repeated adjacent words.

**Fix**

Review the warning list before the next editorial promotion. Some repeated-word hits are legitimate phrases (for example, “the version of you you muted”), so do not bulk-rewrite them. Prioritize warnings in actively serving source rows and deduplicate mirrored source copies through their canonical source rather than editing generated exports independently.

## Stale browser expectation

The Calendar Week browser test expects three `Moon in Capricorn` cards for Jul 27–Aug 2, 2026, but the rendered engine-backed week consistently contains two. The failure reproduced in both the 47-test client suite and the 80-test aggregate. Other Moon-sign continuity, Full Moon, phase-copy, event-order, and overflow assertions pass.

**Fix:** verify the seven fixture dates against the engine output, then change `tests/visual/client-facing-user-flows.spec.ts:1433` from a hard-coded count of three to the correct engine-derived expectation (currently two). Keep the two distinct Capricorn guidance-body assertion, which is the actual copy-variation contract.

## External release evidence blocked

### Horizons comparison

`npm run qa:ephemeris:horizons` exited 2 with 12/12 fixtures marked `BLOCKED_INDEPENDENT_PROVIDER_MISSING`. It reported zero discrepancies and zero reference gaps because no independent provider result was available; this is not a pass.

**Next step:** configure the independent Horizons provider/credentials expected by `verify-astrology-integrity.mjs`, then rerun without treating blocked fixtures as verified.

### Ephemeris release gate

`npm run qa:ephemeris:release-gate` could not evaluate GitHub run evidence because `GITHUB_REPOSITORY` and `GITHUB_TOKEN` were absent.

**Next step:** run in CI or provide a completed runs file using the script’s supported `--runs-file` path. Do not waive the gate based on local engine checks alone.

### Repository report aggregators

`qa:client-report` was rejected by the environment’s approval/usage gate before execution, and `qa:admin-report` was not retried through the same blocked path. These are reporting wrappers around suites already run directly:

- Client flows: 45/47.
- Content copy: 7/7.
- Admin flows: 18/18.
- Editorial writing scan: 0 blockers, 26 warnings.

No test coverage was lost; only those wrappers’ generated `latest.md`/log copies were unavailable.

## Full execution matrix

| Check | Result | Key result |
| --- | --- | --- |
| `npm test` | FAIL | Calendar hydration static contract contradiction; fail-fast stopped later tests |
| `npm run build` | FAIL | Approved conjunction/Sun body assertion |
| Direct web Vite build | PASS | 1,864 modules; 1.98 s |
| `npm run typecheck` | PASS | No TypeScript errors |
| `qa:content-wiring` | FAIL | Same approved-copy mismatch as official build |
| `qa:calendar-phase-sign` | PASS | 96 combinations |
| `qa:calendar-quarter-candidates` | PASS | 24 candidates |
| `qa:calendar-weekly-monday-tone` | PASS | 12 sign families |
| `qa:client-flows` | FAIL | 45 passed, 2 failed |
| `qa:content-copy` | PASS | 7/7 |
| `qa:fallback-cache-self-heal` | FAIL | 0/1 |
| `qa:admin-flows` | PASS | 18/18 |
| `qa:editorial-copy` | PASS WITH WARNINGS | 0 blockers, 26 warnings |
| `qa:article-voice` | FAIL | Invalid candidate-only judge lane under schema |
| `qa:css-audit` | FAIL | 3 hardcoded typography values |
| `qa:css-token-integrity` | PASS | 179 files, 0 unresolved/color/contrast findings |
| `qa:bundle` | PASS | All gzip budgets pass; app boot ~379.5 KB, reader boot ~424.5 KB |
| `qa:form-typography` | PASS | 444 rules, 0 findings |
| `qa:admin-boundary` | PASS | Import boundary and actual port probes pass |
| `qa:ephemeris:horizons` | BLOCKED | Independent provider missing for all 12 fixtures |
| `qa:ephemeris:release-gate` | BLOCKED | GitHub repository/token evidence unavailable |
| `qa:2026-engine-facts` | PASS | 24 fact groups, 7 exact hits |
| `qa:database-friends` | PASS | Loading, retention, pronouns, performance, social, model, phone-auth contracts |
| `qa:friends-performance` | PASS | Contract passes |
| `qa:friends-data-retention` | PASS | Contract passes |
| `qa:visual-baseline` | PASS | 3/3 |
| `visual:smoke` | FAIL | 77 passed, 3 failed |
| `test:performance-contracts` | PASS | Manifest current at 7,185 keys; deferred runtime checks pass |
| `test:sky-aspects` | FAIL | Stale negative source-gap fixture |
| `test:sky-aspect-timing` | FAIL | Stale adjacent-voice phrase assertion |
| `test:sky-placements` | FAIL | App integration passes; registry validation blocks engine test |
| `qa:client-report` | BLOCKED | Environment approval/usage gate |
| `qa:admin-report` | NOT RUN | Same wrapper-only blocked path; constituent suites complete |
| `qa:visual-baseline:update` | INTENTIONALLY SKIPPED | Mutates approved snapshots |

## Green areas

- TypeScript compilation and direct production bundling.
- Bundle/startup budgets and deferred package manifests.
- Admin navigation, authoring, API payload contracts, filters, and responsive layouts.
- Reader-facing fallback-copy safety and content hydration protection.
- Visual baselines across client light/dark, mobile/desktop, and admin.
- Calendar phase/sign and quarter-candidate matrices.
- Friends persistence, performance, retention, social, chart-model, pronoun, and phone-auth contracts.
- 2026 engine fact verification.
- CSS variable integrity, color/token integrity, contrast, and form typography.
- Mobile Sky date picker, navigation, constrained headers, and overflow checks.

## Recommended repair order for a pre-launch app

This ranking optimizes for fast, trustworthy development feedback. Because there are no live users, visible defects do not need incident-style priority; first restore the checks that reveal whether later fixes are safe.

### 1. Unblock the root test and official build commands

Fix the contradictory Calendar hydration assertion and update the conjunction/Sun approved-copy fixture. These are likely small test-contract changes, and they currently prevent the two broadest release commands from reaching later checks. Re-run `npm test` and `npm run build` immediately afterward because both are fail-fast and may reveal additional issues.

### 2. Reconcile the editorial model registry policy and validator

This one configuration mismatch blocks article voice, placement-engine, and potentially other model-backed tests. Preserve the candidate's unpromoted status; fix the schema/resolution behavior rather than manufacturing an active release. This provides the largest QA-coverage recovery after the root commands.

### 3. Fix Jupiter placement hydration and stale-cache recovery

This is the most meaningful functional defect found: a direct placement page can render only related aspect material while omitting the placement body. Diagnose the deferred partition's installed/ready state and add a Jupiter-specific runtime test. It ranks ahead of minor UI work because it affects the completeness of a core reading.

### 4. Restore the Friends house-transit term tag

The data is already computed and passed to the leaf component, so this should be a low-risk, quick UI repair. Add the missing `termLabel` pill and retain the existing Playwright assertion.

### 5. Refresh the three stale test fixtures

Update the Calendar Week Capricorn count after engine verification, replace the no-longer-missing sky source-gap fixture, and reconcile the adjacent-voice assertion with the active governed prompt policy. These failures currently add noise but do not demonstrate broken app behavior.

### 6. Obtain independent astrology-integrity evidence

Configure Horizons and the GitHub ephemeris release-gate inputs once the internal suite is green. There is no need to interrupt current development for missing external evidence, but both gates should be mandatory before a public launch because calculation correctness is central to the product.

### 7. Tokenize the three Friends CSS values

Resolve the letter-spacing, glyph-size, and line-height audit findings. They are maintainability issues with low immediate functional impact and can be bundled with the Friends term-tag styling change.

### 8. Review the 26 editorial warnings

Do this after functional and test infrastructure work. Review canonical serving rows first and avoid bulk edits: several repeated-word findings are valid English rather than defects.

After each of priorities 1–5, run the smallest focused test first, then the affected aggregate. After priority 5, run the entire matrix again. Run the external gates before declaring a launch candidate.

Release only when the official build, root tests, full Playwright aggregate, and both ephemeris gates are green or explicitly waived by the responsible owner.
