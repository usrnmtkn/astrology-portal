# Sky Placement writer reset - August 3, 2026

## Result

The Sky Placement writer now has an unpromoted `gpt-5.6-sol` / `xhigh` candidate lane and a minimal first-call packet. No writer release is active. The existing `gpt-5.6-terra` / `low` Sky Placement judge remains unchanged and continues to serve only as the final acceptability judge.

No article wording, approval state, governed content row, active model, or judge routing was changed by this reset. No model call or billed evaluation was made.

## Current packet audit

The superseded compiler is preserved at `.agents/skills/marie-satori-writer/scripts/compile-writing-packet-legacy-audit.js`. Its compiled packet exposed positive examples, contrastive edits, negative examples, the current AI candidate, failure tags, selection explanations, candidate-language ranking, and governance metadata before drafting.

The replacement `sky-placement-writer-packet-v2:owner-six-minimal` contains only:

- requested routing metadata needed for a fail-closed artifact;
- verified astrology;
- surface requirements;
- the exact task;
- exactly six exact owner-authored passages;
- the concise writer prompt.

The original text being revised may occur only in `task.inputText`. V7, V8, and V9 remain unchanged and are explicitly barred from positive voice evidence, structural-template evidence, and initial writer retrieval by `retrieval-exclusions.json`.

## Writer lane

```json
{
  "laneId": "writer:sky-placement",
  "role": "writer",
  "surface": "sky-placement",
  "active": null,
  "candidate": {
    "releaseId": "sky-placement-writer-openai-gpt-5.6-sol-candidate-v1",
    "model": "gpt-5.6-sol",
    "reasoningEffort": "xhigh",
    "promptVersion": "sky-placement-writer-v2:owner-six-minimal"
  }
}
```

This lane is writing and rewriting only. It has no live-call authority and no promotion authority.

## Fail-closed routing

Every accepted writer artifact must record requested and actual model, requested and actual reasoning effort, lane ID, prompt version, packet version, the six retrieved owner-source IDs, and routing match status. A missing or mismatched lane, model, reasoning effort, prompt version, or packet version rejects the artifact.

## Exact writer prompt

The exact versioned prompt is stored in `packages/astro-knowledge/config/sky-placement-writer-prompt-v2.json`. Current Sky appends only the collective-language sentence specified by the owner.

## Rejected sample and corrected full-article query

The first locally compiled sample is preserved at `packages/astro-knowledge/review/sky-placement-writer-rejected-sample-v2/` only as a failed-retrieval audit. Its model input was renamed `rejected-model-input-audit.md` and must not be sent to a writer.

The corrected full-article request uses `requestedBeat: full_article` and `emphasisBeat: turn`. Its deterministic result is `packages/astro-knowledge/review/sky-placement-writer-full-article-evidence-shortfall-v3/`. No packet or model input was produced because the corpus has zero eligible complete or near-complete owner-authored collective Current Sky structural examples, against a requirement of two, and the verified Jupiter-in-Libra sources do not establish concrete costs or a central lived scenario.

Every one of the original six passages is audited in the rejection report. No unrelated substitutes were selected merely to reach six.

## Held-out fixture inventory

The 12 existing contrastive records yield 6 valid held-out fixtures and an exact shortfall of 14 from the required 20. Six records are ineligible because exact owner authorship is unproven, the context is insufficient, or the evidence is calibration-only. The detailed inventory is stored in `packages/astro-knowledge/review/sky-placement-writer-heldout-fixture-audit-v1.md` and its JSON companion.

No fixtures were fabricated. No billed evaluation was run.

## Instruction-loading audit

The repository `AGENTS.md` is 3,288 bytes and the user-level Codex `AGENTS.md` is empty. The combined instruction file is below Codex's default project-instruction limit. The excessive prewriting context came from the old compiled packet and writer workflow, not from truncation of `AGENTS.md`.

## Verification

- Complete-article evidence shortfalls fail closed before model-input creation.
- A complete-article task mislabeled as a single beat is rejected.
- Beat-only packet constraints still pass for genuinely beat-only work.
- V7/V8/V9 retrieval exclusions pass.
- Exact writer prompt and Current Sky appendix pass.
- Matching Sol-xhigh routing produces a complete artifact record.
- Wrong model, reasoning effort, or lane fails closed.
- Registry validation passes with an inactive writer candidate lane.
- Existing placement pipeline and package validation remain part of the final local test run.

## Deliberate non-actions

- No Sky Placement copy was generated or rewritten.
- No active model changed.
- No judge configuration changed.
- No content or approval status changed.
- No governed content row changed.
- No commit was created.
- No billed or network model call was made.
