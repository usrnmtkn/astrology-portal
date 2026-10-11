# Weekly horoscope CRUD and publication audit

The release checks are tied to the PR head, not a claim that every provider or
future passage is infallible. Test passages and storage are synthetic. No paid
provider requests or production publication are used for this audit.

## Repairs

- Recognize bounded ruler appositives and personal-sign placements inside
  planetary aspect claims. Check the personal sign against calculated positions
  or an ingress; do not ignore an unknown planet, incorrect motion, or aspect.
- Attribute an adjacent `from … house to … house` pair to the first and second
  aspect planets respectively. Both houses must match the calculated brief.
- Recompute current factual checks for manual/imported editions as well as AI
  editions. Preserve original text and historical validation receipts.
- Run a read-only, authenticated, version-checked publication preflight before
  owner approval. Show every affected sign with a direct route to its editor.
  A failed or unavailable check cannot say the edition is ready. The disabled
  publication footer remains in document flow so it cannot cover repair controls. The final
  publication handler repeats validation and rejects stale writes.
- Keep edition inventory responses lightweight: never fabricate draft metadata
  on an inventory-only row. Reopening an edition retrieves its full document.

## Verification matrix

| Boundary | Actual-handler/browser coverage |
| --- | --- |
| Create / dates | Signed Swiss brief; all 12 signs; any day within the same week; past dates; DST and year boundaries; duplicate identity |
| Generate | Durable Gemini transport fixture: 12 drafts and 12 prose checks; browser navigation does not cancel the saved batch |
| Recover | Pause/resume after reload; lost acknowledgement; leases; expired requests; one held sign does not stop the remaining signs; no duplicate paid dispatch |
| Read / update | Compact editor read; exact saved paragraphs; save/reload; large private history retained; stale writes refused |
| Reject | Per-sign and whole-edition rejection preserves private recovery evidence; other saved readings survive |
| Publish | All-sign preflight, correct and incorrect aspect/house claims, manual/imported copy, owner approval, exact publication and reader hydration |
| Withdraw / delete | Editing a published edition demotes it; archive and restore retain text; live and stale deletion refused; draft deletion removes reader eligibility |
| Access / failures | Owner authentication; no provider call during preflight; failed validation preserves draft; failed preflight is visible and retryable |

Run the unfiltered `npm run test:content-studio-api` gate in the isolated checkout
and require the exact-head Content Studio API contract workflow before merge.
The expanded regressions are in `test-horoscope-editions.mts`,
`test-horoscope-publication-claims.mts`, `horoscope-model-choice.spec.ts`, and
`horoscope-publication-claims.spec.ts`. Existing generation, recovery, rhetorical
admission, rejection, checkpoint, history, and owner-session tests remain gates.

Fresh-build browser coverage uses desktop/mobile and light/dark themes. It
continues the generated batch through a manual edit, reload, preflight, approval,
publication and reader reload. Separate publication tests repair two different
invalid readings, show both errors together, and recover from a failed check.

## Limits and release evidence

The October 11 parser follow-up retains all eight owner-specified syntax cases
in `weeklyAspectParserCases`: six aspect sentences plus a retrograde status and
a First Quarter Moon. Each aspect is matched to its calculated event; personal
signs and paired houses are checked for the correct audience. Both base and
inflected forms of meet, sextile, square, trine and oppose are exercised.
Validator v10 recognizes meet/meets as conjunction while leaving ordinary
meeting prose outside aspect detection. Actual-handler regressions cover
publication and refusal for a wrong pair, motion and event date. These syntax
examples are test inputs, never positive writing evidence or serving content.

The recovery follow-up fixes the batch connection-failure counter: a successful
stage clears the streak and its stale error, and an explicit resume starts a
fresh streak. Three consecutive retrieval failures still pause. The actual
handler regression injects three separated outages, then three consecutive
outages, resumes, and requires exactly twelve total drafts with no duplicate
dispatch. Counter checkpoints use a fresh row version and retain the lease fence.

Release-path checks also cover the guarded document reload without treating its
expected destroyed execution context as a test failure. Deferred Studio history
facts keep the entry bundle within its existing size cap. Direct Calendar links
preload their route and view together; the existing cold-load budgets and local
calculation assertions remain unchanged.

Local/browser fixtures execute real handlers with isolated storage and provider
transport fixtures. They do not establish production database latency or Gemini
availability. Confirm the main-branch deployment SHA and READY status, then
inspect the owner's saved edition through its live read-only preflight. Preserve
the distinction between a code deployment and editorial publication. Record
exact test results and any remaining failure in the PR and task report.
