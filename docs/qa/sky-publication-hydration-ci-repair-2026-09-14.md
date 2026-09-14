# Sky publication hydration and CI recovery

## Reproduction and correction

A fresh guest browser on production main `b259099352e1f73eeac0b3a90528bb661be213bf`
observed two complete Sun-in-Virgo article variants on the first visit. A normal
reload was stable, but navigating away and back selected different prose.
`scripts/verify-production-sky-placement.mjs` records every prose mutation,
checks the full opening and ending, and samples card height through refresh.
It delays existing content reads without changing response payloads.

The placement loader resolves the publication ledger, bundled renderer, and both
Studio source overlays before declaring the first article ready. A publication
identity change invalidates unresolved prose; ordinary clock ticks keep the same
resolved article. Detail composition waits for current published aspect sources
and offers retry when an authoritative source is unavailable. An authoritative canonical
publication cannot fall through to the older legacy article while unavailable
or retired. Existing copy remains mounted during ordinary background refresh.
No reader prose, approvals, source rows, calculation thresholds, or source
distribution states change in this repair.

## Local evidence

- Seven placement browser cases passed: desktop/mobile, light/dark, protected
  opening/ending, delayed cold load, reload, navigation, background refresh,
  publication replacement, retirement, and retry.
- Thirty summary/clock/layout browser cases and two publication lifecycle
  summary cases passed.
- The complete `test:content-studio-api` suite passed, including actual handler
  saves, repeated publication, retirement, stale revision refusal, and the new
  authenticated empty-house preview. The evergreen/composable source suite passed.
- Workflow YAML/condition checks, conservative changed-path selection, CSS token
  audits, and public web/admin asset privacy scans passed.
- Studio browser repair restores status badge accessibility labels and preserves
  body typography for clickable prose variables. Assertions for the established
  Studio status names and Natal workspace name follow the shipped UI contract.
  The 293-case Studio matrix passed across the full run (291) and targeted
  rerun (2) after fixing confirmed-inactive Calendar badges. Another 28 reader
  navigation, retrograde, composition and Sky/You parity cases passed.
  Combined delayed-source boundary cases and remote checks remain pending on
  the final integrated PR head.

## CI fixes

The unfiltered Content Studio API workflow remains mandatory on every PR and main
update. Merge commits are no longer skipped by commit-message conditions; YAML
conditions containing `#` no longer become truncated scalars. Studio browser
cases run in four isolated shards without dropping cases or increasing timeouts.
Source tests importing React components use Vite's module loader for CSS imports.
Bundled-content browser fixtures explicitly resolve an empty publication ledger;
an unreachable synthetic host cannot establish the absence of published copy.

The empty-house Studio preview uses the existing authenticated read-only preview
endpoint and shipped renderer instead of downloading the complete reader engine.
The serving-status lookup uses generated exact keys checked against the complete
canonical manifest. Full approval records remain in that manifest. Bundle limits
are unchanged; JavaScript formatting/compression preserves runtime string values.

## Existing full-suite limitation

`npm test` reaches `scripts/test-natal-exact-copy-routing.mjs:49` and fails the
historical natal-aspect metadata checksum (expected `087d8486…`, actual
`7469bac8…`). This same failure is documented in
`docs/qa/sky-summary-event-grammar-2026-09-10.md` under Combined release
verification. The 231 protected rows and their projected fields are unchanged
from the historical repository revision `71f256d28` and from current main.
The checksum and its content/approval inputs are deliberately unchanged here.
This failure must not be described as a passing full content suite.

## NASA/JPL

The completed Horizons comparison in Actions run `34760840299` reported zero
discrepancies and 377 reference gaps across 12 fixtures. Its existing
partial-reference policy remains in effect. The dependent freshness gate passed;
no accuracy threshold was loosened. Production completion still requires the
merged main deployment and both read-only live browser regressions.

The Chrome task added source-boundary staging commits through `42d52e030`;
these are preserved in the branch history. Their patch is applied as reviewable
source code. The candidate workflow only validates it and cannot mutate or push
the branch. All 37 workflow YAML documents pass syntax/condition validation.
