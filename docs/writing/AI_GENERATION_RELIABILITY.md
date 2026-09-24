# AI Generation Reliability Architecture

Status: active project architecture
Updated: 2026-09-21

## Scope

TLDR Astro AI generation is one governed system even when the reader surfaces and admin workflows use different endpoints. Reliability work must be evaluated across the full generation path rather than declaring AI generation fixed after one endpoint, pull request, or deployment succeeds.

The current generation surfaces covered by this architecture are:

- Content Studio evergreen placement article writing
- Content Studio dated / template-field Sky article writing
- You Day generated reports
- You Week generated reports
- Friends generated reports

## Required generation path

A successful generation must complete the relevant version of this path:

1. Build and validate calculated facts and governed evidence.
2. Load the applicable owner writing evidence / approved writing memory.
3. Construct a prompt that does not contradict the output validator.
4. Reserve any billing/checkpoint state required before a provider call.
5. Call the selected writing provider.
6. Persist the provider response or checkpoint before continuing when checkpointing applies.
7. Run deterministic fact, placeholder, register, and writing validation.
8. Run the independent quality judge when the surface requires it.
9. Give a bounded corrective pass when the returned draft is structurally usable but fails a correctable deterministic or judge finding.
10. Revalidate corrected copy against the original governed facts and writing rules.
11. Persist the finished draft/result.
12. Mark the job complete only after the persisted result is available to the consuming surface.
13. Verify that the reader/admin UI can load the persisted result.

A successful merge, provider response, checkpoint, judge score, or deployment is not by itself a successful generation.

## Reliability rulings

### Evidence failures

Valid selected source material must have a production evidence identity before a provider call. Weekly Moon material is a supported report source even when its technical reading has no numbered house. Evidence adapters must not require an unrelated house or aspect merely to authorize an otherwise governed source.

### Prompt and validator compatibility

Generation-control placeholders must not be supplied to a writer as immutable prose and then rejected when the writer returns them. Output fields that require finished prose have zero licensed unresolved placeholders. Template workflows that intentionally preserve variables must provide the licensed variable inventory separately and reject only unlicensed variables.

The Content Studio evergreen article writer must not use `{{articleDraft}}` as immutable model context. Existing reader-facing article prose is context when available; the requested `articleDraft` field is declared separately as output.

### Correctable output failures

A structurally valid model response must not become a terminal product failure merely because a correction introduces a mechanically identifiable writing violation. When safe and bounded, deterministic validation findings may receive one targeted cleanup/correction pass followed by full revalidation. The correction may not add facts, loosen evidence rules, lower owner-voice requirements, or bypass the independent judge.

### Checkpoint and retry safety

Checkpointing exists to prevent duplicate billing and unsafe replay, not to turn every infrastructure error into a terminal report.

- A confirmed provider failure with no usable response saved may start a fresh logical attempt within the existing retry budget.
- A checkpoint reservation failure that occurs before the provider call is retryable because no provider call occurred.
- Ambiguous states after a provider may have returned a response remain fail-closed when automatic replay could duplicate billing or overwrite an uncertain response.
- Changed evidence/instructions after a saved checkpoint require a fresh reviewed run rather than replaying an incompatible checkpoint.

These checkpoint rules are shared by You and Friends report generation.

### Provider account rejection

For You Day, You Week, and Friends reports, a confirmed provider credit or
credential rejection is an operational failure. It must not be converted into
a completed report assembled from source passages, even when source completion
is the selected delivery policy. Stop automatic retries, preserve the failed
checkpoint and sanitized operator diagnostic, and show the reader that report
writing is unavailable.

An explicit retry after account recovery starts a fresh checkpoint attempt and
must reach the writer/reviewer workflow, including across worker handoffs. It
must not be mistaken for an exhausted quality cycle that selects source-only
delivery. Replenishing provider credits does not rewrite an already-saved report.
Regression coverage lives in `test-transit-source-completion.mjs` and
`test-report-provider-schemas.mjs`; fixture success does not prove live writing
quality or recover an existing production result.

### Quality gate

Quality standards are not reduced to improve completion rate. A high aggregate score does not override required owner-voice, natural-language, factual-traceability, or other hard criteria. Unsupported invented circumstances remain a valid reason to reject a report.

The system should use specific judge findings as correction feedback while keeping the original governed brief as the factual authority.

## Production acceptance standard

Do not describe AI generation as fixed until production has demonstrated successful end-to-end generation, validation, persistence, and retrieval for the affected surface.

For a broad AI-generation reliability claim, verify at minimum:

- one evergreen Content Studio article generation
- one dated/template Sky article generation
- one You Day report
- one You Week report
- one Friends report

For reports, acceptance requires a completed job with a persisted result identifier/body that opens successfully in Reports. A `Checking`, `Preparing`, `retry`, or deployed-code state is not completion.

## Memory Graph role

The Memory Graph is evidence and architecture context, not permission to publish and not a replacement for calculated astrology facts or validators.

Generation workflows should recall the relevant writing rules, owner corrections, approved examples, and this reliability architecture before making broad changes to AI writing or declaring generation repaired. Live Studio feedback may augment repository memory, but repository architecture remains the durable project record.

When a new AI generation path is added, it must document:

- surface and endpoint
- factual/evidence source
- writing-memory source
- provider and output contract
- deterministic validators
- quality/judge stage, if any
- retry/checkpoint behavior
- persistence target
- production acceptance test

## Current project ruling

Reports and Content Studio AI generation are part of the same broader reliability audit. Fixes to one surface do not prove another surface is healthy. Production failures must be traced through the actual generation lifecycle and added to this architecture when they expose a reusable reliability rule.

## September 21 report repair: scope and verification

Status: local checks passed; production recovery remains unverified. Source: owner task `thread:01a0c440-92d0-7822-bda6-af3338840786`. The investigation snapshot contains ten failed jobs with no saved result: four You Day, one You Week, and five Friends. Eight retain writer/judge checkpoints; two older failures lack enough checkpoint evidence for a sentence-level diagnosis. These counts describe the inspected failures, not an overall failure rate. Private report bodies and job identities stay in protected storage.

You reports answer the reader's day/week question in second person from the locked personal-transit brief. Friends reports describe the selected friend's temporary conditions in third person; second person is permitted only in explicitly supplied relationship context. Each has one headline, one visible TLDR (`tldr` and `summary` are identical storage aliases), and a body. Their writing standard is the governed source material, approved report owner evidence, deterministic checks, and the September 7 report-specific judge contract. A later narrow report ruling must not silently be replaced by an older general writing rule.

Repair order and boundaries:

| Priority / defect class | Observed weakness | Repair and evidence |
| --- | --- | --- |
| 1 / recovery correctness | Final deterministic recovery omitted the latest draft; cross-attempt feedback could attach an old judge to a newer writer response and omitted deterministic-only failures. | `transit-reading-generation.ts` carries the latest draft into targeted recovery; `transit-reading-checkpoints.ts` matches step order and revalidates the latest draft. Regressions: `test-generated-report-correction.mjs`, `test-transit-reading-checkpoints.mts`. |
| 2 / prompt and validator mismatch | Friends prose used second person in a follow-on sentence without the name and relationship required by the sentence-level validator. Initial output instructions also requested fields outside the provider schema. | `friend-transit-reading.ts` states the exact sentence rule and four-field output; errors identify reader field and sentence without duplicating every pronoun. Regression: `test-friend-transit-reading-contract.mts`. |
| 3 / unsupported interpretation and editorial defects | Saved judges rejected invented week/year comparisons, unsupported interpersonal consequences, repetition, and low voice scores even when aggregate scores were high. | Preserve all release floors. Revision prompts restate the existing timing and temporary-condition evidence boundaries. Current owner evidence remains the writing authority. Success needs fresh governed generation and owner review; local prompt edits alone do not establish better prose. |
| 4 / adjacent premium-report exception | An invalid owner-voice evidence citation could fail after a critique was recorded as successful. | `report-writer-chain.ts` validates eligible citations within the existing metered response-retry boundary, before successful checkpoint persistence. Regression: `test-report-fulfillment.mjs`. This is not proof that the historical premium report has recovered. |

No calculation defect has been established by this investigation. One interrupted You job has an uncertain provider outcome; keep its checkpoint fail-closed and reconcile it before authorizing a fresh run. Do not reset checkpoints or raise time/call limits based on that single incident. Older jobs without checkpoints need new observed evidence, not an invented diagnosis.

The implementation owner is the repairing agent; the product owner controls billed batches, exact reader-copy approval, and release approval. Checkpoints are: synthetic regressions and the Content Studio API gate; review of the concrete patch; exact-head hosted checks before merge; then bounded, explicitly authorized live recovery. Exclusions are source-content rewrites, calculation changes, lower judge thresholds, broad UI redesign, and bulk regeneration of completed reports.

Completion requires a verified completed You Day, You Week, and Friends job, each with a persisted result identifier/body that opens in Reports. A representative pass validates that surface, not all ten failures: each affected job must be individually reconciled and its recovered result or remaining blocker recorded before claiming all failures fixed. Preserve entitlement, target window, governed facts, and billing history. Keep premium recovery separately tracked.

Diagnostic memory records symptoms, confirmed recovery defects, implementation paths, regression evidence, and unresolved production checks. It must retain provenance and stay ineligible as positive writer evidence. Raw failed prose and judge opinions never become broadly active writing rules automatically; reusable editorial corrections require the existing owner-review process.

Local verification on September 21: Content Studio API gate; typecheck of affected report modules; focused report correction, checkpoint, lifecycle, judge, schema, and delivery regressions; premium fulfillment regression; all 21 memory tests; privacy scan; and five browser tests from a fresh production build covering Reports and Friends saved-result transitions. The delivery tests exercise 21 synthetic pipeline cases. All model transports/storage used by those tests are fixtures. These checks establish local behavior, not actual provider writing quality, deployed memory freshness, or recovery of a production report.
