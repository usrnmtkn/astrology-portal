# Sky Placement judge: Terra-low vs Sol-xhigh

Status: unpromoted candidate evaluation. This experiment does not alter runtime selection or governed content rows.

## What is being compared

The active Sky Placement runtime judge remains `gpt-4.1-mini`. For this evaluation only:

- Baseline comparator: `gpt-5.6-terra`, reasoning effort `low`.
- Quality-first candidate: `gpt-5.6-sol`, reasoning effort `xhigh`.

Terra-low is called the baseline because it is the lower-cost evaluation comparator previously proposed for this lane. It is not being represented as the active production model.

Both treatments receive the same frozen draft, system instructions, owner vocabulary palette, approved examples, output schema, and review rubric. The paired request prompt is byte-identical. The treatment differs only in model and reasoning effort.

## Frozen evaluation set

Version: `sky-placement-approved-weak-v3`.

The set contains seven owner-approved examples and seven known-weak controls. The controls include literal-English failures, unsupported Chiron-in-Taurus employment framing, generic copy, flat inventories, and metaphor-heavy endings. One sample per treatment per fixture produces 28 billed API calls.

This first run is directional, not promotion-grade. Repository promotion policy requires at least five samples per fixture, a passing calibration report, and explicit owner authorization.

## What the owner scores

The owner reviews anonymous Review A and Review B on:

1. Natural English.
2. Astrological scope.
3. Owner voice.
4. Editorial restraint.
5. Rule enforcement.
6. Unnecessary rewrites and false positives.

Owner acceptance is the primary result. Automatic approved/weak separation, misses, false positives, latency, tokens, and estimated cost are supporting evidence. Detail, length, and confidence are not treated as quality.

The model key is written separately and should remain sealed until scoring is complete.

## Explicit exclusions

Pro mode is a separate experiment and is not combined with Sol-xhigh. The local registry supports `max` reasoning effort, but max is not included in this first comparison. These exclusions prevent a confounded result.

## Cost accounting

The runner records input, cached-input, cache-write, output, and reasoning tokens when returned by the API. Reasoning tokens are included within billed output tokens. Cost uses the OpenAI prices retrieved on 2026-08-02 from <https://developers.openai.com/api/docs/pricing> and switches to the documented long-context rates when an input exceeds 272,000 tokens.

## Commands

Inspect the no-call plan:

```sh
npm run plan:sky-placement-judge-ab
```

Run the authorized evaluation:

```sh
TLDR_ALLOW_LIVE_LLM_JUDGE=1 \
TLDR_ALLOW_LIVE_LLM_CALIBRATION=1 \
npm run evaluate:sky-placement-judge-ab:live
```

The untracked output directory contains:

- `blind-owner-review.md`: the anonymous review packet.
- `blind-owner-scorecard.json`: empty owner-scoring fields.
- `internal-results.json`: automatic metrics, usage, latency, and raw outputs.
- `model-key.json`: the sealed A/B identity key.

No result from this experiment promotes a model automatically. Promotion requires materially better blinded owner acceptance, more substantive failures caught without additional false positives or unnecessary rewrites, acceptable operational cost, a separate promotion-grade calibration, and explicit owner approval.

## Initial run

The first blinded run completed on 2026-08-02:

- 14 frozen fixtures.
- 28 successful paired API calls.
- Byte-identical prompts within every pair.
- Combined estimated API cost: `$0.4062`.
- Owner review status: pending.
- Promotion eligibility: false.

The anonymous owner packet is in the untracked evaluation output directory. The model key remains separate until owner scoring is complete.
