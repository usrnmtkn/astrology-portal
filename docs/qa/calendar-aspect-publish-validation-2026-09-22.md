# Calendar aspect draft publication

The owner reported saving a revised five-value Moon/Aquarius trine
Uranus/Gemini passage, selecting Live in metadata, and receiving an old
two-paragraph error. Read-only Studio inspection confirmed that the saved body
and separate summary were present and the writing check had been invalidated.

## Findings and repair

- Saving Sky edits invalidated the check receipt but retained old lint/judge
  results. Clear those results on new edits and treat an explicitly invalidated
  receipt as a request to check the current saved version, including historical
  rows saved before this fix. Do not show old paragraph findings as current.
- An ordinary relative clause containing `you usually` was incorrectly treated
  as a permanent personality claim. Restrict that phrase's check to direct
  clauses and explicit attribution. Direct habitual claims, the other existing
  standing-pattern checks, timing/metadata boundaries, and publication checks
  remain enforced. The supplied two-paragraph body passes unchanged locally.
- Put Run writing checks in the saved Sky editor's action bar beside approval.
  Replace the misleading Mark reviewed action for these governed rows. Keep
  source-library review unchanged. The status field is read-only for governed
  Sky writing and explains Save, check, then approve. Approval still requires
  the exact saved version and valid check receipt; checking never publishes.

No owner prose, summary, source approval, calculation, or production row is
changed by this code repair. Original live inspection is read-only. Synthetic
write regressions use isolated storage and preserve exact body/summary bytes.

## Verification

The new actual-handler regression failed on the original code because stale
paragraph findings were shown after invalidation. It now saves a replacement,
rejects premature publication, calls the real deterministic checker, approves
the checked version, and verifies actual reader selection. Direct habitual
claims remain negative cases. The isolated helper exposes real rechecks only
inside tests; there is no runtime bypass or model call.

The browser matrix covers 390/1440 pixels and light/dark themes: stale-row
hydration, editing, separate summary, saving, action-bar checks, read-only
metadata status, approval, and exact saved copy. Existing creation, duplicate,
review, publication-error, and concurrent-version flows remain regressions.

Release receipts, exact commit checks, bundle measurements, and production
verification are recorded on the release PR. The owner-authored diagnostic
passage stays outside Git.
