# Google login and missing personal-transit copy

Baseline: `e872ad0c6bfa19bf5793e368123d0cd1d5d02562` on `origin/main`.

## Corrections

- Google authentication from Create profile no longer requires birth details. Parseable profile drafts survive the redirect without the email-password field; an invalid birth-time draft cannot block authentication. Email account creation still validates its form.
- The root landing page initializes Supabase for OAuth callbacks even before a local session exists. The SDK remains responsible for validating and consuming the callback.
- The You reader adapter now accepts the governed resolver's `fallback-template/transit.aspect` result as well as exact authored results. This restores the existing approved Lilith–Pluto interpretation and its full detail link when no exact authored unit exists. It does not accept arbitrary templates or modify copy, approval records, or publication rules.

## Local verification

- Fresh production web build and all 14 reader-recovery browser scenarios passed. These cover Google from Create profile and Log in, incomplete birth time, the complete existing-account callback and Friends flow, missing/rejected sessions in both themes, database recovery, stalled content, Calendar dates, and Lilith–Pluto copy after reload and at mobile width.
- The Lilith–Pluto detail regression checks both the opening and the final sentence. Desktop card, detail, and mobile screenshots were inspected. Mobile has no horizontal overflow.
- Typecheck, reader-copy boundary checks, publication lifecycle/offline retirement tests, CSS audit, bundle budget, and the browser release-path guard passed.
- Test sessions and profile data are synthetic, with Supabase requests intercepted. Remote verification blocks application API writes. This does not claim to authenticate the owner's real Google account.

## Existing broader-suite failures

`npm run test:content` built the knowledge prerequisite and passed its preceding checks, then failed the historical Friends owner-signoff payload hash at `scripts/test-friends-owner-signoff-ruling.mjs:161`. That script, its source rows, and every review record it reads are byte-identical to the baseline. No approval record was changed to make this pass.

Two additional legacy probes fail against unchanged source: `test-transit-aspect-v3-selection.mjs` expects an older Pluto–Chiron phrase, and `test-friends-transit-detail-provenance-gate.mjs` expects two source filters that PR706 removed when preserving calculated rows during unavailable content. Their scripts and runtime/Friends dependencies are unchanged by this patch. These failures are not reported as passing checks.

Production verification must use the merged main deployment and the same rendered-copy and OAuth regressions before reporting this fix live.
