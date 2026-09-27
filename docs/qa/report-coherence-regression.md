# Connected report delivery regression

This repair addresses three separate failures: a reviewer request rejected before
provider dispatch, raw source assembly returned as a finished report, and end dates
estimated before calculated transit timing was available.

## Delivery behavior

The `report-source-completion-v1` environment value remains compatible with the
existing deployment configuration. It now validates source coverage and permits
only reviewed generated writing. The source assembly itself is never a new
finished report. Historical source receipts remain readable; old saved reports
are not automatically overwritten or regenerated.

The bounded path allows an initial draft and one correction. Writer validation,
review failure, or transport failure cannot mark source prose ready. Held quality
jobs cannot silently restart another paid writing cycle. Provider account errors
retain their explicit recovery behavior.

Collect fact, writing, length and prose-integrity defects together before the
single correction. Returning after only the first validator hides known failures
until the correction allowance has been consumed. Terminal diagnostics retain
validation failures and the final draft hash.

## Calculations and review transport

Daily submission waits for the selected contacts' Swiss Ephemeris calculations at
the same profile/date reference used by the page. `currentStart/currentEnd` is a
continuous orb window; `engagementStart/engagementEnd` may include gaps in a return
series. Local date/time labels accompany exact timestamps. A retrograde flag
alone must never add a repeat-contact story. Missing current timing stops before
paid submission rather than turning the reference date into an end date.

The reviewer sends compact brief/draft JSON. JSON pointer choices are validated
against exact nonempty string fields on the server instead of duplicating every
pointer in the provider schema. Review has a bounded 131072-byte wire allowance
for source material, the draft, previous findings and reconciliation. Writer
limits, review thresholds and source-evidence requirements are unchanged.

## Focused checks (no provider calls)

- `node scripts/test-transit-source-completion.mjs`
- `node --import tsx scripts/test-report-validation-feedback.mts`
- `node --import tsx scripts/test-transit-report-prose-integrity.mts`
- `node --import tsx scripts/test-transit-reading-source-citations.mts`
- `node scripts/test-personal-report-timing.mjs`
- `node scripts/test-you-report-source-handoff.mjs`
- `node scripts/test-transit-source-receipts.mjs`

The report-reader CI workflow includes the new regressions. Existing API,
privacy, typecheck, build and actual reader-delivery checks still apply.

## Release limits

Transport tests and deterministic fixture passes do not establish writing
quality. The most recent private real-generation check stopped after its bounded
correction, before a judge call. It exposed the early-return validation problem
fixed here. There has not yet been a successful real end-to-end generation after
that final change. No candidate should be labeled approved or production-verified
on the strength of offline fixture verdicts.

The old fragment composer is retired, not replaced with newly approved source
prose. Historical rows retain their provenance. New source prose requires its
normal owner review; an old approval label is not a current quality assessment.
