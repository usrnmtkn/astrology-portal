---
name: tldr-astro-skill-testing
description: Test TLDR Astro skill or writer-instruction changes against a frozen baseline using realistic cases, contract checks, complete outputs and owner review. Use when adding, revising or benchmarking a writing skill; preparing a test does not authorize paid execution.
license: Apache-2.0
---

# TLDR Astro Skill Testing

This is the testing and human-review portion of Anthropic Skill Creator adapted
to TLDR's existing writers. Read the
[shared evaluation workflow](../../../docs/writing/SKILL_EVALUATION_WORKFLOW.md).
Use [Advanced Evaluation](../advanced-evaluation/SKILL.md) for rubric design,
pairwise preference or judge calibration. Use the existing Prompt Engineer and
Writing for Agents skills to author the proposed change.

## Prepare the comparison

1. State the specific failure the change should address, the target surface
   and the observable success criteria. Snapshot the current skill and its
   reached references before editing. For a new optional skill, the baseline
   omits only that addition; canonical writer governance and surface rules
   remain active in both conditions.
2. Select realistic normal, failure and near-miss requests. The
   [starter cases](references/starter-cases.json) cover important project
   boundaries; adapt the set to the actual change. Freeze the cases and
   contract assertions before evaluating candidate outputs. Keep holdout
   cases separate from examples used to develop the change.
3. Prepare a private run manifest recording baseline/candidate hashes,
   case IDs, complete input references, source roles, current feedback/profile
   versions, calculation identity, model/settings, output contract and planned
   calls. Use the shared workflow's manifest and receipt requirements.
4. Run offline contract checks and inspect actual assembled provider requests
   with injected providers. These checks establish instruction delivery,
   factual boundaries, persistence and approval behavior; they do not establish
   literary quality or the skill's behavioral effectiveness.

## Execute and review

Use the existing surface adapter. Preserve its model, stages, retry budget,
evidence selection and approval requirements in both conditions. Fix other
variables where possible; record and explain any difference. A historical
baseline with different inputs or settings is an observational comparison.

Each paid condition and judge pass must fit an explicit owner-authorized plan.
Count both baseline and candidate costs, repeats and swapped-order judge passes.
Preparing this workflow or installing a skill grants no paid-call authorization.
Use independently isolated runs when available and authorized; otherwise disclose
sequential execution and context carryover. Subagents are optional, not a new
execution requirement.

Retain complete inputs, requests, outputs and actual-provider receipts privately.
Show complete anonymous A/B outputs to the owner before drawing a prose-quality
conclusion. A private Markdown comparison or the existing Studio review surface
is sufficient; this adaptation does not require an Anthropic CLI or viewer.
Record labels and complete owner reasons without broadening their scope.

## Iterate and finish

Compare per-case results, including failures and unavailable runs, with measured
usage and timing. Separate contract pass rates from owner preference and correction
burden. Change only what the observed failures justify, preserve the prior iteration,
and evaluate holdouts. Another paid iteration requires authorization covering it.

Stop when the authorized comparison is complete, its budget is exhausted, or
unresolved evidence prevents a valid conclusion. Deliver the skill diff, test
inventory, actual results, limitations and the owner's decisions. Keep unapproved
outputs `needs_review`; a preferred skill, higher score or favored sentence does
not approve complete reader prose, activate a correction or authorize publication.

Pinned upstream source, license and adaptation scope are in
[UPSTREAM.json](UPSTREAM.json).
