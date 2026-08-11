# Knowledge matrix v9 governance delta

Status: owner-approved Phase 0 ingestion record  
Recorded: 2026-08-10

## Owner ruling

The governance-labeled workbook is the approved source for this one-time delta ingestion. Its `Governance` column is the current authority layer; `Judge` remains historical lineage. Total: 3,485 owner-approved rows.

- Workbook: `TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx`
- Workbook SHA-256: `d78569b194d132b921a71d061055e6b484ecae8877c6ae4c7b82d08538023b22`
- Transit Copy digest: `478dd230db2eb2268d8e71e0e428a8fa03d3e5a77658872b9a71ecf802496d67`
- House Experience digest: `b6a5d42f4a16eac69fb2db89ef4a7cc2a718e9e1423ffa4c55b1654b7d6c4e98`
- Digest algorithm: SHA-256 over the UTF-8 cell values concatenated in workbook row order.

## Phase 0 delta

The ingestion adds 1,033 workbook rows without changing an existing v8 package byte:

- TransitMeanings: 609 rows: AC 307, ML rewritten-source-safe 171, CC Lilith fact-boundary 2, OWN composed 129.
- HouseActivations: 424 rows: AC 83, ML rewritten-source-safe 341.

All Copy and Experience fields were extracted without reflow, cleanup, relinting, or revision. Every added row preserves `Archive`, `Governance`, and `Judge` independently.

At runtime, an existing v8 winner remains authoritative for a colliding key. The delta fills only keys v8 does not cover. Equal-governance delta candidates retain workbook source order, matching the existing first-candidate tie behavior. This adds 47 transit keys and 24 house-event keys while leaving all existing v8 renders unchanged.

The workbook is not a continuing import path. Future corrections follow the governed repo process and regenerate the inventory/export from canonical repo content.
