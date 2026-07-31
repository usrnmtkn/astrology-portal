# TLDR Astro private writing model

This directory contains the private-model pipeline for TLDR Astro editorial copy. The first adapter targets one surface only: `sky-article-longform`.

The model is a writer, not an astrology engine. It must never calculate a placement, infer an ingress, choose a house, or invent a date. The application computes astronomy first and supplies a structured fact payload. The model may only turn that payload into prose.

## Architecture

```text
ephemeris and deterministic resolvers
  -> structured fact payload
  -> private gpt-oss-20b LoRA adapter
  -> mechanical content lint
  -> independent voice and factual-provenance evals
  -> human review
  -> approved content row
  -> reader app
```

The model never writes directly to the reader application or the approved content package.

The independent editorial judge is configured, authorized, and audited through
[`docs/editorial-intelligence.md`](../docs/editorial-intelligence.md). A judge
score is advisory and cannot publish a generated draft by itself.

Humans and coding agents should also read the
[Editorial AI system README](../docs/editorial-ai/README.md) before changing a
model, prompt, rubric, calibration set, or publication rule.

## Why an adapter

The recommended first model is a LoRA adapter over `openai/gpt-oss-20b`. This avoids training a foundation model from scratch, keeps the trainable artifact small, and permits inference on infrastructure controlled by TLDR Astro. Base weights and adapter checkpoints must stay in private storage.

The included training script follows the OpenAI gpt-oss Transformers recipe. It defaults to local-only output and never pushes a model or dataset to a public hub.

## Dataset policy

Only owner-authored, owner-approved material may enter training.

- No scraped Co-Star, CHANI, social, book, or third-party copy.
- No `needs_review` rows.
- No profile records, handles, birth data, chart data, or other personal information.
- Calibration fixtures remain evaluation references unless they receive a paired structured fact brief.
- Train and evaluation examples are separated by exact content hash.
- Every date, year, and degree in a target must also appear in its input fact payload.
- Ephemeris-derived facts remain source data. They are not learned constants.

The exporter currently reads approved authored cards from `sky-article-v1.json`. Those cards already separate their approved modules and validated key dates. Generated JSONL stays under `.local-data/`, which is ignored by Git.

## Readiness gate

Training is blocked until there are at least 50 approved training examples plus a distinct evaluation split. This is a floor, not a target. A useful first run should normally have 75 to 100 diverse examples across planets, signs, and edition types.

The current corpus is intentionally expected to fail the readiness gate. Use `--allow-insufficient` only to verify format and provenance while the corpus is being built.

## Local dataset workflow

```bash
cd packages/astro-knowledge
npm run private-model:export
npm run private-model:validate -- --allow-insufficient
```

The exporter writes:

- `.local-data/sky-article-longform.train.jsonl`
- `.local-data/sky-article-longform.eval.jsonl`
- `.local-data/sky-article-longform.manifest.json`

When the corpus reaches the readiness floor, run the validator without `--allow-insufficient`.

## Private GPU training

The reference recipe is designed for a Linux CUDA host. OpenAI's cookbook example uses one H100 with 80 GB of memory. Smaller GPUs may require shorter sequences, smaller batches, or a different quantization strategy.

```bash
cd packages/astro-knowledge/private-model
python -m venv .venv
source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cu128
pip install -r training/requirements.txt
python training/train_lora.py --config configs/gpt-oss-20b-lora.json
```

Before a paid run:

1. Provision a private GPU instance and encrypted persistent volume.
2. Copy only the generated train/eval JSONL and this training directory.
3. Disable public artifact uploads and telemetry not covered by the privacy agreement.
4. Record the base-model revision, dataset manifest hash, config, and evaluation results.
5. Download the adapter checkpoint to private storage, then delete the remote volume.

## Release rule

A checkpoint is not production-ready merely because training completed. It must beat the unfine-tuned base model on the held-out set without increasing factual additions, duplicated copy, stale dates, or voice failures. The existing long-form judge should be one signal, not the sole evaluator, and the generator and judge must not be calibrated on the same exact examples.
