# Production writing-kernel integration

Date: 2026-08-14
Status: all known production writer/reviewer/reviser paths are pre-call gated;
Sky is migration-ready but defaults to legacy prompts and a zero-percent canary

## Boundary

The production paths construct a governed contract before reading a provider
key, opening a billed ledger entry, or making a network request. The contract
validates canonical identity, surface, current knowledge and phrase indexes,
nested packet and source hashes, surface permissions, voice-evidence isolation,
and the selected deterministic validation profile.

The boundary covers:

- the OpenAI meaning planner, writer, cold reviewer, contextual reviewer, and
  reviser in `api/_lib/content-generation.ts`;
- the Claude writer in that same runtime;
- the direct Sky Aspect writer and judge in
  `api/cron/generate-sky-aspects.ts`; and
- report-fulfillment writers, reviewers, and revisers through
  `api/_lib/report-model-client.ts`.

The Sky hook runs before provider fetch. The report assertion
runs before the billed-call ledger opens. A report reviewer or reviser may
receive a failed draft only when a deterministic result explicitly records
`checked: true`, because those calls are the governed repair mechanism; an
unchecked draft remains blocked.

No Gemini endpoint, key, provider option, or model is added to production.
Gemini authorization remains limited to the offline drafting pipeline.

## Identity bridge and multi-object packets

Legacy identifiers resolve through enumerated syntax and context. There is no
fuzzy matching. Unknown, surface-mismatched, or invalid-subject identifiers
block before a provider call.

Multi-object requests retain an ordered packet per canonical object. Every
packet preserves target usage, temporality, authority class, surface
permissions, provenance, source hash, evidence hashes, and packet hash. The
outer hash covers the target order and every nested packet; targets are never
collapsed.

## Surface migration and Sky canary

Each surface keeps its planner, schema, register, validation profile, and
serving boundary. Naming Sky as migration-ready does not activate governed
prompt evidence. A bounded canary requires both:

```text
WRITING_KERNEL_GOVERNED_SURFACES=sky
WRITING_KERNEL_SKY_CANARY_PERCENT=1
```

The percentage is assigned deterministically from a hash of the content key,
so repeated requests remain in one cohort. Zero is the default and the quick
rollback. `WRITING_KERNEL_SKY_GLOBAL_ENABLE=1` is an explicit global override,
not the normal rollout mechanism. Invalid percentages fail closed. Naming any
surface other than the migration-ready Sky surface also fails closed.

`WRITING_KERNEL_TELEMETRY=1` emits only hashed content and legacy identities,
packet/gate hashes, validation profile, canary selection, block reason, and
whether a provider call was prevented. Prompt text, evidence text, owner
content, and provider credentials are not emitted.

## Direct production paths

| Production path | Governed contract |
| --- | --- |
| Shared content generation | Central pre-call gate active for every model role; existing prompt remains the default |
| Direct Sky Aspect generation | Central pre-call gate active for writer and judge before provider fetch; existing planner, card schema, linter, judge, and owner-review boundary preserved |
| Report fulfillment | Report-specific central gate active for writer, reviewers, and reviser before the billed ledger; existing report resolver, budget, and lifecycle preserved |

`scripts/test-production-model-consolidation.mjs` freezes these boundaries and
proves a failed Sky gate reaches zero fetches. The direct-call drift allowlist
remains shrink-only so a future bypass cannot be added quietly.

## Emitter coverage and evidence eligibility

The production coverage audit is bound to actual TypeScript and Python emitter
expressions. It enumerates 11,083 identifiers across 24 emission sites.
Current result:

```text
resolve with eligible evidence  7,652
unmapped shape                     24
missing canonical entry         3,286
surface-permission gap             28
empty evidence shell               93
silent misparse                      0
quarantined                      3,431
```

No guessed mapping, permission, or content was added to make coverage pass.
The quarantine is shrink-only and records the emitter for every unresolved
case.

Surface permissions remain independent from catalog identity. Friends PHRASE
evidence cannot flow into Sky, You, natal, synastry, composite, relationship,
or report generation. The twelve Friends house-license entries remain
`review_needed`, `ownerApproved:false`, `writerEligible:false`, and
`renderEligible:false`. Unknown-time Friends context removes houses, angles,
and rulership diagnostics and falls back to the universal exact-aspect base.

## Editorial evidence inspector

`scripts/inspect-production-writing-evidence.mjs` creates a zero-network
inspection artifact for an exact production-shaped request. It shows legacy
and canonical IDs, selected evidence and exclusions, authority, temporality,
provenance, hashes, surface permissions, phrase isolation, validation profile
and rules, canary state, and the exact provider request preview. Secret headers
must be the literal `[REDACTED]`; the inspector rejects real credentials.

## Comparison and activation boundary

`packages/astro-knowledge/review/production-sky-kernel-comparison-v1/comparison.json`
contains six non-serving request fixtures. It proves deterministic legacy and
governed request/evidence construction, including a Daily request with eight
ordered targets. It makes zero provider calls and records no generated copy.

Live output-parity comparison remains unrun. A reviewer-score comparison uses
two writer calls and two reviewer calls per target: legacy writer/reviewer and
governed writer/reviewer. Before any spend, the owner must authorize the exact
targets, provider/model/settings, ledger baseline, maximum successful calls,
retry allowance, and stop rule. No canary or global flag may be enabled from
this dirty worktree.

## CI contract

The content-writing workflow blocks on corpus grammar, knowledge and phrase
index freshness, kernel drift, emitter-derived identifier coverage, packet
integrity, pre-call behavior, direct-model consolidation, surface isolation,
the evidence inspector, and deterministic comparison freshness. Existing
serving artifacts and the Friends draft/ledger state remain protected by
`scripts/test-knowledge-wiring.mjs`.

The drift freeze and validation-profile work are complete: the 28-entry bypass
allowlist is shrink-only and rejects stale exceptions, unknown validation
profiles throw, and artifacts record `rulesRun`. ASCII, en-dash, and em-dash
checks belong to the shared base profile.
