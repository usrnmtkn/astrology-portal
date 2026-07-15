# Source tiers and provenance firewall

## Tiers

| Tier | Meaning | Reader eligible? |
|---|---|---:|
| `EVIDENCE_ONLY` | raw phrase bank, book extraction, screenshot, metadata, keywords | No |
| `REFERENCE_SCAFFOLD` | generic formula or combination inventory used to locate gaps | No |
| `REVIEWED_CLAUSE` | human-reviewed, source-grounded clause assigned to a specific slot | Yes |
| `REVIEWED_RECORD` | complete reviewed field set for one template/surface | Yes |
| `RENDERED_OUTPUT` | deterministic result of facts + reviewed record + template | Yes |

`READY` is permitted only for `REVIEWED_RECORD` or validated `RENDERED_OUTPUT`. A source key, normalized row, or generated record count is not sufficient.

## Primary-source rule

Use the narrowest reviewed combination source that describes the actual dynamic:

1. exact aspect pair or exact body-in-sign combination;
2. exact surface-specific integration record;
3. supporting planet, sign, house, dignity, sect, timing, or cycle records.

Supporting sources constrain or refine an assigned slot. They do not become independent sentences and are never concatenated as keyword modules.

The generic `cc/transit/*/house-*` rows in `sources/cc-source-phrases.json` are `REFERENCE_SCAFFOLD`. They may help identify a needed combination, but they are prohibited as primary reader prose.

## Instruction-source firewall

Only source IDs explicitly classified as `REVIEWED_CLAUSE` or `REVIEWED_RECORD` may feed reader fields. The following are always prohibited:

- implementation prompts;
- chat messages and feedback;
- Codex status or completion reports;
- audit, proof, and diagnostic reports;
- tests and fixture assertions;
- screenshots of TLDR Astro failures;
- UI labels and developer diagnostics;
- raw CHANI screenshots or copied CHANI prose.

Provenance must be positive-list based. Do not rely on a short banned-phrase list.

## Gap rule

When a required slot has no eligible source, return `SOURCE_GAP` with missing source family and required facts. Do not synthesize from raw keywords, generic formulas, or adjacent combinations.

