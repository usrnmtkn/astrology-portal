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

## Saved paragraph structure follow-up

The final live inspection found the saved body has three paragraphs, including
a separate final paragraph, whereas the supplied diagnostic text had two. The
draft must keep its saved paragraph breaks. In explicit aspect rechecks,
paragraph count is therefore a visible advisory and does not lower the check
score. This follows the August 25 owner ruling in
`docs/writing/WRITING_RULE_RECONCILIATION_OWNER_RULING_2026-08-25.md`.
Generated drafts keep their existing template check; reader-boundary failures,
saved-version checks, exact body hashes, and explicit owner approval remain
enforced. No production body is normalized or rewritten.

Actual-handler and browser regressions now cover both two- and three-paragraph
saved aspects, including complete reader selection and visible paragraph advice.
A negative case confirms paragraph advice cannot suppress a reader-boundary
failure. The previous two-paragraph local result alone did not verify the saved
three-paragraph draft; the follow-up release must pass its own exact-head gates.
