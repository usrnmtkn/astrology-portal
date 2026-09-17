# Transit source isolation repair transport

**Not applied or deployed merely by the presence of this directory. Do not merge
this transport-only branch.** The seven ordered plaintext patches contain the
prepared source repair, tests and QA notes. Their concatenation has a SHA-256
check, and every target has exact original/result Git blob hashes.

The remote connector supports complete-file writes, not patch application; the
large editor and resolver files are therefore transported as narrow diffs. The
branch workflow verifies the current canonical checkout, applies the patch,
rebuilds generated runtime/catalog artifacts, runs source/shipped isolation and
preview API checks, and only then commits actual changes back to this feature
branch. It never merges main, publishes saved copy or deploys production.

The initial preparation workflows ended before any job steps ran. Current cause
is unverified. If the apply workflow also cannot start, the implementation remains
here as a prepared patch, not an application change. The same guarded application
can be run in an authorized clean checkout of this branch:

    node .github/repairs/transit-exact-isolation/apply.mjs --write

Follow AGENTS.md and the patched QA document. Full unfiltered Content Studio API
checks on the actual PR head, browser flows, CSS/token/privacy/content gates,
bundle budgets, and main deployment verification remain mandatory. No alternate
runner, partial test result or saved LIVE flag waives those gates.

Local evidence: 2,520 editor identity/audience cases; 9,672 synthetic source
isolation cases; source Node/browser parity over 30,240 snapshot selections
(29,184 rendered, 1,056 explicit gaps). These are not production verification.
The old shipped artifact reproduced shared-variant shadowing while corrected
browser source selected the exact aspect. No production DB writes were made.
