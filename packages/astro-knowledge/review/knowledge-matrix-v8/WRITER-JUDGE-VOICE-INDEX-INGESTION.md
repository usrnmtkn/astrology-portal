# Knowledge matrix v8 ingestion into the writer/judge voice index

Date: 2026-08-09

Owner instruction: the v8 owner-approved locked knowledge matrix is additional evidence for the judge and writer on Sky Placements and horoscopes.

## What was ingested

- Package: `tldr-astro-knowledge-matrix-v8-owner-approved-ingestion-ready.zip`, placed at `packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/knowledge-matrix-v8/`.
- Included files: transit meanings, house activations, import manifest, and build report.
- Copy is preserved exactly under the manifest rule `rewrite_or_clean_copy: false`.
- Pre-ingestion validation: 318 transit keys, 936 house keys, 993 house event entries, zero em dashes, zero instances of `whether`, and zero manifest-banned vocabulary (`profound`, `medicine`, `inner weather`, `landscape`, `tapestry`).

## Wiring

`build-voice-index.js` loads 1,311 entries:

- 318 transit meanings;
- 993 nested house events.

Every matrix entry records:

- `authorityClass: exact_owner_approved`;
- `ownerApproved: true`;
- `origin: owner-approved-knowledge-matrix-v8`;
- `editorialStatus: owner-approved-v8-locked`;
- positive voice evidence and contextual evidence;
- `surface: sky-placement`;
- planet, sign, and house metadata when available.

`Black Moon Lilith` normalizes to `lilith` for retrieval. The literal matrix sign `Any` becomes an unscoped sign in the writer index. Rows beginning `[EXCLUDE FROM FALLBACK]` are not indexed.

The provenance attached to every entry states that voice-index inclusion grants judge/writer evidence only. Runtime serving remains independently governed by the package manifest, exact runtime resolver, and owner serving record in this directory.

## Verification

- Voice index: 3,909 to 5,220 entries.
- Positive evidence: 3,424 to 4,735 entries.
- `sky-placement` surface: 331 to 1,642 entries.
- `check:marie-writer-index`: current.
- `test:marie-writer`: passed.
- `test:owner-article-corpus`: passed.
