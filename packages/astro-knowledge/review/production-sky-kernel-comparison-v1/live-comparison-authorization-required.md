# Sky old-versus-governed live comparison: authorization required

Status: `NOT_AUTHORIZED`
Serving status: non-serving review artifact only
Approval effect: none
Gemini production support: excluded

The deterministic request/evidence comparison is complete. No generated-copy
or reviewer-score comparison has run.

## Proposed fixed target set

The existing deterministic set contains six targets:

1. `sky-daily-2026-08-14`
2. `sky-season-leo-2026-08-14`
3. `sky-moon-pisces-2026-08-14`
4. `sky-aspect-jupiter-opposition-moon-2026-08-14`
5. `sky-retrograde-mercury-2026-08-14`
6. `sky-lunation-full-moon-aquarius-2026-08-14`

For identical scoring, each target needs four successful calls:

- legacy writer;
- legacy reviewer;
- governed writer; and
- governed reviewer.

The six-target proposal therefore has a hard maximum of 24 successful calls.
An eight-target proposal would require the owner to name the additional two
targets and authorize a 32-call maximum.

## Required owner authorization fields

Before a live runner may be executed, record all of the following:

- exact target list;
- writer provider and model;
- reviewer provider and model;
- identical temperature/reasoning/output settings and structured schemas for
  each legacy/governed pair;
- billed-ledger path and exact successful-call baseline;
- maximum additional successful calls;
- output-token cap;
- retry allowance;
- stop rule; and
- confirmation that every output remains `PENDING OWNER`, non-serving, and
  ineligible for approval or promotion.

Recommended execution rule: zero retries and stop on the first writer,
reviewer, deterministic, stale-index, packet-hash, or provider failure.

## Required comparison output

Report legacy and governed results side by side for factual accuracy, surface
register, grammar, unsupported invention, deterministic validation, and
reviewer score. Preserve provider/model/settings, packet hashes, request hashes,
and billed-call records for every candidate. A reviewer score is advisory and
cannot approve wording, evidence, or a rollout.

No canary flag may be enabled merely because this comparison completes. The
owner must separately authorize deployment after reviewing its results.
