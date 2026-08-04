# Deterministic writer commands

Run from the repository root.

## Build and check the voice index

```bash
node .agents/skills/marie-satori-writer/scripts/build-voice-index.js
node .agents/skills/marie-satori-writer/scripts/build-voice-index.js --check
```

## Compile the minimal affinity packet

```bash
node .agents/skills/marie-satori-writer/scripts/compile-writing-packet.js \
  --planet jupiter \
  --sign libra \
  --requested-beat full_article \
  --emphasis-beat turn \
  --task "Write one complete Current Sky Sky Placement article for Jupiter in Libra, with particular attention to the turn." \
  --out packages/astro-knowledge/review/sky-placement-writer-jupiter-libra-controlled-v1
```

The command writes `packet.json` and the exact first-call `model-input.md`. It does not require an exact-placement owner article or a prewritten scenario, and it does not call a model.

The superseded compiler is preserved as `compile-writing-packet-legacy-audit.js` for packet-exposure review only. Do not use it for writing.

The active full-article packet targets `sky-placement-continuous-v2`: `opening`, `tension`, `development`, `close`, and `try_this`. Headline, fact line, dates, and approved aspect inserts remain engine-owned.

## Plan or run one continuous fallback candidate

Build the calculation-owned facts first. The command locates the requested
transit with Swiss Ephemeris, renders dates in the supplied zone (or the
machine's local zone), and joins event meanings from astro-knowledge. It does
not call a model or serve content.

```bash
npm run build:sky-placement-engine-facts -- \
  --planet jupiter \
  --sign libra \
  --time-zone America/New_York \
  --out /tmp/jupiter-libra-engine-facts.json
```

```bash
npm run plan:sky-placement-writer -w @tldr/astro-knowledge -- \
  --planet jupiter \
  --sign libra \
  --engine-facts /tmp/jupiter-libra-engine-facts.json
```

This writes the exact packet and model input without making a billed call. It fails closed when placement facts are draft, missing, or incomplete.

After explicit owner authorization only:

```bash
npm run write:sky-placement:live -w @tldr/astro-knowledge -- --planet jupiter --sign capricorn
```

The live command makes one Sol-xhigh writing call and one Terra-low review call. It emits one `sky-placement-continuous-v2` row with `review_status: needs_review` and `render_eligible: false`; it never imports or promotes the row.

## Audit fallback coverage

```bash
npm run audit:sky-placement-fallback-readiness -w @tldr/astro-knowledge
```

## Audit held-out fixtures

```bash
node packages/astro-knowledge/scripts/audit-sky-placement-writer-fixtures.js
```

This is deterministic. It does not fabricate fixtures or call a model.

## Compile an aspect warmth packet

```bash
node packages/astro-knowledge/scripts/build-aspect-writing-packet.js \
  --surface natal-aspect \
  --format full-card \
  --id jupiter-ascendant-hard \
  --human-moment "Encouragement feels generous until support becomes pressure."
```

Full-card matches compile with `harvest_mode: matched`. Use `--format tldr-line` for a vocabulary-only packet. The command exits with status 2 and an editorial flag only when the human-moment beat is missing. A corpus miss compiles with `harvest_mode: none_found` and a non-blocking flag.

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
