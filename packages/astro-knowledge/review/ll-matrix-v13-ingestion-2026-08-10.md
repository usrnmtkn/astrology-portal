# LL Knowledge Matrix V13: canonical approval and runtime-ingestion record

Date: 2026-08-10

Runtime release: `ll-matrix-v13-owner-approved-runtime`

## Owner ruling

The workbook `tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx` is the canonical LL matrix. Its 195-row `ClarityStrictV13` pass is owner-approved. The Gemini clarity-first V12-to-V13 script path is discarded and must not run because it would blind-edit row-approved copy. This ruling is also recorded in the workbook's `GovernanceLegend` sheet under `V13_CANONICAL_LINEAGE_OWNER_DECISION_2026_08_10`.

## Serving boundary

- Workbook content rows: 1,014.
- Exact owner-approved runtime rows: 301.
- Excluded unapproved rows: 713.
- Approved rows by sheet: 113 PlacementMeanings, 165 AspectMeanings, 23 NodesPhasesFortune.
- Governance labels: 194 owner-approved-v13-direct-language, 106 owner-lived-experience-ll-v9-owner-approved, 1 owner-approved-clarity-fix-ll-v12.

The locked JSON at `packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json` contains the exact approved copy, runtime destination, payload hash, and workbook sheet/row/cell provenance for every serving row. No unapproved row enters the locked file or serving lane.

## Voice-index companion

- The current committed `build-voice-index.js` includes the governed `llMatrixV13Entries()` loader alongside `knowledgeMatrixV9Entries()`. The V8 package retained with this record is a provenance archive and is not the active loader.
- The V13 loader indexes only the same 301 owner-approved rows: 136 natal-placement entries and 165 natal-aspect entries, with origin `owner-approved-ll-matrix-v13` and exact-owner-approval metadata.
- The checked-in current-main voice index contains 7,695 total entries and 7,198 positive-evidence entries. Reconciliation preserved that committed V9+V13 index; it did not replace it with the dirty main worktree's stale 5,521-entry V8 build.
- Voice-index inclusion is evidence for the existing writer/judge environment only. It does not authorize automatic publication, serving outside the explicit runtime mapping, or any further writer promotion.

## Change control

The runtime selects the V13 exact-key row ahead of earlier LL copy while preserving all earlier approved source rows byte-for-byte. A missing V13 key does not borrow another row. Any future wording change requires a new owner-approved workbook lineage and regenerated hashes; the discarded Gemini blind-edit path is not an authorized build step.

## Fingerprints

- Canonical workbook SHA-256: `937549e74eb8e68f8c7e884db6789aeaa79368e53dba5b6ef1c4be697dddb41c`
- Raw full export SHA-256: `a85593bdfb90b136054768bfa9c3c4dbaabe5aee103f2ba371f2d42161c1cd03`
- Locked owner-approved JSON SHA-256: `9ca15c189f5ba7622e1376e4b6a1c67e0f131db5b0d6badcfee452341850aeb9`
- Existing approved rows before V13 SHA-256: `2a3582a520163bfebad1b2f74f0fff2beade8ef987e184f6d8af52ff8ab721e0`
