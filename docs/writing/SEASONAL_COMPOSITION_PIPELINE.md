# Seasonal editorial pipeline

This implementation connects the reusable editorial controller only to Seasonal.
Other writing surfaces retain their existing runtime paths. No prose profile or
master writing instruction was changed for this implementation. An accepted
candidate remains private and is not owner-approved or authorized for publication.

Owner scope: task `01a10a16-f7e0-7403-a096-6d402e94af1b`, attachment
`95ad74b5-abab-46f1-92f5-821d323bfc11/pasted-text.txt`, 2026-10-05. This instruction
supersedes the previous Seasonal advisory-only review and fixed passage quotas;
it does not change the rules for other surfaces.

## Flow and responsibilities

1. Existing signed Swiss Ephemeris preparation provides the complete facts,
   whole-sign life areas, attached meaning sources and saved Seasonal profile.
2. The Seasonal evidence adapter creates an immutable manifest of complete
   approved owner units and exact, scoped owner rejections. Serving approval is
   insufficient. Every unit retains source/version, text hash, scope, selection
   reason and any rejected spans. Unknown-period legacy feedback is excluded
   unless a trusted Seasonal target establishes its scope. Selection uses owner
   assignments and a lexical shortlist; it is not a semantic relevance oracle.
   The complete current owner-preferred revision in the saved profile is also
   registered with its exact profile revision and hash, taking precedence over
   older examples for wording and movement. No minimum number is filled with
   weak matches. Both evidence classes are
   required; their absence stops before generation.
3. The mechanism call links supplied event IDs to their attached meaning IDs,
   identifies the human domains and records what the astrology cannot establish.
4. A separate planning call develops the human concern, consequential distinction,
   event progression and optional manifestations. Source differences are explicit.
   A specific activity is not required to organize the reading.
5. An independent plan-review call checks mechanism support, concern support,
   event progression, invented scenario dominance, manufactured conflict, generic
   thesis, weak consequential distinction and source-argument imitation. A failed
   premise routes to evidence, mechanism or planning before any prose is spent.
6. The prose call uses the frozen writing instructions, validated plan and
   mechanism, selected complete approved units, scoped negative evidence and
   supplied factual catalog. Findings enter as request data, not prompt amendments.
7. Existing deterministic factual checks use the full original brief. A failed
   or malformed draft is preserved and stops; it is not automatically repaired.
8. Owner-voice and meaning calls evaluate the same immutable candidate and manifest
   hashes. The voice reviewer does not receive the plan. The meaning reviewer
   receives facts, mechanism and plan, but must judge reasoning on the page.
   Neither receives the other review. Judge model identity differs from the prose
   generator. Separate calls reduce self-evaluation; they do not eliminate bias.
9. Application code validates check coverage, exact candidate quote and entire
   paragraph, exact owner comparison, reader consequence and responsible stage.
   It rejects stale or unsupported receipts. It derives admission from valid
   checks; models cannot approve, publish or choose a best failed draft.
10. Evidence mismatch returns to retrieval; unsupported mechanism to mechanism;
    weak/invented thesis to planning; execution failures to prose. Every new draft
    receives deterministic checks and both fresh reviews. Limits are three prose
    candidates, three plans, three mechanisms, three evidence retrievals and thirty
    model dispatches per run. Malformed reviews get one identical-request retry.
    Indeterminate judgments or exhausted budgets produce `quality_exhausted`.
11. Passing candidates are available only through authenticated private inspection.
    No candidate text is copied into edition body/sections. There is no automatic
    promotion, publication or budget reset. An uncertain dispatch is never replayed.

## Storage and recovery

`src/astro-writing/editorial/` contains the registry/manifest contract, receipt
validation, controller and local acceptance-test store. The Seasonal adapter is
`src/astro-writing/seasonalEditorialAdapter.mjs`. The API adapter and service-only
store live in `api/_lib/seasonal-editorial-*.ts`.

`studio_editorial_runs` holds the pinned input, all request reservations, model
responses/usage, evidence, mechanisms, plans, candidates, reviews and routing.
Artifacts form an append-only hash chain; writes use revision compare-and-swap.
RLS and client grant revocation prevent anonymous/authenticated database access;
the authenticated admin API uses service access. Edition rows contain only the
run pointer and operational state. A local private file adapter uses the same
journal/CAS contract for the two acceptance cases.

Each request is reserved before dispatch. The response ID survives reload; polls
retrieve that response and do not create model calls. Continue advances the saved
stage within the original limits. Unknown dispatch outcomes are held. Legacy
`seasonal-composition/v1` operations finish under their pinned original workflow.

Content Studio exposes the private accepted candidate and the complete inspection
artifacts, including failed attempts. Failure/exhaustion never fills a normal
reading field. Owner inspection is separate from model admission.

## Quality evidence and rollout gate

The only authorized private generated cases are Taurus/Libra 2026 and
Cancer/Scorpio 2026. The acceptance runner preserves exact manifests, mechanisms,
plans and reviews, every draft, deterministic results, routing, terminal state,
request/response identities and provider token usage. Standard-rate calculated
cost is separate from an invoiced charge. Unknown usage remains unknown.

For each case, historical voice controls compare one complete approved passage
with the previous owner-rejected draft, hiding expected labels and removing the
subject/source group from comparison retrieval. These four controls are a small
calibration check, not a representative evaluation suite. Their false acceptance
and false rejection outcomes must be reported, including invalid judge receipts.
The previous rejection reason may establish rejection without establishing a
specific defect label. Do not invent owner labels from a broad objection.

Mechanical tests and judge PASS do not demonstrate better writing. Compare the
new candidate with the prior rejected draft, then obtain exact owner correction
or approval. Correction burden has not been measured until that inspection occurs.
Two cases cannot establish broad generalization, and historical comparisons do
not isolate architecture from model/configuration changes. Do not extend runtime
wiring to other surfaces before actual Seasonal improvement is established.

## Verification

- `node scripts/test-seasonal-editorial-controller.mjs`: immutable evidence,
  scoped rejection retrieval, exact review evidence, gating, routing, bounded
  exhaustion, factual stops, separate reviews and persistent CAS.
- `node --import tsx scripts/test-seasonal-composition.mts`: actual Seasonal API,
  private storage, dispatch reservation, reload, authentication and reader isolation.
- `tests/visual/horoscope-seasonal-composition.spec.ts`: owner inspection and
  recovery in mobile/light and desktop/dark, with no reader draft mutation.
- Existing full Content Studio API, reader privacy, factual/house/date and profile
  isolation suites remain required. Synthetic fixtures are not owner-voice gold.
