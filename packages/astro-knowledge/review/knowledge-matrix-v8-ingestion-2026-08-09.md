# Knowledge matrix v8 ingestion into the writer/judge voice index

Date: 2026-08-09. Owner instruction: the v8 owner-approved locked knowledge matrix is additional evidence for the judge and writer on sky placements and horoscopes.

## What was ingested

- Package: `tldr-astro-knowledge-matrix-v8-owner-approved-ingestion-ready.zip`, placed at `packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/knowledge-matrix-v8/` (transit meanings, house activations, import manifest, build report; copy preserved exactly per manifest `rewrite_or_clean_copy: false`).
- Pre-ingestion validation against the package's own manifest: 318 transit keys, 936 house keys, 993 house event entries; 0 em dashes, 0 "whether", 0 banned vocabulary (profound, medicine, inner weather, landscape, tapestry).

## Wiring

- `build-voice-index.js`: new `knowledgeMatrixV8Entries()` loader. 1,311 entries added (318 transit + 993 house events), each: `authorityClass: exact_owner_approved`, `ownerApproved: true`, `origin: owner-approved-knowledge-matrix-v8`, `editorialStatus: owner-approved-v8-locked`, positive voice evidence AND contextual evidence, surface `sky-placement` with planet/sign/house metadata for retrieval ("Black Moon Lilith" normalized to `lilith`, "Any" sign to unscoped). Rows beginning `[EXCLUDE FROM FALLBACK]` are skipped.
- Provenance on every entry states that inclusion grants judge/writer evidence only; runtime serving promotion remains a separate governed step, per the manifest's precedence rules (`owner-approved-v8-locked` over `rewritten-owner-voice-audited-v5`).

## Verification

- Voice index rebuilt: 3,909 → 5,220 entries; positive evidence 3,424 → 4,735; `sky-placement` surface 331 → 1,642.
- `check:marie-writer-index`: current. `test:marie-writer`: PASS (governed retrieval, authorship gate, writer/judge separation). `test:owner-article-corpus`: PASS.

## Not done here

- Runtime ingestion of the v8 rows into the app's fallback/serving stores (the manifest's runtime keys and exclusion rules describe that path; it is a separate change under the serving-content merge queue).
- No commit was made.
