# Skill evaluation and owner review

Use this workflow to test a writing-skill change, compare complete drafts, or
calibrate a permitted judge. The project adaptations are
[Advanced Evaluation](../../.agents/skills/advanced-evaluation/SKILL.md) and
[TLDR Astro Skill Testing](../../.agents/skills/tldr-astro-skill-testing/SKILL.md).
They are agent maintenance guidance, not additional runtime writing prompts.

## Authority and scope

The [canonical writer](../../skills/tldr-astro-writer/SKILL.md), current owner
corrections and target surface workflow retain authority. Preserve the distinct
fact, meaning, voice, revision-context and negative-evidence roles in
[Studio prompt review](CONTENT_STUDIO_PROMPT_REVIEW.md). Keep protected owner
passages complete with their source identities and hashes. Current scoped
corrections override conflicting historical examples. Rejected prose, judge
reports and calibration-only passages are never positive writer evidence.

Preserve each surface's existing validators, admission policy, output contract,
model configuration and owner review. Factual validity cannot be averaged away
by preference scores. Existing context-sensitive rhetorical checks retain their
own receipt contract; advisory voice findings do not become new machine gates.
Generic percentage floors, length-normalized prose scores, new banned-word lists
and fixed writing formulas are not adopted from upstream examples.

## Preparation, paid execution and approval

Offline planning, synthetic tests, private comparisons of existing authorized
artifacts and owner review need no new provider request. A new billed writer,
judge, swapped-order pass or retry needs explicit bounded owner authorization
for the concrete plan. Reuse a matching authorization already given in the
session; elapsed time, an installation request or a fixture pass is not consent.
Verify the exact surface adapter's own authorization checks immediately before
dispatch. Keep unresolved provider outcomes held rather than replaying them.

Keep these decisions separate:

| Decision | Effect |
| --- | --- |
| Authorize a comparison | Permits the specified execution and budget only. |
| Prefer a candidate or skill | Records comparative feedback in its stated scope. |
| Label calibration examples | Supplies evaluation labels, with their source role and scope. |
| Approve complete exact prose | Uses the existing owner approval record tied to its exact hash. |
| Approve publication or source promotion | Uses the separate owning content workflow and its authorization. |

A model cannot make the last two decisions. A favored sentence or judge winner
does not approve the rest of a passage. Record feedback through
[the existing private feedback workflow](../agent-memory/studio-feedback.md),
preserving exact owner words, complete rejected drafts and resolvable provenance.
Prepare approval records unsigned. Do not manufacture an owner label from an
assistant score or promote test outputs into voice evidence.

## Freeze a private manifest

Before evaluation, record the following in a protected run directory outside
Git and served assets, following [project privacy](../security/project-privacy.md):

- The question, surface/period/audience, case IDs, predeclared contract assertions,
  rubric version, development versus holdout split, and the proposed single change.
- Base Git revision, baseline and candidate skill/reference files and hashes.
  For a new optional skill, omit only that addition from the baseline. Shared
  governance and surface rules remain active in both conditions.
- Exact input and calculated-fact references, selected meaning/voice source IDs,
  complete-text hashes, scoped feedback versions and saved profile revision/hash.
  Hashes point to retained complete private artifacts; they cannot replace them.
- Provider/model/settings, adapter, permitted stages, repetitions, planned calls
  and estimated cost for both conditions and any separately permitted judging.
- Existing authorization provenance, exact request/plan hashes required by the
  adapter, and stopping/recovery conditions. Preparation alone stays unexecuted.

Use the same task and controls for both conditions. If a different model, saved
profile, evidence selection or factual brief is unavoidable, disclose it and
limit the inference. Different historical runs are observational comparisons.
Keep labels and candidate identity mappings outside reviewer inputs. Use fresh
isolated contexts for independent skill tests when available and authorized;
otherwise record context carryover as a limitation. Delegation is optional and
requires the session's existing authorization.

## Reuse the surface's execution path

| Surface or question | Existing adapter and evidence |
| --- | --- |
| Sky Placement / article harness | Follow the Sky Placement skill. Inspect `scripts/run-astro-writing-harness.mjs` for its actual request contract; `--prepare-only` makes preparation distinct from `--authorize-live`. Preserve applicable exact-outline approval and actual-provider receipts. Do not use this article adapter for other surfaces merely because it accepts an input. |
| Personal Transit | Follow `skills/tldr-astro-personal-transit/SKILL.md` and `docs/writing/PERSONAL_TRANSIT_OWNER_BATCH.md`. `scripts/evaluate-personal-transit-writer.mts --prepare` uses the existing batch preparation; dispatch uses its exact-manifest authorization. Keep the four-contact You/Friend batch, settings and call budget. No model judge, planner, article gate or automatic rewrite is added. |
| Horoscope, lunar or template Studio writing | Trace the actual handler and assembled provider request listed in Studio prompt review. Preserve the saved period profile, scoped feedback, stage plan, request reservation, output schema and optimistic version checks. Use intercepted providers for offline contract evidence. |
| Existing rhetorical judge calibration | `src/astro-writing/rhetoricalCalibration.mjs` accepts a caller-supplied judge and withholds fixture labels. Its injected tests prove receipt handling and accounting; a live judge needs its own bounded authorization. Do not add this judge to a surface that has none. |

Inspect the current adapter before invoking it; unsupported options are not an
integration. A prepared packet, lint pass or mocked response is not an actual
provider execution. This workflow does not introduce a generic provider client,
Anthropic CLI dependency, replacement writer or production judge.

## Review complete outputs

Retain each actual request, complete response and adapter receipt privately,
including response ID when provided, hashes, model/settings, measured usage,
duration and failures. Unreported usage or cost is unknown, not zero. Fixture
runs must explicitly state intercepted transport and zero actual provider calls.

Run deterministic checks before declaring a usable winner. Keep invalid candidates
and unavailable runs visible in accounting instead of dropping them from the
denominator. Show the owner complete anonymous A/B passages alongside the task and
reader-relevant brief in a private Markdown comparison or the existing review
surface. Do not compress protected passages to fit a viewer.

For an independently authorized model preference review, compare both display
orders and map each answer back to stable identities. Record a genuine tie,
`position_inconsistent`, abstention and invalid receipt as different outcomes.
Require exact quoted evidence and complete paragraph context for findings.
Keep reviewers' expected labels hidden and generator/judge identities separate
where the approved plan permits; record any shared-model limitation.

Report contract results, owner preference and correction burden separately.
For calibrated judges, include false acceptance, false rejection, missing/wrong
diagnoses, invalid reviews, ties and order consistency with explicit denominators
and per-surface/criterion breakdowns. Holdout results stay separate. Do not adopt
an arbitrary agreement threshold or interpret model confidence as a probability.

## Iterate and deliver

Retain each iteration and its complete owner feedback. Prefer the smallest change
supported by observed errors; reserve holdout cases for checking generalization.
Another paid iteration or prompt-trigger optimization run must fit a current
bounded authorization. Stop at the authorized limit or when missing evidence
prevents a valid comparison. Report the incomplete cases without a winner claim.

Deliver the change, frozen case inventory, actual results, measured costs and
limitations. Distinguish instruction-delivery tests, behavioral skill tests,
live prose comparisons, exact owner prose approval and deployment evidence.
This installation establishes neither improved Satori voice nor a calibrated
model judge. Skill revisions use normal repository review; generated prose remains
`needs_review`, with `ownerApproved: false`, `promotionAuthorized: false` and
`canonical: false` until the existing owner process changes its state.

## Installation verification — October 21, 2026

Local branch: `feat/evaluation-skills-20261021`, based on refreshed
`origin/main` at `e969218f7ba8efbed25d5d762178d02ed20a9643` (0 ahead/0 behind
before these uncommitted changes). The adaptations are discoverable through
`AGENTS.md`, `CLAUDE.md` and Studio prompt review. The shared workflow is indexed
as a maintenance note and covered by the existing deployment source pattern.

Executed locally with this checkout's own `npm ci` dependencies:

- Both skills pass the Skill Creator validator. Discovery metadata, local links,
  five starter-case evidence paths and pinned adaptation/license hashes pass.
- All 24 agent-memory tests pass, including complete workflow retrieval, hashes,
  maintenance-only role, canonical required context, source packaging and the
  existing authenticated handler checks.
- Writer-harness and rhetorical-contract regressions pass with injected clients.
  The actual-handler Studio prompt contract passes for both supported providers.
- The repository privacy scan passes for 11,274 files using the protected local
  policy. `git diff --check` passes.

These are local structural, fixture and contract checks. No paid baseline,
candidate, model judge or trigger-optimization run was dispatched. Behavioral
skill effectiveness, live prose quality and deployed retrieval remain unverified.
The full Content Studio API gate and exact-head hosted checks remain required
before merge; this installation makes no production-completion claim.
