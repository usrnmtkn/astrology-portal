# Canonical content inventory and export

The repository is the canonical content system. `content-inventory-v1.json` resolves every serving runtime address to its source, governance, provenance, approval record, exact-wording hash, and astrology dimensions.

`content-export-v1.jsonl` is the deterministic artifact of record. Its fingerprint is SHA-256 over sorted content keys, exact wording objects, and governance statuses. `content-export-v1.xlsx` is generated from that JSONL for human review; it is never an authoring source and is never imported into production.

Build and verify the text artifacts:

```bash
node scripts/build-content-inventory.mjs
node scripts/build-content-export.mjs
node scripts/test-content-inventory-export.mjs
```

The XLSX renderer requires the Codex workspace `@oai/artifact-tool` module. Set `ARTIFACT_TOOL_MODULE` to the absolute `dist/artifact_tool.mjs` path returned by the workspace-dependency loader, then run:

```bash
node scripts/build-content-export-workbook.mjs
```

Corrections always follow the governed flow: owner ruling, canonical repository change, approval record, regenerated inventory/export. Editing the workbook has no production effect.
