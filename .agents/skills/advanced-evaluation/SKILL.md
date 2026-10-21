---
name: advanced-evaluation
description: Design or audit TLDR Astro draft comparisons and judge calibration, including evidence-based rubrics, blinded pairwise review, position bias and disagreement with owner labels. Use for evaluation work; routine drafting follows the surface writer.
license: MIT
---

# Advanced Evaluation for TLDR Astro

Evaluate a proposed change against the current writing contract. Read the
[shared evaluation workflow](../../../docs/writing/SKILL_EVALUATION_WORKFLOW.md)
and the canonical writer plus the target surface workflow before preparing a
comparison. For testing a skill revision, also use
[TLDR Astro Skill Testing](../tldr-astro-skill-testing/SKILL.md).

## Choose the evaluation

- **Contract checks:** use calculated facts, eligible source identities,
  complete-text hashes, licensed variables, output schemas and audience rules.
  Run the existing deterministic checks. A model score cannot replace them.
- **Prose preference:** compare complete drafts with the same factual and
  editorial brief. Use the owner's current surface-specific standards; compare
  meaning development, naturalness and correction burden rather than length,
  keyword frequency or generic polish.
- **Judge calibration:** compare the judge's findings with explicitly scoped
  owner labels. Withhold expected labels from the judge. Keep calibration-only
  passages and rejected prose out of positive writer retrieval.

Keep objective validity, advisory taste judgments and any existing surface
semantic-admission checks separate. Preserve the current rubric and blocking
policy unless the owner explicitly requests a change. A new rubric proposal
is a review artifact, not an active production gate.

## Run a review

1. Freeze the question, cases, rubric version and baseline before seeing new
   outputs. Preserve the exact facts, meaning sources, eligible complete voice
   passages, scoped corrections and saved profile used by each candidate.
2. Inspect both candidates' existing validation receipts. Retain invalid and
   unavailable results in the report; do not select a factually invalid draft
   as the usable winner because its voice sounds better.
3. Give reviewers complete anonymous A/B passages. Hide model, condition and
   expected owner label. Keep the identity map private. For authorized model
   pairwise review, evaluate both A/B and B/A and map each answer back to the
   original candidate identity before comparing it. An order disagreement is
   `position_inconsistent`, distinct from a genuine tie or invalid review.
4. Require findings to cite exact reader wording, its containing paragraph,
   the applicable source or rule, and the material consequence. Where a
   surface already requires a semantic receipt, retain its schema and contextual
   precision/removal/plain-language tests. Reviewer prose never becomes voice
   evidence or an instruction to rewrite automatically.
5. Report owner agreement and disagreements by surface and criterion. Count
   false acceptance, false rejection, ties, abstentions, invalid reviews and
   order inconsistency separately, with denominators. Report measured usage
   and latency; missing observations stay unknown. Self-reported confidence
   is not a calibrated probability or an approval threshold.

## Finish

Present the complete comparison and its evidence to the owner. Record preference,
calibration labels, exact prose approval and publication authorization as distinct
decisions through their existing owning workflows. Only the owner's explicit
approval of complete exact wording changes prose approval state.

Paid generation, model judging, retries and extra comparison passes require the
bounded authorization described in the shared workflow. This skill adds no
provider, production judge, automatic revision, promotion or publication stage.

Adapted from the pinned source in [UPSTREAM.json](UPSTREAM.json); the project
workflow controls execution and approval.
