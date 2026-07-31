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
prompt version and SHA-256, rubric version and SHA-256, content SHA-256, sample
scores and verdict labels, privacy mode, redaction count, and disagreement
status. Raw prompts, raw model outputs, and proprietary content are deliberately
excluded from the audit log; their hashes provide traceability.

## Publication policy

- LLM score 3: human review, recommendation to approve.
- LLM score 2: human review, recommendation to revise.
- LLM score 1: regenerate.
- Split sample scores or verdicts: human review.
- Exact byte match to a separately approved canonical fixture may publish
  without an LLM call because the approval source is the human-approved asset,
  not a model verdict.
