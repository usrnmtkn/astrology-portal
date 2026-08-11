# Knowledge matrix v9: owner approval and canonical ingestion

Date: 2026-08-09  
Status: held at the review wall  
Change control: any content change becomes v10 and returns to the owner for approval

## Owner instruction

> Owner instruction: the governance-labeled matrix is approved as the new canonical. File: TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx, SHA-256 d78569b194d132b921a71d061055e6b484ecae8877c6ae4c7b82d08538023b22. Verify the fingerprint, verify Copy and Experience columns byte-identical to the approved v9 (they are; digests recorded), land it as the canonical workbook in tldr-astro-phrasebank/ (superseding the v8 filename), update all harness and manifest references, and treat the Governance column as the authority layer with Judge fields as historical lineage, per the GovernanceLegend sheet. All 3,485 owner-approved rows are eligible evidence for retrieval and serving per existing render rules. Report verification and stop at the review wall.

## Canonical artifact

- Path: `tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx`
- SHA-256: `d78569b194d132b921a71d061055e6b484ecae8877c6ae4c7b82d08538023b22`
- Sheets: 11
- TransitMeanings rows: 1,117
- HouseActivations rows: 2,368
- Total governed rows: 3,485
- Governance=`owner-approved`: 3,485

## Byte-identity verification

The canonical workbook was compared cell-for-cell with the approved v9 workbook. The same comparison was also run against the approved v8 workbook because v9 preserves its Copy and Experience text.

| Column | Rows | Digest method | SHA-256 | Result |
| --- | ---: | --- | --- | --- |
| `TransitMeanings.Copy` | 1,117 | `sha256(JSON.stringify(cell-values))` | `7f4e8c3c19c04d43c1e296bdfee3dc2e6131e2c73972fdaba911cd70edb8800d` | byte-identical |
| `HouseActivations.Experience` | 2,368 | `sha256(JSON.stringify(cell-values))` | `f63144974cd05afcbca12f2eef83f665c1a50c3233e2d7cff41de9c05124e532` | byte-identical |
| Combined Copy + Experience | 3,485 | `sha256(JSON.stringify({ transit, houses }))` | `45701b493cf7004ba9e5438c6a6db9293b8c02b9420e3a4ffddffe1fe191d425` | byte-identical |

The generated canonical row export is `knowledge-matrix-v9-owner-approved-rows.json`, SHA-256 `5907cbdbc6e015c4d0a68ce54f24506fe7e8eff51fbdf4b83485e492032e9a4c`. Copy and Experience values are not cleaned, reflowed, or rewritten.

## Authority and lineage

The `GovernanceLegend` sheet controls current authority:

- `Governance` is the current authority layer.
- All 3,485 rows are `owner-approved`.
- `Judge` is retained on every row as historical editing and review lineage.
- Judge values do not grant, remove, or rank current authority.
- Approval does not imply authorship.

The writer index ingests all 3,485 governed rows. The 12 rows carrying the existing `[EXCLUDE FROM FALLBACK]` marker remain present for governance traceability but are not quotable voice/context evidence and do not serve. The other 3,473 rows are positive and contextual retrieval evidence. Runtime also excludes three additional rows whose reusable house key is incomplete, for 15 serving exclusions total.

### Two-lineage runtime boundary

Owner ruling, 2026-08-11: CC V9 and LL V13 are separate canonical lineages and coexist.

- CC V9 is canonical for transit meanings, house activations, and their voiced collective or personal timing copy.
- LL V13 is canonical for the LL natal matrix: exact natal placements, natal aspects, and its explicitly mapped natal workbook keys.
- LL V13 does not supersede, replace, or authorize edits to CC V9. CC V9 does not supply natal copy governed by LL V13.
- A missing exact key fails closed inside its owning lineage. The runtime must not borrow from the other lineage merely because both are loaded.

The active implementations preserve this boundary: `knowledgeMatrixV9Runtime.ts` exposes transit and house lookups, while `knowledgeMatrixV13Runtime.ts` exposes natal placement, natal aspect, and V13 workbook-key lookups.

## Runtime behavior

Existing fail-closed render rules remain in force:

- Transit lookup key: Planet + Sign + Event.
- House lookup key: Rising sign + Planet + Transit sign + House + Event.
- Different events never borrow from one another.
- Rows with `[EXCLUDE FROM FALLBACK]` or without a reusable Planet + Transit sign + House key do not serve.
- Uncovered keys render nothing.
- When multiple owner-approved rows share a runtime key, the first eligible row in canonical workbook order serves byte-identically. Judge is not used to rank it.

Verified runtime inventory:

- 1,117 eligible transit rows / 365 runtime keys.
- 2,353 eligible house rows / 954 primary keys / 1,017 event runtime keys.
- 15 excluded house rows.
- 0 build warnings.

## Supersession and future changes

The v9 workbook and v9 package supersede the active CC v8 workbook/package references. They do not supersede the separate LL V13 natal lineage. Historical CC v8 review records remain as provenance only. The canonical v9 workbook is immutable. Any proposed change is a v10 candidate, is not owner-approved by inheritance, and must return to the owner for explicit approval before replacing v9.
