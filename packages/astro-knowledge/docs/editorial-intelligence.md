# Private editorial intelligence

For a plain-language explanation of the full architecture and rules for both
humans and coding agents, start with the
[Editorial AI system README](editorial-ai/README.md).

The editorial judge is a private advisory system. It scores generated content,
records why and how the score was produced, and routes uncertain work to an
editor. A model verdict never publishes content by itself.

## Model separation

Generation and judging have separate configuration. Existing generation
variables remain supported.

| Purpose | Provider | OpenAI model/key | Anthropic model/key |
| --- | --- | --- | --- |
| Generation | `CONTENT_GENERATION_PROVIDER` | `OPENAI_GENERATION_MODEL`, `OPENAI_API_KEY` | `ANTHROPIC_GENERATION_MODEL`, `ANTHROPIC_API_KEY` |
| Judging | `CONTENT_JUDGE_PROVIDER` | `OPENAI_JUDGE_MODEL`, `OPENAI_JUDGE_API_KEY` | `ANTHROPIC_JUDGE_MODEL`, `ANTHROPIC_JUDGE_API_KEY` |

The older `OPENAI_MODEL` and `ANTHROPIC_MODEL` variables remain fallbacks.
When these variables override a registered release, the audit record sets
`registryOverride: true`; the experiment is not silently treated as promoted.

## Model registry and promotion

Active runtime defaults come from
[`config/editorial-model-registry.json`](../config/editorial-model-registry.json).
The registry keeps separate lanes by role and editorial surface. Each lane has
one active release and optional candidate and rollback releases.

```sh
npm run model-registry:validate
npm run model-registry:status
npm run test:model-registry
```

Staging a candidate never changes the active release. Promotion requires a
passing calibration report that identifies the staged release, meets the
minimum approved-versus-weak separation, and contains no disagreement:

```sh
node scripts/manage-editorial-model-registry.js stage \
  --lane judge:sky-article-longform \
  --release-file /approved/admin/candidate-release.json

TLDR_ALLOW_MODEL_PROMOTION=1 \
node scripts/manage-editorial-model-registry.js promote \
  --lane judge:sky-article-longform \
  --calibration-report /approved/admin/calibration-report.json \
  --approved-by editor@example
```

Promotion moves the prior active release to the rollback slot and records the
approver plus a SHA-256 of the calibration report. Rollback is also an explicit
human-authorized action and uses the same environment gate.

## Authorization and privacy

Live judging is disabled unless the CI or admin process explicitly sets:

```sh
TLDR_ALLOW_LIVE_LLM_JUDGE=1
```

Live calibration additionally requires:

```sh
TLDR_ALLOW_LIVE_LLM_CALIBRATION=1
```

`EDITORIAL_JUDGE_PRIVACY_MODE=redact` is the default. It redacts common email,
phone, and social-handle patterns before sending a prompt. To send unredacted
text through a provider configuration that has been reviewed and approved, set
both:

```sh
EDITORIAL_JUDGE_PRIVACY_MODE=approved-provider
EDITORIAL_JUDGE_PROVIDER_APPROVED=1
```

Do not put either approval variable in client-side configuration.

## Calibration

The ordinary test verifies fixture integrity and makes no network calls:

```sh
npm run test:article-judge-calibration
```

An authorized CI/admin job may run the live calibration:

```sh
TLDR_ALLOW_LIVE_LLM_JUDGE=1 \
TLDR_ALLOW_LIVE_LLM_CALIBRATION=1 \
npm run calibrate:article-judge:live
```

The same authorization applies to the other private live calibration jobs:

```sh
npm run calibrate:sky-judge:live
npm run calibrate:placement-card-judge:live
npm run calibrate:placement-article-judge:live
```

The calibration compares byte-verified owner-approved examples with
intentionally weak controls. Approved examples must average at least one full
score point above the controls. Any disagreement among repeated samples routes
the calibration to human review.

## Audit record

Each live verdict appends a local JSONL audit record under
`out/editorial-judge-audit/`. Records include the model/provider, temperature,
registry release/lane/version, evaluation-set version, policy version, override
status, prompt version and SHA-256, rubric version and SHA-256, content SHA-256,
sample scores and verdict labels, privacy mode, redaction count, and
disagreement status. Raw prompts, raw model outputs, and proprietary content
are deliberately excluded from the audit log; their hashes provide
traceability.

## Publication policy

- LLM score 3: human review, recommendation to approve.
- LLM score 2: human review, recommendation to revise.
- LLM score 1: regenerate.
- Split sample scores or verdicts: human review.
- Exact byte match to a separately approved canonical fixture may publish
  without an LLM call because the approval source is the human-approved asset,
  not a model verdict.
