# AI Generation Reliability Architecture

Status: active project architecture
Updated: 2026-09-16

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
