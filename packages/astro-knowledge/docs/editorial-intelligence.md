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
OpenAI reasoning models also use the role-specific
`OPENAI_GENERATION_REASONING_EFFORT` and `OPENAI_JUDGE_REASONING_EFFORT`
variables, with `OPENAI_REASONING_EFFORT` as a shared fallback. Registered
releases may pin `reasoningEffort`. An unpinned GPT-5.6 environment override
defaults to `none` so a model-name experiment cannot silently inherit the
family's higher default reasoning cost.
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

The current registry keeps `gpt-4.1-mini` active and stages GPT-5.6 candidates:
Terra with reasoning `none` for generation, Terra with reasoning `low` for the
routine judges, and Sol with reasoning `low` for the long-form judge. These are
experiments, not production defaults. The protected workflow currently has a
complete live calibration contract only for `judge:sky-article-longform`; the
other candidates must not be promoted until equivalent surface-specific
reports exist.

Selecting a staged generation candidate is disabled unless an admin process
sets both `EDITORIAL_MODEL_CANDIDATE_RELEASE_ID` and
`TLDR_ALLOW_LIVE_LLM_GENERATION_CALIBRATION=1`. This authorization selects a
candidate for evaluation only; it does not publish, promote, or change the
active release.

### GitHub admin setup

The workflow `.github/workflows/editorial-model-calibration.yml` is manual-only
and currently supports the first private-model surface,
`judge:sky-article-longform`.

1. Create a protected GitHub environment named `editorial-calibration`.
2. Add required human reviewers to that environment.
3. Add `EDITORIAL_OPENAI_JUDGE_API_KEY` and/or
   `EDITORIAL_ANTHROPIC_JUDGE_API_KEY` as environment secrets.
4. Keep `EDITORIAL_JUDGE_PRIVACY_MODE` unset or set it to `redact` as an
   environment variable. Unredacted mode requires the separate provider
   approval variable and should remain exceptional.
5. Stage the candidate release in the registry through a reviewed branch.
6. Dispatch **Editorial model candidate calibration** against that commit.
7. Download and inspect the redacted report artifact.
8. If accepted, promote locally or in a separate protected admin job, commit
   the registry change, and merge it through normal review.

The workflow itself has `contents: read`; it cannot alter the registry or
publish content. The calibration report contract is
[`config/editorial-calibration-report.schema.json`](../config/editorial-calibration-report.schema.json).

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

The candidate-aware runner used by the protected workflow is:

```sh
TLDR_ALLOW_LIVE_LLM_JUDGE=1 \
TLDR_ALLOW_LIVE_LLM_CALIBRATION=1 \
npm run calibrate:candidate:live -- \
  --lane judge:sky-article-longform \
  --out out/editorial-calibration/report.json
```

It refuses to run when the lane has no staged candidate. During calibration,
each judge audit identifies `registryState: candidate` and the candidate
release ID. Candidate selection is rejected outside an explicitly authorized
calibration process.

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
