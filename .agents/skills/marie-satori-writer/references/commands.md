# Deterministic writer commands

Run from the repository root.

## Build and check the voice index

```bash
node .agents/skills/marie-satori-writer/scripts/build-voice-index.js
node .agents/skills/marie-satori-writer/scripts/build-voice-index.js --check
```

## Compile a ranked packet

```bash
node .agents/skills/marie-satori-writer/scripts/compile-writing-packet.js \
  --surface sky-placement \
  --planet saturn \
  --sign capricorn \
  --beat hook \
  --goal "replace polished abstraction with the exact cost" \
  --keywords "burnout,overtime,rest,work,achievement,indispensable,deadline,exhaustion" \
  --failure-tags "abstract_consequence,requires_interpretation,polished_but_flat" \
  --candidate-file packages/astro-knowledge/review/sky-placement-voice-pass-v6-targeted-candidates.json \
  --candidate-id sky-placement-v6-saturn-capricorn
```

The command writes an untracked JSON packet and a human-readable selection report under `packages/astro-knowledge/out/marie-satori-writer/` unless `--out-dir` is supplied.

## Run authorship audit

```bash
node .agents/skills/marie-satori-writer/scripts/audit-authorship.js \
  --candidate-file packages/astro-knowledge/review/sky-placement-voice-pass-v6-targeted-candidates.json \
  --candidate-id sky-placement-v6-saturn-capricorn \
  --out packages/astro-knowledge/out/marie-satori-writer/saturn-capricorn/authorship.json
```

Without semantic attestation, a mechanically clean article remains `authorship_review_required`. Complete the skill's sentence and article checks, rewrite failures, and provide an attestation before calling the candidate authored.

## Preview owner-feedback ingestion

```bash
node .agents/skills/marie-satori-writer/scripts/record-owner-feedback.js \
  --input /path/to/feedback.json \
  --out packages/astro-knowledge/out/marie-satori-writer/feedback-preview.json
```

Dry-run is the default. Exact approval requires both an explicit owner statement and `--confirm-exact-approval`. Governed promotion is refused.
