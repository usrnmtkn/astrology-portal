# Transit-to-natal source isolation

## Scope and status

Source repair prepared against `f5e10aa1f34bd4035b6a703b14793ddbf8c44149`.
This document records source-level verification, not a production release.
No saved prose, approval, publication state, or production database record is
changed by this repair. Existing grouped fallback copy is not reclassified as
approved exact-aspect copy. Distinct reader prose still needs distinct reviewed,
published exact records.

## Confirmed failures

1. Personal Transits rendered a shared source and made its edit action prominent,
   while independent exact authoring appeared below the preview. Selection was
   easy to confuse with source ownership. Saved drafts were correctly excluded
   from the published preview, but the workspace did not expose their state.
2. In both transit resolvers, shared pass/variant candidates could outrank an
   eligible exact base source. A synthetic Sun/sextile/Sun fixture with variant 2
   selected `/soft/variant-2` instead of `/sextile`. This is not just a label issue.

## Source changes

Place the selected contact's write-up first and open its You and Friend
editor when the six transit fields are complete. Shared fallback editing stays
under the published preview as an advanced, confirmed action.
- Display the exact content key, saved draft/review/archive state, and existing
  verified live-status badge. Saved LIVE flags alone are not serving evidence.
- Classify exact, exact-variant and shared sources. Keep real paragraph receipts.
  Shared editing is a collapsed advanced action with a second explicit warning.
  Reset confirmation on selection, voice and content revision changes.
- Prefer all candidates for the selected exact contact (pass, variant, then base)
  over shared candidates. Retain original fallback order within the remaining
  candidates, and preserve eligibility, publication and retirement checks.
- Keep You and Friend body fields independent. Do not change calculation facts,
  supported identities, return routing, shared prose or approval rules.
- Update package version and its six pinned assertions; regenerate the shipped
  artifact and manifests through the normal build, never by hand.

## Verification performed in isolated local source evaluation

An authorized earlier Actions snapshot from the same repository supplied source.
The original blobs for the edited editor, resolvers, browser tests and preview
handler tests were compared with the pinned main branch. Remaining patch inputs
are protected by exact original/new Git blob hashes in the transport manifest.
The snapshot directory is not a Git checkout; canonical memory recall and fresh
whole-checkout preflight have not run locally.

- Editor scope/state helper: 2,520 identity/audience-shaped cases passed. These
  are editor key tests, not claims that every chart contact has approved prose.
- Actual browser source resolver: 9,672 synthetic exact edit-isolation cases
  passed, including both voices, pass/variant order, retirement, draft exclusion
  and non-mutation. The source was executed through a local TypeScript loader.
- Actual Node/browser source catalog parity: 30,240 selections across 14 transit
  bodies, 18 natal points, five aspects, 12 signs and two voices; 29,184 rendered
  and 1,056 explicit gaps agreed. This uses snapshot catalog data, not live DB.
- The old shipped artifact reproduces the shadowing defect and the patched
  browser source selects the exact key for the same synthetic fixture.
- Pure editor helper strict typecheck and changed TS/TSX syntax checks passed.

## Added release regressions, not yet executed locally

The normal source test imports the new scope and source/shipped isolation tests.
The actual preview API test now checks three planet pairs, four distinct aspects,
both body fields, variant/pass contexts, draft exclusion and sibling isolation.
The browser suite includes exact editor placement, draft save/reopen, separate
Sun trine/sextile keys, both body fields, unchanged shared preview, cancel and
stale-confirmation reset, desktop/mobile and light/dark themes. Existing actual
shared-source opening flows are updated for the explicit confirmation.

Required before merge: fresh isolated checkout and own `npm ci`, canonical
repository memory recall, official runtime/manifests/index rebuild, the full
unfiltered Content Studio API contract on the exact PR head, admin typecheck,
relevant browser flows, CSS/token audits, content gates, staged/public-output
privacy scans and bundle budgets. Confirm the main deployment and the same
reader/editor scenarios before claiming production repair.

Two preparation workflow attempts ended before any steps ran. Their startup
failure is not a failing code assertion; its present cause was not verified.
Do not waive release gates or claim full API/browser/deployment verification.
